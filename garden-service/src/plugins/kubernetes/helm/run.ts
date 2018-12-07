/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { RunTaskParams } from "../../../types/plugin/params"
import { HelmModule } from "./config"
import { RunTaskResult } from "../../../types/plugin/outputs"
import { getAppNamespace } from "../namespace"
import { runPod } from "../run"
import { findServiceResource, getChartResources, getResourceContainer } from "./common"

export async function runHelmTask(
  { ctx, log, module, task, interactive, runtimeContext, timeout }: RunTaskParams<HelmModule>,
): Promise<RunTaskResult> {
  const context = ctx.provider.config.context
  const namespace = await getAppNamespace(ctx, ctx.provider)

  const args = task.spec.args

  // find the relevant resource, and from that the container image to run
  const chartResources = await getChartResources(ctx, module, log)
  const resource = await findServiceResource({ ctx, log, module, chartResources, resourceSpec: task.spec.resource })
  const container = getResourceContainer(resource)

  const res = await runPod({
    context,
    namespace,
    module,
    envVars: { ...runtimeContext.envVars, ...task.spec.env },
    args,
    image: container.image,
    interactive,
    ignoreError: false,
    timeout,
  })

  return {
    taskName: task.name,
    ...res,
  }
}
