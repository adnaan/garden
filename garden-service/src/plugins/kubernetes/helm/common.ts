/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { find } from "lodash"
import { join } from "path"
import { pathExists, writeFile, remove } from "fs-extra"
import cryptoRandomString = require("crypto-random-string")
import { PluginContext } from "../../../plugin-context"
import { LogEntry } from "../../../logger/log-entry"
import { getAppNamespace } from "../namespace"
import { KubernetesResource } from "../types"
import { safeLoadAll } from "js-yaml"
import { helm } from "./helm-cli"
import { HelmModule, HelmModuleConfig, HelmResourceSpec } from "./config"
import { HotReloadableResource } from "../hot-reload"
import { ConfigurationError } from "../../../exceptions"
import { Module } from "../../../types/module"
import { findByName } from "../../../util/util"

export async function containsSource(config: HelmModuleConfig) {
  const yamlPath = join(config.path, config.spec.chartPath, "Chart.yaml")
  return pathExists(yamlPath)
}

export async function getChartResources(ctx: PluginContext, module: Module, log: LogEntry) {
  const chartPath = await getChartPath(module)
  const valuesPath = getValuesPath(chartPath)
  const namespace = await getAppNamespace(ctx, ctx.provider)
  const releaseName = getReleaseName(module)

  const objects = <KubernetesResource[]>safeLoadAll(await helm(ctx, log,
    "template",
    "--name", releaseName,
    "--namespace", namespace,
    "--values", valuesPath,
    chartPath,
  ))

  return objects.filter(obj => obj !== null).map((obj) => {
    if (!obj.metadata.annotations) {
      obj.metadata.annotations = {}
    }
    return obj
  })
}

export async function getChartPath(module: HelmModule) {
  if (await containsSource(module)) {
    return join(module.buildPath, module.spec.chartPath)
  } else {
    const splitName = module.spec.chart!.split("/")
    const chartDir = splitName[splitName.length - 1]
    return join(module.buildPath, chartDir)
  }
}

export function getValuesPath(chartPath: string) {
  return join(chartPath, "garden-values.yml")
}

export function getReleaseName(module: Module) {
  return module.name
}

interface GetServiceResourceParams {
  ctx: PluginContext,
  log: LogEntry,
  chartResources: KubernetesResource[],
  module: HelmModule,
  resourceSpec?: HelmResourceSpec,
}

/**
 * Returns the configured service resource, that we can use for hot-reloading and other service-specific
 * functionality.
 */
export async function findServiceResource(
  { ctx, log, chartResources, module, resourceSpec }: GetServiceResourceParams,
): Promise<HotReloadableResource> {
  if (!resourceSpec) {
    resourceSpec = module.spec.serviceResource
  }

  if (!resourceSpec) {
    throw new ConfigurationError(
      `Module '${module.name}' doesn't specify a \`serviceResource\` in its configuration. ` +
      `You must specify it in the module config in order to use certain Garden features, such as hot reloading.`,
      { resourceSpec },
    )
  }

  const targetKind = resourceSpec.kind
  let targetName = resourceSpec.name

  const chartResourceNames = chartResources.map(o => `${o.kind}/${o.metadata.name}`)
  const applicableChartResources = chartResources.filter(o => o.kind === targetKind)

  let target: HotReloadableResource

  if (targetName) {
    if (targetName.includes("{{")) {
      // need to resolve the template string
      const chartPath = await getChartPath(module)
      targetName = await renderHelmTemplateString(ctx, log, module, chartPath, targetName)
    }

    target = find(
      <HotReloadableResource[]>chartResources,
      o => o.kind === targetKind && o.metadata.name === targetName,
    )!

    if (!target) {
      throw new ConfigurationError(
        `Module '${module.name}' does not contain specified ${targetKind} '${targetName}'`,
        { resourceSpec, chartResourceNames },
      )
    }
  } else {
    if (applicableChartResources.length > 1) {
      throw new ConfigurationError(
        `Module '${module.name}' contains multiple ${targetKind}s. ` +
        `You must specify \`serviceResource.name\` in the module config in order to identify ` +
        `the correct ${targetKind}.`,
        { resourceSpec, chartResourceNames },
      )
    }
    target = <HotReloadableResource>applicableChartResources[0]
  }

  return target
}

export function getResourceContainer(resource: HotReloadableResource, containerName?: string) {
  const kind = resource.kind
  const name = resource.metadata.name

  const containers = resource.spec.template.spec.containers || []

  if (containers.length === 0) {
    throw new ConfigurationError(
      `${kind} ${resource.metadata.name} has no containers configured.`,
      { resource },
    )
  }

  const container = containerName ? findByName(containers, containerName) : containers[0]

  if (!container) {
    throw new ConfigurationError(
      `Could not find container '${containerName}' in ${kind} '${name}'`,
      { resource, containerName },
    )
  }

  return container
}

/**
 * This is a dirty hack that allows us to resolve Helm template strings ad-hoc.
 * Basically this writes a dummy file to the chart, has Helm resolve it, and then deletes the file.
 */
async function renderHelmTemplateString(
  ctx: PluginContext, log: LogEntry, module: Module, chartPath: string, value: string,
): Promise<string> {
  const tempFilePath = join(chartPath, "templates", cryptoRandomString(16))
  const valuesPath = getValuesPath(chartPath)
  const namespace = await getAppNamespace(ctx, ctx.provider)
  const releaseName = getReleaseName(module)

  try {
    await writeFile(tempFilePath, value)

    const objects = safeLoadAll(await helm(ctx, log,
      "template",
      "--name", releaseName,
      "--namespace", namespace,
      "--values", valuesPath,
      "-x", tempFilePath,
      chartPath,
    ))

    return objects[0]

  } finally {
    await remove(tempFilePath)
  }
}
