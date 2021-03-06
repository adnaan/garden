import { expect } from "chai"

import {
  availableModuleTypes,
  projectTemplate,
  moduleTemplate,
} from "../../../../src/commands/create/config-templates"
import { validate } from "../../../../src/config/common"
import { configSchema } from "../../../../src/config/base"

describe("ConfigTemplates", () => {
  describe("projectTemplate", () => {
    for (const moduleType of availableModuleTypes) {
      it(`should be valid for module type ${moduleType}`, async () => {
        const config = projectTemplate("my-project", [moduleType])
        expect(() => validate(config, configSchema)).to.not.throw()
      })
    }
    it("should be valid for multiple module types", async () => {
      const config = projectTemplate("my-project", availableModuleTypes)
      expect(() => validate(config, configSchema)).to.not.throw()
    })
    it("should be valid for multiple modules of same type", async () => {
      const config = projectTemplate("my-project", [availableModuleTypes[0], availableModuleTypes[0]])
      expect(() => validate(config, configSchema)).to.not.throw()
    })
    it("should be valid if no modules", async () => {
      const config = projectTemplate("my-project", [])
      expect(() => validate(config, configSchema)).to.not.throw()
    })
  })
  describe("moduleTemplate", () => {
    for (const moduleType of availableModuleTypes) {
      it(`should be valid for module type ${moduleType}`, async () => {
        const config = moduleTemplate("my-module", moduleType)
        expect(() => validate(config, configSchema)).to.not.throw()
      })
    }
  })
})
