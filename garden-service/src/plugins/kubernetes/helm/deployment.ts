/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DeployServiceParams, DeleteServiceParams } from "../../../types/plugin/params"
import { ServiceStatus } from "../../../types/service"
import { getAppNamespace } from "../namespace"
import { waitForResources } from "../status"
import { helm } from "./helm-cli"
import { HelmModule } from "./config"
import { getChartPath, getValuesPath, getReleaseName, getChartResources, findServiceResource } from "./common"
import { getReleaseStatus, getServiceStatus } from "./status"
import { configureHotReload, HotReloadableResource } from "../hot-reload"
import { apply } from "../kubectl"
import { KubernetesProvider } from "../kubernetes"
import { ContainerHotReloadSpec } from "../../container/config"
import { getHotReloadSpec } from "./hot-reload"

export async function deployService(
  { ctx, module, service, log, force, hotReload }: DeployServiceParams<HelmModule>,
): Promise<ServiceStatus> {
  let hotReloadSpec: ContainerHotReloadSpec | null = null
  let hotReloadTarget: HotReloadableResource | null = null

  const chartResources = await getChartResources(ctx, module, log)

  if (hotReload) {
    const resourceSpec = service.spec.serviceResource
    hotReloadTarget = await findServiceResource({ ctx, log, module, chartResources, resourceSpec })
    hotReloadSpec = getHotReloadSpec(service)
  }

  const provider: KubernetesProvider = ctx.provider
  const chartPath = await getChartPath(module)
  const valuesPath = getValuesPath(chartPath)
  const namespace = await getAppNamespace(ctx, ctx.provider)
  const releaseName = getReleaseName(module)
  const releaseStatus = await getReleaseStatus(ctx, releaseName, log)

  if (releaseStatus.state === "missing") {
    log.silly(`Installing Helm release ${releaseName}`)
    const installArgs = [
      "install", chartPath,
      "--name", releaseName,
      "--namespace", namespace,
      "--values", valuesPath,
      "--wait",
    ]
    if (force) {
      installArgs.push("--replace")
    }
    await helm(ctx, log, ...installArgs)
  } else {
    log.silly(`Upgrading Helm release ${releaseName}`)
    const upgradeArgs = [
      "upgrade", releaseName, chartPath,
      "--install",
      "--namespace", namespace,
      "--values", valuesPath,
      "--wait",
    ]
    if (force) {
      upgradeArgs.push("--force")
    }
    await helm(ctx, log, ...upgradeArgs)
  }

  if (hotReload && hotReloadSpec && hotReloadTarget) {
    // Because we need to modify the Deployment, and because there is currently no reliable way to do that before
    // installing/upgrading via Helm, we need to separately update the target here.
    const resourceSpec = module.spec.serviceResource

    configureHotReload({
      target: hotReloadTarget,
      hotReloadSpec,
      hotReloadArgs: resourceSpec && resourceSpec.hotReloadArgs,
      containerName: resourceSpec && resourceSpec.containerName,
    })

    await apply(provider.config.context, hotReloadTarget, { namespace })
  }

  // FIXME: we should get these objects from the cluster, and not from the local `helm template` command, because
  // they may be legitimately inconsistent.
  await waitForResources({ ctx, provider, serviceName: service.name, resources: chartResources, log })

  return {}
}

export async function deleteService(params: DeleteServiceParams): Promise<ServiceStatus> {
  const { ctx, log, module } = params
  const releaseName = getReleaseName(module)
  await helm(ctx, log, "delete", "--purge", releaseName)
  log.setSuccess("Service deleted")

  return await getServiceStatus({ ...params, hotReload: false })
}
