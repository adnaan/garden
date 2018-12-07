/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestResult } from "../../types/plugin/outputs"
import { GetTestResultParams } from "../../types/plugin/params"
import { ContainerModule } from "../container/config"
import { deserializeValues } from "../../util/util"
import { KubeApi } from "./api"
import { getMetadataNamespace } from "./namespace"
import { Module } from "../../types/module"
import { ModuleVersion } from "../../vcs/base"
import { HelmModule } from "./helm/config"

export async function getTestResult(
  { ctx, module, testName, version }: GetTestResultParams<ContainerModule | HelmModule>,
) {
  const api = new KubeApi(ctx.provider)
  const ns = await getMetadataNamespace(ctx, ctx.provider)
  const resultKey = getTestResultKey(module, testName, version)

  try {
    const res = await api.core.readNamespacedConfigMap(resultKey, ns)
    return <TestResult>deserializeValues(res.body.data)
  } catch (err) {
    if (err.code === 404) {
      return null
    } else {
      throw err
    }
  }
}

export function getTestResultKey(module: Module, testName: string, version: ModuleVersion) {
  return `test-result--${module.name}--${testName}--${version.versionString}`
}
