
/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestResult } from "../../../types/plugin/outputs"
import { TestModuleParams } from "../../../types/plugin/params"
import { ContainerModule } from "../../container/config"
import { serializeValues } from "../../../util/util"
import { KubeApi } from "../api"
import { getMetadataNamespace } from "../namespace"
import { DEFAULT_TEST_TIMEOUT } from "../../../constants"
import { runContainerModule } from "./run"
import { getTestResultKey } from "../test"

export async function testModule(
  { ctx, interactive, module, runtimeContext, testConfig, log, buildDependencies }:
    TestModuleParams<ContainerModule>,
): Promise<TestResult> {
  const testName = testConfig.name
  const command = testConfig.spec.command
  runtimeContext.envVars = { ...runtimeContext.envVars, ...testConfig.spec.env }
  const timeout = testConfig.timeout || DEFAULT_TEST_TIMEOUT

  const result = await runContainerModule({
    ctx,
    module,
    command,
    interactive,
    runtimeContext,
    timeout,
    log,
    buildDependencies,
  })

  const api = new KubeApi(ctx.provider)

  // store test result
  const testResult: TestResult = {
    ...result,
    testName,
  }

  const ns = await getMetadataNamespace(ctx, ctx.provider)
  const resultKey = getTestResultKey(module, testName, result.version)
  const body = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: resultKey,
      annotations: {
        "garden.io/generated": "true",
      },
    },
    data: serializeValues(testResult),
  }

  try {
    await api.core.createNamespacedConfigMap(ns, <any>body)
  } catch (err) {
    if (err.code === 409) {
      await api.core.patchNamespacedConfigMap(resultKey, ns, body)
    } else {
      throw err
    }
  }

  return testResult
}
