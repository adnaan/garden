/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { extend, keyBy, set, toPairs } from "lodash"
import { DeployServiceParams, PushModuleParams, DeleteServiceParams } from "../../../types/plugin/params"
import { RuntimeContext, Service, ServiceStatus } from "../../../types/service"
import { ContainerModule, ContainerService } from "../../container/config"
import { createIngresses } from "./ingress"
import { createServices } from "./service"
import { waitForResources } from "../status"
import { applyMany, deleteObjectsByLabel } from "../kubectl"
import { getAppNamespace } from "../namespace"
import { PluginContext } from "../../../plugin-context"
import { GARDEN_ANNOTATION_KEYS_VERSION } from "../../../constants"
import { KubeApi } from "../api"
import { KubernetesProvider } from "../kubernetes"
import { configureHotReload } from "../hot-reload"
import { KubernetesResource, KubeEnvVar } from "../types"
import { ConfigurationError } from "../../../exceptions"
import { getContainerServiceStatus } from "./status"
import { containerHelpers } from "../../container/helpers"

export const DEFAULT_CPU_REQUEST = "10m"
export const DEFAULT_CPU_LIMIT = "500m"
export const DEFAULT_MEMORY_REQUEST = "128Mi"
export const DEFAULT_MEMORY_LIMIT = "512Mi"

export async function deployContainerService(params: DeployServiceParams<ContainerModule>): Promise<ServiceStatus> {
  const { ctx, service, runtimeContext, force, log, hotReload } = params

  const namespace = await getAppNamespace(ctx, ctx.provider)
  const objects = await createContainerObjects(ctx, service, runtimeContext, hotReload)

  // TODO: use Helm instead of kubectl apply
  const pruneSelector = "service=" + service.name
  await applyMany(ctx.provider.config.context, objects, { force, namespace, pruneSelector })
  await waitForResources({ ctx, provider: ctx.provider, serviceName: service.name, resources: objects, log })

  return getContainerServiceStatus(params)
}

export async function createContainerObjects(
  ctx: PluginContext,
  service: ContainerService,
  runtimeContext: RuntimeContext,
  enableHotReload: boolean,
) {
  const version = service.module.version
  const namespace = await getAppNamespace(ctx, ctx.provider)
  const api = new KubeApi(ctx.provider)
  const ingresses = await createIngresses(api, namespace, service)
  const deployment = await createDeployment(ctx.provider, service, runtimeContext, namespace, enableHotReload)
  const kubeservices = await createServices(service, namespace)

  const objects = [deployment, ...kubeservices, ...ingresses]

  return objects.map(obj => {
    set(obj, ["metadata", "annotations", "garden.io/generated"], "true")
    set(obj, ["metadata", "annotations", GARDEN_ANNOTATION_KEYS_VERSION], version.versionString)
    set(obj, ["metadata", "labels", "module"], service.module.name)
    set(obj, ["metadata", "labels", "service"], service.name)
    return obj
  })
}

export async function createDeployment(
  provider: KubernetesProvider, service: ContainerService,
  runtimeContext: RuntimeContext, namespace: string, enableHotReload: boolean,
): Promise<KubernetesResource> {

  const spec = service.spec
  // TODO: support specifying replica count
  const configuredReplicas = 1 // service.spec.count[env.name] || 1
  const deployment: any = deploymentConfig(service, configuredReplicas, namespace)
  const envVars = { ...runtimeContext.envVars, ...service.spec.env }

  const env: KubeEnvVar[] = toPairs(envVars).map(([name, value]) => ({ name, value: value + "" }))

  // expose some metadata to the container
  env.push({
    name: "POD_NAME",
    valueFrom: { fieldRef: { fieldPath: "metadata.name" } },
  })

  env.push({
    name: "POD_NAMESPACE",
    valueFrom: { fieldRef: { fieldPath: "metadata.namespace" } },
  })

  env.push({
    name: "POD_IP",
    valueFrom: { fieldRef: { fieldPath: "status.podIP" } },
  })

  const registryConfig = provider.name === "local-kubernetes" ? undefined : provider.config.deploymentRegistry
  const imageId = await containerHelpers.getDeploymentImageId(service.module, registryConfig)

  const container: any = {
    name: service.name,
    image: imageId,
    env,
    ports: [],
    // TODO: make these configurable
    resources: {
      requests: {
        cpu: DEFAULT_CPU_REQUEST,
        memory: DEFAULT_MEMORY_REQUEST,
      },
      limits: {
        cpu: DEFAULT_CPU_LIMIT,
        memory: DEFAULT_MEMORY_LIMIT,
      },
    },
    imagePullPolicy: "IfNotPresent",
  }

  if (service.spec.command && service.spec.command.length > 0) {
    container.args = service.spec.command
  }

  // if (config.entrypoint) {
  //   container.command = [config.entrypoint]
  // }

  if (spec.healthCheck) {
    configureHealthCheck(container, spec)
  }

  // if (service.privileged) {
  //   container.securityContext = {
  //     privileged: true,
  //   }
  // }

  if (spec.volumes && spec.volumes.length) {
    configureVolumes(deployment, container, spec)
  }

  const ports = spec.ports

  for (const port of ports) {
    container.ports.push({
      name: port.name,
      protocol: port.protocol,
      containerPort: port.containerPort,
    })
  }

  if (spec.daemon) {
    // this runs a pod on every node
    deployment.kind = "DaemonSet"
    deployment.spec.updateStrategy = {
      type: "RollingUpdate",
    }

    for (const port of ports.filter(p => p.hostPort)) {
      // For daemons we can expose host ports directly on the Pod, as opposed to only via the Service resource.
      // This allows us to choose any port.
      // TODO: validate that conflicting ports are not defined.
      container.ports.push({
        protocol: port.protocol,
        containerPort: port.containerPort,
        hostPort: port.hostPort,
      })
    }

  } else {
    deployment.spec.replicas = configuredReplicas

    deployment.spec.strategy = {
      type: "RollingUpdate",
      rollingUpdate: {
        // This is optimized for fast re-deployment.
        maxUnavailable: 1,
        maxSurge: 1,
      },
    }
    deployment.spec.revisionHistoryLimit = 3
  }

  if (provider.config.imagePullSecrets.length > 0) {
    // add any configured imagePullSecrets
    deployment.spec.template.spec.imagePullSecrets = provider.config.imagePullSecrets.map(s => ({ name: s.name }))
  }

  // this is important for status checks to work correctly, because how K8s normalizes resources
  if (!container.ports.length) {
    delete container.ports
  }

  deployment.spec.template.spec.containers = [container]

  if (enableHotReload) {
    const hotReloadSpec = service.module.spec.hotReload

    if (!hotReloadSpec) {
      throw new ConfigurationError(`Service ${service.name} is not configured for hot reloading.`, {})
    }

    configureHotReload({
      target: deployment,
      hotReloadSpec,
      hotReloadArgs: service.spec.hotReloadCommand,
    })
  }

  if (!deployment.spec.template.spec.volumes.length) {
    // this is important for status checks to work correctly
    delete deployment.spec.template.spec.volumes
  }

  return deployment
}

function deploymentConfig(service: Service, configuredReplicas: number, namespace: string): object {

  const labels = {
    module: service.module.name,
    service: service.name,
  }

  // TODO: moar type-safety
  return {
    kind: "Deployment",
    apiVersion: "extensions/v1beta1",
    metadata: {
      name: service.name,
      annotations: {
        // we can use this to avoid overriding the replica count if it has been manually scaled
        "garden.io/configured.replicas": configuredReplicas.toString(),
      },
      namespace,
      labels,
    },
    spec: {
      selector: {
        matchLabels: {
          service: service.name,
        },
      },
      template: {
        metadata: {
          labels,
        },
        spec: {
          // TODO: set this for non-system pods
          // automountServiceAccountToken: false,  // this prevents the pod from accessing the kubernetes API
          containers: [],
          // TODO: make restartPolicy configurable
          restartPolicy: "Always",
          terminationGracePeriodSeconds: 5,
          dnsPolicy: "ClusterFirst",
          // TODO: support private registries
          // imagePullSecrets: [
          //   { name: DOCKER_AUTH_SECRET_NAME },
          // ],
          volumes: [],
        },
      },
    },
  }

}

function configureHealthCheck(container, spec): void {

  container.readinessProbe = {
    initialDelaySeconds: 10,
    periodSeconds: 5,
    timeoutSeconds: 3,
    successThreshold: 2,
    failureThreshold: 5,
  }

  container.livenessProbe = {
    initialDelaySeconds: 15,
    periodSeconds: 5,
    timeoutSeconds: 3,
    successThreshold: 1,
    failureThreshold: 3,
  }

  const portsByName = keyBy(spec.ports, "name")

  if (spec.healthCheck.httpGet) {
    const httpGet: any = extend({}, spec.healthCheck.httpGet)
    httpGet.port = portsByName[httpGet.port].containerPort

    container.readinessProbe.httpGet = httpGet
    container.livenessProbe.httpGet = httpGet
  } else if (spec.healthCheck.command) {
    container.readinessProbe.exec = { command: spec.healthCheck.command.map(s => s.toString()) }
    container.livenessProbe.exec = container.readinessProbe.exec
  } else if (spec.healthCheck.tcpPort) {
    container.readinessProbe.tcpSocket = {
      port: portsByName[spec.healthCheck.tcpPort].containerPort,
    }
    container.livenessProbe.tcpSocket = container.readinessProbe.tcpSocket
  } else {
    throw new Error("Must specify type of health check when configuring health check.")
  }

}

function configureVolumes(deployment, container, spec): void {
  const volumes: any[] = []
  const volumeMounts: any[] = []

  for (const volume of spec.volumes) {
    const volumeName = volume.name
    const volumeType = !!volume.hostPath ? "hostPath" : "emptyDir"

    if (!volumeName) {
      throw new Error("Must specify volume name")
    }

    if (volumeType === "emptyDir") {
      volumes.push({
        name: volumeName,
        emptyDir: {},
      })
      volumeMounts.push({
        name: volumeName,
        mountPath: volume.containerPath,
      })
    } else if (volumeType === "hostPath") {
      volumes.push({
        name: volumeName,
        hostPath: {
          path: volume.hostPath,
        },
      })
      volumeMounts.push({
        name: volumeName,
        mountPath: volume.containerPath || volume.hostPath,
      })
    } else {
      throw new Error("Unsupported volume type: " + volumeType)
    }
  }

  deployment.spec.template.spec.volumes = volumes
  container.volumeMounts = volumeMounts
}

/**
 * Removes leading slash, and ensures there's exactly one trailing slash.
 *
 * converts /src/foo into src/foo/
 */
export function rsyncTargetPath(path: string) {
  return path.replace(/^\/*/, "")
    .replace(/\/*$/, "/")
}

export async function deleteService(params: DeleteServiceParams): Promise<ServiceStatus> {
  const { ctx, log, service } = params
  const namespace = await getAppNamespace(ctx, ctx.provider)
  const provider = ctx.provider

  const context = provider.config.context
  await deleteContainerDeployment({ namespace, provider, serviceName: service.name, log })
  await deleteObjectsByLabel({
    context,
    namespace,
    labelKey: "service",
    labelValue: service.name,
    objectTypes: ["deployment", "replicaset", "pod", "service", "ingress", "daemonset"],
    includeUninitialized: false,
  })

  return getContainerServiceStatus({ ...params, hotReload: false })
}

export async function deleteContainerDeployment(
  { namespace, provider, serviceName, log },
) {

  let found = true
  const api = new KubeApi(provider)

  try {
    await api.extensions.deleteNamespacedDeployment(serviceName, namespace, <any>{})
  } catch (err) {
    if (err.code === 404) {
      found = false
    } else {
      throw err
    }
  }

  if (log) {
    found ? log.setSuccess("Service deleted") : log.setWarn("Service not deployed")
  }
}

export async function pushModule({ ctx, module, log }: PushModuleParams<ContainerModule>) {
  if (!(await containerHelpers.hasDockerfile(module))) {
    log.setState({ msg: `Nothing to push` })
    return { pushed: false }
  }

  const localId = await containerHelpers.getLocalImageId(module)
  const remoteId = await containerHelpers.getDeploymentImageId(module, ctx.provider.config.deploymentRegistry)

  log.setState({ msg: `Pushing image ${remoteId}...` })

  await containerHelpers.dockerCli(module, ["tag", localId, remoteId])
  await containerHelpers.dockerCli(module, ["push", remoteId])

  return { pushed: true, message: `Pushed ${localId}` }
}
