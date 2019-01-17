/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HelmService, HelmModule } from "./config"
import { ConfigurationError } from "../../../exceptions"
import { deline } from "../../../util/string"
import { HotReloadServiceParams, GetServiceOutputsParams } from "../../../types/plugin/params"
import { ContainerModule } from "../../container/config"
import { HotReloadServiceResult } from "../../../types/plugin/outputs"
import { getChartResources, findServiceResource, getReleaseName } from "./common"
import { syncToService, HotReloadableKind } from "../hot-reload"
import { PrimitiveMap } from "../../../config/common"

/**
 * The hot reload action handler for Helm charts.
 */
export async function hotReloadHelmChart(
  { ctx, log, module, service }: HotReloadServiceParams<HelmModule, ContainerModule>,
): Promise<HotReloadServiceResult> {
  const hotReloadSpec = getHotReloadSpec(service)

  const chartResources = await getChartResources(ctx, service.module, log)
  const resourceSpec = service.spec.serviceResource

  const target = await findServiceResource({
    ctx,
    log,
    module,
    chartResources,
    resourceSpec,
  })

  await syncToService(ctx, service, hotReloadSpec, <HotReloadableKind>target.kind, target.metadata.name, log)

  return {}
}

export async function getServiceOutputs({ module }: GetServiceOutputsParams): Promise<PrimitiveMap> {
  return {
    "release-name": await getReleaseName(module),
  }
}

export function getHotReloadSpec(service: HelmService) {
  const module = service.module
  const resourceSpec = module.spec.serviceResource

  if (!resourceSpec || !resourceSpec.containerModule) {
    throw new ConfigurationError(
      `Module ${module.name} must specify \`serviceResource.containerModule\` in order to enable hot-reloading.`,
      { moduleName: module.name, resourceSpec },
    )
  }

  if (service.sourceModule.type !== "container") {
    throw new ConfigurationError(deline`
      Module '${resourceSpec.containerModule}', referenced on module '${module.name}' under
      \`serviceResource.containerModule\`, is not a container module.
      Please specify the appropriate container module that contains the sources for the resource.`,
      { moduleName: module.name, sourceModuleType: service.sourceModule.type, resourceSpec },
    )
  }

  // The sourceModule property is assigned in the Helm module validate action
  const hotReloadSpec = service.sourceModule.spec.hotReload

  if (!hotReloadSpec) {
    throw new ConfigurationError(deline`
      Module '${resourceSpec.containerModule}', referenced on module '${module.name}' under
      \`serviceResource.containerModule\`, is not configured for hot-reloading.
      Please specify \`hotReload\` on the '${resourceSpec.containerModule}' module in order to enable hot-reloading.`,
      { moduleName: module.name, resourceSpec },
    )
  }

  return hotReloadSpec
}
