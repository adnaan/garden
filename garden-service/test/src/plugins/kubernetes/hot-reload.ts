import { expect } from "chai"

import { removeTrailingSlashes, makeCopyCommands } from "../../../../src/plugins/kubernetes/hot-reload"

describe("removeTrailingSlashes", () => {
  const paths = [
    ["/foo/bar", "/foo/bar"],
    ["/foo/bar/", "/foo/bar"],
    ["/foo", "/foo"],
    ["/foo/", "/foo"],
    ["/foo/bar//", "/foo/bar"],
  ]

  for (const path of paths) {
    it(`handles paths correctly for ${path[0]}`, () => {
      expect(removeTrailingSlashes(path[0])).to.eql(path[1])
    })
  }
})

describe("makeCopyCommands", () => {
  // Test cases for each type
  const configs: any[] = [
    // Source is missing slash
    [
      [{ source: "src", target: "/app/src" }],
      "mkdir -p /.garden/hot_reload/app/src/ && cp -r src/. /.garden/hot_reload/app/src/",
    ],
    // Source ends on slash
    [
      [{ source: "src/", target: "/app/src" }],
      "mkdir -p /.garden/hot_reload/app/src/ && cp -r src/. /.garden/hot_reload/app/src/",
    ],
    // Base root of the module
    [
      [{ source: ".", target: "/app" }],
      "mkdir -p /.garden/hot_reload/app/ && cp -r ./. /.garden/hot_reload/app/",
    ],
    // Subdirectory not ending on a slash
    [
      [{ source: "src/foo", target: "/app/foo" }],
      "mkdir -p /.garden/hot_reload/app/foo/ && cp -r src/foo/. /.garden/hot_reload/app/foo/",
    ],
    // Multiple pairs
    [
      [
        { source: "src1", target: "/app/src1" },
        { source: "src2", target: "/app/src2" },
      ],
      "mkdir -p /.garden/hot_reload/app/src1/ && cp -r src1/. /.garden/hot_reload/app/src1/ && " +
      "mkdir -p /.garden/hot_reload/app/src2/ && cp -r src2/. /.garden/hot_reload/app/src2/",
    ],
  ]
  for (const config of configs) {
    it("correctly generates copy commands for the hot reload init container", () => {
      expect(makeCopyCommands(config[0])).to.eql(config[1])
    })
  }
})
