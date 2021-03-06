/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { basename, join } from "path"
import dedent = require("dedent")
import { ensureDir } from "fs-extra"

import {
  Command,
  CommandResult,
  StringParameter,
  ChoicesParameter,
  CommandParams,
} from "../base"
import { ParameterError, GardenBaseError } from "../../exceptions"
import { availableModuleTypes, ModuleType } from "./config-templates"
import {
  prepareNewModuleOpts,
  dumpConfig,
} from "./helpers"
import { prompts } from "./prompts"
import { validate, joiUserIdentifier } from "../../config/common"
import { NewModuleOpts } from "./project"
import { configSchema } from "../../config/base"

const createModuleOptions = {
  name: new StringParameter({
    help: "Assigns a custom name to the module (defaults to name of the current directory)",
  }),
  type: new ChoicesParameter({
    help: "Type of module.",
    choices: availableModuleTypes,
  }),
}

const createModuleArguments = {
  "module-dir": new StringParameter({
    help: "Directory of the module (defaults to current directory).",
  }),
}

type Args = typeof createModuleArguments
type Opts = typeof createModuleOptions

interface CreateModuleResult extends CommandResult {
  result: {
    module?: NewModuleOpts,
  }
}

export class CreateModuleCommand extends Command<Args, Opts> {
  name = "module"
  help = "Creates a new Garden module."
  header = { emoji: "house_with_garden", command: "create" }

  description = dedent`
    Examples:

        garden create module # creates a new module in the current directory (module name defaults to directory name)
        garden create module my-module # creates a new module in my-module directory
        garden create module --type=container # creates a new container module
        garden create module --name=my-module # creates a new module in current directory and names it my-module
  `

  noProject = true
  arguments = createModuleArguments
  options = createModuleOptions

  async action({ garden, args, opts, log }: CommandParams<Args, Opts>): Promise<CreateModuleResult> {
    let errors: GardenBaseError[] = []

    const moduleRoot = join(garden.projectRoot, (args["module-dir"] || "").trim())
    const moduleName = validate(
      opts.name || basename(moduleRoot),
      joiUserIdentifier(),
      { context: "module name" },
    )

    await ensureDir(moduleRoot)

    log.info(`Initializing new module ${moduleName}`)

    let type: ModuleType

    if (opts.type) {
      // Type passed as parameter
      type = <ModuleType>opts.type
      if (!availableModuleTypes.includes(type)) {
        throw new ParameterError("Module type not available", {})
      }
    } else {
      // Prompt for type
      log.info("---------")
      // Stop logger while prompting
      log.stopAll()
      type = (await prompts.addConfigForModule(moduleName)).type
      log.info("---------")
      if (!type) {
        return { result: {} }
      }
    }

    const moduleOpts = prepareNewModuleOpts(moduleName, type, moduleRoot)
    try {
      await dumpConfig(moduleOpts, configSchema, log)
    } catch (err) {
      errors.push(err)
    }
    return {
      result: { module: moduleOpts },
      errors,
    }
  }
}
