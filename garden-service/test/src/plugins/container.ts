import { expect } from "chai"
import { resolve, join } from "path"
import { cloneDeep } from "lodash"
import * as td from "testdouble"

import { Garden } from "../../../src/garden"
import { PluginContext } from "../../../src/plugin-context"
import { gardenPlugin } from "../../../src/plugins/container/container"
import {
  dataDir,
  expectError,
  makeTestGarden,
} from "../../helpers"
import { moduleFromConfig } from "../../../src/types/module"
import { ModuleConfig } from "../../../src/config/module"
import { LogEntry } from "../../../src/logger/log-entry"
import { ContainerModuleSpec, ContainerModuleConfig } from "../../../src/plugins/container/config"
import { containerHelpers } from "../../../src/plugins/container/helpers"

describe("plugins.container", () => {
  const projectRoot = resolve(dataDir, "test-project-container")
  const modulePath = resolve(dataDir, "test-project-container", "module-a")
  const relDockerfilePath = "docker-dir/Dockerfile"

  const handler = gardenPlugin()
  const validate = handler.moduleActions!.container!.validate!
  const build = handler.moduleActions!.container!.build!
  const publishModule = handler.moduleActions!.container!.publishModule!
  const getBuildStatus = handler.moduleActions!.container!.getBuildStatus!

  const baseConfig: ModuleConfig<ContainerModuleSpec, any, any> = {
    allowPublish: false,
    build: {
      command: [],
      dependencies: [],
    },
    name: "test",
    path: modulePath,
    type: "container",
    variables: {},

    spec: {
      buildArgs: {},
      services: [],
      tasks: [],
      tests: [],
    },

    serviceConfigs: [],
    taskConfigs: [],
    testConfigs: [],
  }

  let garden: Garden
  let ctx: PluginContext
  let log: LogEntry

  beforeEach(async () => {
    garden = await makeTestGarden(projectRoot, { container: gardenPlugin })
    log = garden.log
    ctx = garden.getPluginContext("container")

    td.replace(garden.buildDir, "syncDependencyProducts", () => null)

    td.replace(Garden.prototype, "resolveVersion", async () => ({
      versionString: "1234",
      dirtyTimestamp: null,
      dependencyVersions: [],
    }))
  })

  async function getTestModule(moduleConfig: ContainerModuleConfig) {
    const parsed = await validate({ ctx, moduleConfig })
    return moduleFromConfig(garden, parsed)
  }

  describe("getLocalImageId", () => {
    it("should create identifier with commit hash version if module has a Dockerfile", async () => {
      const config = cloneDeep(baseConfig)
      config.spec.image = "some/image:1.1"
      const module = await getTestModule(config)

      td.replace(containerHelpers, "hasDockerfile", async () => true)

      expect(await containerHelpers.getLocalImageId(module)).to.equal("test:1234")
    })

    it("should create identifier with image name if module has no Dockerfile", async () => {
      const config = cloneDeep(baseConfig)
      config.spec.image = "some/image:1.1"
      const module = await getTestModule(config)

      td.replace(containerHelpers, "hasDockerfile", async () => false)

      expect(await containerHelpers.getLocalImageId(module)).to.equal("some/image:1.1")
    })
  })

  describe("getDockerfilePathFromModule", () => {
    it("should return the absolute default Dockerfile path", async () => {
      const module = await getTestModule(baseConfig)

      td.replace(containerHelpers, "hasDockerfile", async () => true)

      const path = await containerHelpers.getDockerfilePathFromModule(module)
      expect(path).to.equal(join(module.buildPath, "Dockerfile"))
    })

    it("should return the absolute user specified Dockerfile path", async () => {
      const config = cloneDeep(baseConfig)
      config.spec.dockerfile = relDockerfilePath
      const module = await getTestModule(config)

      td.replace(containerHelpers, "hasDockerfile", async () => true)

      const path = await containerHelpers.getDockerfilePathFromModule(module)
      expect(path).to.equal(join(module.buildPath, relDockerfilePath))
    })
  })

  describe("getPublicImageId", () => {
    it("should use image name including version if specified", async () => {
      const config = cloneDeep(baseConfig)
      config.spec.image = "some/image:1.1"
      const module = await getTestModule(config)

      expect(await containerHelpers.getPublicImageId(module)).to.equal("some/image:1.1")
    })

    it("should use image name if specified with commit hash if no version is set", async () => {
      const module = await getTestModule({
        allowPublish: false,
        build: {
          command: [],
          dependencies: [],
        },
        name: "test",
        path: modulePath,
        type: "container",
        variables: {},

        spec: {
          buildArgs: {},
          image: "some/image",
          services: [],
          tasks: [],
          tests: [],
        },

        serviceConfigs: [],
        taskConfigs: [],
        testConfigs: [],
      })

      expect(await containerHelpers.getPublicImageId(module)).to.equal("some/image:1234")
    })

    it("should use local id if no image name is set", async () => {
      const module = await getTestModule(baseConfig)

      td.replace(containerHelpers, "getLocalImageId", async () => "test:1234")

      expect(await containerHelpers.getPublicImageId(module)).to.equal("test:1234")
    })
  })

  describe("getDockerfilePathFromConfig", () => {
    it("should return the absolute default Dockerfile path", async () => {
      const path = await containerHelpers.getDockerfilePathFromConfig(baseConfig)
      expect(path).to.equal(join(baseConfig.path, "Dockerfile"))
    })

    it("should return the absolute user specified Dockerfile path", async () => {
      const config = cloneDeep(baseConfig)
      config.spec.dockerfile = relDockerfilePath

      const path = await containerHelpers.getDockerfilePathFromConfig(config)
      expect(path).to.equal(join(config.path, relDockerfilePath))
    })
  })

  describe("DockerModuleHandler", () => {
    describe("validate", () => {
      it("should validate and parse a container module", async () => {
        const moduleConfig: ContainerModuleConfig = {
          allowPublish: false,
          build: {
            command: ["echo", "OK"],
            dependencies: [],
          },
          name: "module-a",
          path: modulePath,
          type: "container",
          variables: {},

          spec: {
            buildArgs: {},
            services: [{
              name: "service-a",
              command: ["echo"],
              dependencies: [],
              daemon: false,
              ingresses: [
                {
                  path: "/",
                  port: "http",
                },
              ],
              env: {
                SOME_ENV_VAR: "value",
              },
              healthCheck: {
                httpGet: {
                  path: "/health",
                  port: "http",
                },
              },
              ports: [{
                name: "http",
                protocol: "TCP",
                containerPort: 8080,
                servicePort: 8080,
              }],
              outputs: {},
              volumes: [],
            }],
            tasks: [{
              name: "task-a",
              command: ["echo", "OK"],
              dependencies: [],
              timeout: null,
            }],
            tests: [{
              name: "unit",
              command: ["echo", "OK"],
              dependencies: [],
              env: {},
              timeout: null,
            }],
          },

          serviceConfigs: [],
          taskConfigs: [],
          testConfigs: [],
        }

        const result = await validate({ ctx, moduleConfig })

        expect(result).to.eql({
          allowPublish: false,
          build: { command: ["echo", "OK"], dependencies: [] },
          name: "module-a",
          path: modulePath,
          type: "container",
          variables: {},
          spec:
          {
            buildArgs: {},
            services:
              [{
                name: "service-a",
                command: ["echo"],
                dependencies: [],
                daemon: false,
                ingresses: [{
                  path: "/",
                  port: "http",
                }],
                env: {
                  SOME_ENV_VAR: "value",
                },
                healthCheck:
                  { httpGet: { path: "/health", port: "http", scheme: "HTTP" } },
                ports: [{ name: "http", protocol: "TCP", containerPort: 8080, servicePort: 8080 }],
                outputs: {},
                volumes: [],
              }],
            tasks:
              [{
                name: "task-a",
                command: ["echo", "OK"],
                dependencies: [],
                timeout: null,
              }],
            tests:
              [{
                name: "unit",
                command: ["echo", "OK"],
                dependencies: [],
                env: {},
                timeout: null,
              }],
          },
          serviceConfigs:
            [{
              name: "service-a",
              dependencies: [],
              outputs: {},
              spec:
              {
                name: "service-a",
                command: ["echo"],
                dependencies: [],
                daemon: false,
                ingresses: [{
                  path: "/",
                  port: "http",
                }],
                env: {
                  SOME_ENV_VAR: "value",
                },
                healthCheck:
                  { httpGet: { path: "/health", port: "http", scheme: "HTTP" } },
                ports: [{ name: "http", protocol: "TCP", containerPort: 8080, servicePort: 8080 }],
                outputs: {},
                volumes: [],
              },
            }],
          taskConfigs:
            [{
              dependencies: [],
              name: "task-a",
              spec: {
                command: [
                  "echo",
                  "OK",
                ],
                dependencies: [],
                name: "task-a",
                timeout: null,
              },
              timeout: null,
            }],
          testConfigs:
            [{
              name: "unit",
              dependencies: [],
              spec:
              {
                name: "unit",
                command: ["echo", "OK"],
                dependencies: [],
                env: {},
                timeout: null,
              },
              timeout: null,
            }],
        })
      })

      it("should fail if user specified Dockerfile not found", async () => {
        const moduleConfig = cloneDeep(baseConfig)
        moduleConfig.spec.dockerfile = "path/to/non-existing/Dockerfile"

        await expectError(
          () => validate({ ctx, moduleConfig }),
          "configuration",
        )
      })

      it("should fail with invalid port in ingress spec", async () => {
        const moduleConfig: ContainerModuleConfig = {
          allowPublish: false,
          build: {
            command: ["echo", "OK"],
            dependencies: [],
          },
          name: "module-a",
          path: modulePath,
          type: "test",
          variables: {},

          spec: {
            buildArgs: {},
            services: [{
              name: "service-a",
              command: ["echo"],
              dependencies: [],
              daemon: false,
              ingresses: [
                {
                  path: "/",
                  port: "bla",
                },
              ],
              env: {},
              ports: [],
              outputs: {},
              volumes: [],
            }],
            tasks: [{
              name: "task-a",
              command: ["echo"],
              dependencies: [],
              timeout: null,
            }],
            tests: [{
              name: "unit",
              command: ["echo", "OK"],
              dependencies: [],
              env: {},
              timeout: null,
            }],
          },

          serviceConfigs: [],
          taskConfigs: [],
          testConfigs: [],
        }

        await expectError(
          () => validate({ ctx, moduleConfig }),
          "configuration",
        )
      })

      it("should fail with invalid port in httpGet healthcheck spec", async () => {
        const moduleConfig: ContainerModuleConfig = {
          allowPublish: false,
          build: {
            command: ["echo", "OK"],
            dependencies: [],
          },
          name: "module-a",
          path: modulePath,
          type: "test",
          variables: {},

          spec: {
            buildArgs: {},
            services: [{
              name: "service-a",
              command: ["echo"],
              dependencies: [],
              daemon: false,
              ingresses: [],
              env: {},
              healthCheck: {
                httpGet: {
                  path: "/",
                  port: "bla",
                },
              },
              ports: [],
              outputs: {},
              volumes: [],
            }],
            tasks: [{
              name: "task-a",
              command: ["echo"],
              dependencies: [],
              timeout: null,
            }],
            tests: [],
          },

          serviceConfigs: [],
          taskConfigs: [],
          testConfigs: [],
        }

        await expectError(
          () => validate({ ctx, moduleConfig }),
          "configuration",
        )
      })

      it("should fail with invalid port in tcpPort healthcheck spec", async () => {
        const moduleConfig: ContainerModuleConfig = {
          allowPublish: false,
          build: {
            command: ["echo", "OK"],
            dependencies: [],
          },
          name: "module-a",
          path: modulePath,
          type: "test",
          variables: {},

          spec: {
            buildArgs: {},
            services: [{
              name: "service-a",
              command: ["echo"],
              dependencies: [],
              daemon: false,
              ingresses: [],
              env: {},
              healthCheck: {
                tcpPort: "bla",
              },
              ports: [],
              outputs: {},
              volumes: [],
            }],
            tasks: [{
              name: "task-a",
              command: ["echo"],
              dependencies: [],
              timeout: null,
            }],
            tests: [],
          },

          serviceConfigs: [],
          taskConfigs: [],
          testConfigs: [],
        }

        await expectError(
          () => validate({ ctx, moduleConfig }),
          "configuration",
        )
      })
    })

    describe("getBuildStatus", () => {
      it("should return ready:true if build exists locally", async () => {
        const module = td.object(await getTestModule(baseConfig))

        td.replace(containerHelpers, "imageExistsLocally", async () => true)

        const result = await getBuildStatus({ ctx, log, module, buildDependencies: {} })
        expect(result).to.eql({ ready: true })
      })

      it("should return ready:false if build does not exist locally", async () => {
        const module = td.object(await getTestModule(baseConfig))

        td.replace(containerHelpers, "imageExistsLocally", async () => false)

        const result = await getBuildStatus({ ctx, log, module, buildDependencies: {} })
        expect(result).to.eql({ ready: false })
      })
    })

    describe("build", () => {
      it("should pull image if image tag is set and the module doesn't container a Dockerfile", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.image = "some/image"
        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "hasDockerfile", async () => false)
        td.replace(containerHelpers, "pullImage", async () => null)
        td.replace(containerHelpers, "imageExistsLocally", async () => false)

        const result = await build({ ctx, log, module, buildDependencies: {} })

        expect(result).to.eql({ fetched: true })
      })

      it("should build image if module contains Dockerfile", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.image = "some/image"
        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "hasDockerfile", async () => true)
        td.replace(containerHelpers, "imageExistsLocally", async () => false)
        td.replace(containerHelpers, "getLocalImageId", async () => "some/image")

        const dockerCli = td.replace(containerHelpers, "dockerCli")

        const result = await build({ ctx, log, module, buildDependencies: {} })

        expect(result).to.eql({
          fresh: true,
          details: { identifier: "some/image" },
        })

        td.verify(dockerCli(module, ["build", "-t", "some/image", module.buildPath]))
      })

      it("should build image using the user specified Dockerfile path", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.dockerfile = relDockerfilePath

        td.replace(containerHelpers, "hasDockerfile", async () => true)

        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "imageExistsLocally", async () => false)
        td.replace(containerHelpers, "getLocalImageId", async () => "some/image")

        const dockerCli = td.replace(containerHelpers, "dockerCli")

        const result = await build({ ctx, log, module, buildDependencies: {} })

        expect(result).to.eql({
          fresh: true,
          details: { identifier: "some/image" },
        })

        const cmdArgs = [
          "build",
          "-t",
          "some/image",
          "--file",
          join(module.buildPath, relDockerfilePath),
          module.buildPath,
        ]
        td.verify(dockerCli(module, cmdArgs))
      })
    })

    describe("publishModule", () => {
      it("should not publish image if module doesn't container a Dockerfile", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.image = "some/image"
        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "hasDockerfile", async () => false)

        const result = await publishModule({ ctx, log, module, buildDependencies: {} })
        expect(result).to.eql({ published: false })
      })

      it("should publish image if module contains a Dockerfile", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.image = "some/image:1.1"
        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "hasDockerfile", async () => true)
        td.replace(containerHelpers, "getLocalImageId", async () => "some/image:12345")
        td.replace(containerHelpers, "getPublicImageId", async () => "some/image:12345")

        const dockerCli = td.replace(containerHelpers, "dockerCli")

        const result = await publishModule({ ctx, log, module, buildDependencies: {} })
        expect(result).to.eql({ message: "Published some/image:12345", published: true })

        td.verify(dockerCli(module, ["tag", "some/image:12345", "some/image:12345"]), { times: 0 })
        td.verify(dockerCli(module, ["push", "some/image:12345"]))
      })

      it("should tag image if remote id differs from local id", async () => {
        const config = cloneDeep(baseConfig)
        config.spec.image = "some/image:1.1"
        const module = td.object(await getTestModule(config))

        td.replace(containerHelpers, "hasDockerfile", async () => true)
        td.replace(containerHelpers, "getLocalImageId", () => "some/image:12345")
        td.replace(containerHelpers, "getPublicImageId", () => "some/image:1.1")

        const dockerCli = td.replace(containerHelpers, "dockerCli")

        const result = await publishModule({ ctx, log, module, buildDependencies: {} })
        expect(result).to.eql({ message: "Published some/image:1.1", published: true })

        td.verify(dockerCli(module, ["tag", "some/image:12345", "some/image:1.1"]))
        td.verify(dockerCli(module, ["push", "some/image:1.1"]))
      })
    })
  })
})
