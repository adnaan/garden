/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import dedent = require("dedent")

import { validateWithPath } from "../../config/common"
import { pathExists } from "fs-extra"
import { ConfigurationError } from "../../exceptions"
import { GardenPlugin } from "../../types/plugin/plugin"
import {
  BuildModuleParams,
  GetBuildStatusParams,
  ValidateModuleParams,
  HotReloadServiceParams,
  PublishModuleParams,
} from "../../types/plugin/params"
import { keyBy } from "lodash"
import { containerHelpers } from "./helpers"
import { ContainerModule, containerModuleSpecSchema } from "./config"

export async function validateContainerModule({ ctx, moduleConfig }: ValidateModuleParams<ContainerModule>) {
  moduleConfig.spec = validateWithPath({
    config: moduleConfig.spec,
    schema: containerModuleSpecSchema,
    name: moduleConfig.name,
    path: moduleConfig.path,
    projectRoot: ctx.projectRoot,
  })

  // validate hot reload configuration
  // TODO: validate this when validating this action's output
  const hotReloadConfig = moduleConfig.spec.hotReload

  if (hotReloadConfig) {
    const invalidPairDescriptions: string[] = []
    const targets = hotReloadConfig.sync.map(syncSpec => syncSpec.target)

    // Verify that sync targets are mutually disjoint - i.e. that no target is a subdirectory of
    // another target. Mounting directories into mounted directories will cause unexpected results
    for (const t of targets) {
      for (const t2 of targets) {
        if (t2.startsWith(t) && t !== t2) {
          invalidPairDescriptions.push(`${t} is a subdirectory of ${t2}.`)
        }
      }
    }

    if (invalidPairDescriptions.length > 0) {
      // TODO: Adapt this message to also handle source errors
      throw new ConfigurationError(
        dedent`Invalid hot reload configuration - a target may not be a subdirectory of another target
        in the same module.

        ${invalidPairDescriptions.join("\n")}`,
        { invalidPairDescriptions, hotReloadConfig },
      )
    }
  }

  // validate services
  moduleConfig.serviceConfigs = moduleConfig.spec.services.map(spec => {
    // make sure ports are correctly configured
    const name = spec.name
    const definedPorts = spec.ports
    const portsByName = keyBy(spec.ports, "name")

    for (const ingress of spec.ingresses) {
      const ingressPort = ingress.port

      if (!portsByName[ingressPort]) {
        throw new ConfigurationError(
          `Service ${name} does not define port ${ingressPort} defined in ingress`,
          { definedPorts, ingressPort },
        )
      }
    }

    if (spec.healthCheck && spec.healthCheck.httpGet) {
      const healthCheckHttpPort = spec.healthCheck.httpGet.port

      if (!portsByName[healthCheckHttpPort]) {
        throw new ConfigurationError(
          `Service ${name} does not define port ${healthCheckHttpPort} defined in httpGet health check`,
          { definedPorts, healthCheckHttpPort },
        )
      }
    }

    if (spec.healthCheck && spec.healthCheck.tcpPort) {
      const healthCheckTcpPort = spec.healthCheck.tcpPort

      if (!portsByName[healthCheckTcpPort]) {
        throw new ConfigurationError(
          `Service ${name} does not define port ${healthCheckTcpPort} defined in tcpPort health check`,
          { definedPorts, healthCheckTcpPort },
        )
      }
    }

    return {
      name,
      dependencies: spec.dependencies,
      outputs: spec.outputs,
      spec,
    }
  })

  moduleConfig.testConfigs = moduleConfig.spec.tests.map(t => ({
    name: t.name,
    dependencies: t.dependencies,
    spec: t,
    timeout: t.timeout,
  }))

  moduleConfig.taskConfigs = moduleConfig.spec.tasks.map(t => ({
    name: t.name,
    dependencies: t.dependencies,
    spec: t,
    timeout: t.timeout,
  }))

  const hasDockerfile = await pathExists(containerHelpers.getDockerfilePathFromConfig(moduleConfig))

  if (moduleConfig.spec.dockerfile && !hasDockerfile) {
    throw new ConfigurationError(
      `Dockerfile not found at specififed path ${moduleConfig.spec.dockerfile} for module ${moduleConfig.name}`,
      {},
    )
  }

  // make sure we can build the thing
  if (!moduleConfig.spec.image && !hasDockerfile) {
    throw new ConfigurationError(
      `Module ${moduleConfig.name} neither specifies image nor provides Dockerfile`,
      {},
    )
  }

  return moduleConfig
}

// TODO: rename this plugin to docker
export const gardenPlugin = (): GardenPlugin => ({
  moduleActions: {
    container: {
      validate: validateContainerModule,

      async getBuildStatus({ module, log }: GetBuildStatusParams<ContainerModule>) {
        const identifier = await containerHelpers.imageExistsLocally(module)

        if (identifier) {
          log.debug({
            section: module.name,
            msg: `Image ${identifier} already exists`,
            symbol: "info",
          })
        }

        return { ready: !!identifier }
      },

      async build({ module, log }: BuildModuleParams<ContainerModule>) {
        const buildPath = module.buildPath
        const image = module.spec.image

        if (!!image && !(await containerHelpers.hasDockerfile(module))) {
          if (await containerHelpers.imageExistsLocally(module)) {
            return { fresh: false }
          }
          log.setState(`Pulling image ${image}...`)
          await containerHelpers.pullImage(module)
          return { fetched: true }
        }

        const identifier = await containerHelpers.getLocalImageId(module)

        // build doesn't exist, so we create it
        log.setState(`Building ${identifier}...`)

        const cmdOpts = ["build", "-t", identifier]
        const buildArgs = Object.entries(module.spec.buildArgs).map(([key, value]) => {
          // TODO: may need to escape this
          return `--build-arg ${key}=${value}`
        }).join(" ")

        if (buildArgs) {
          cmdOpts.push(buildArgs)
        }

        if (module.spec.dockerfile) {
          cmdOpts.push("--file", containerHelpers.getDockerfilePathFromModule(module))
        }

        // TODO: log error if it occurs
        // TODO: stream output to log if at debug log level
        await containerHelpers.dockerCli(module, [...cmdOpts, buildPath])

        return { fresh: true, details: { identifier } }
      },

      async publishModule({ module, log }: PublishModuleParams<ContainerModule>) {
        if (!(await containerHelpers.hasDockerfile(module))) {
          log.setState({ msg: `Nothing to publish` })
          return { published: false }
        }

        const localId = await containerHelpers.getLocalImageId(module)
        const remoteId = await containerHelpers.getPublicImageId(module)

        log.setState({ msg: `Publishing image ${remoteId}...` })

        if (localId !== remoteId) {
          await containerHelpers.dockerCli(module, ["tag", localId, remoteId])
        }

        // TODO: log error if it occurs
        // TODO: stream output to log if at debug log level
        // TODO: check if module already exists remotely?
        await containerHelpers.dockerCli(module, ["push", remoteId])

        return { published: true, message: `Published ${remoteId}` }
      },

      async hotReloadService(_: HotReloadServiceParams) {
        return {}
      },

    },
  },
})
