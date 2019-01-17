/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ModuleAndRuntimeActions } from "../../../types/plugin/plugin"
import { getExecModuleBuildStatus } from "../../exec"
import { HelmModule, validateHelmModule } from "./config"
import { buildHelmModule } from "./build"
import { getServiceStatus } from "./status"
import { deployService, deleteService } from "./deployment"
import { getTestResult } from "../test"
import { runHelmTask } from "./run"
import { hotReloadHelmChart, getServiceOutputs } from "./hot-reload"
import { getServiceLogs } from "./logs"

export const helmHandlers: Partial<ModuleAndRuntimeActions<HelmModule>> = {
  build: buildHelmModule,
  // TODO: add execInService handler
  deleteService,
  deployService,
  getBuildStatus: getExecModuleBuildStatus,
  getServiceLogs,
  getServiceOutputs,
  getServiceStatus,
  getTestResult,
  hotReloadService: hotReloadHelmChart,
  // TODO: add pushModule handler
  runTask: runHelmTask,
  // TODO: add testModule handler
  validate: validateHelmModule,
}
