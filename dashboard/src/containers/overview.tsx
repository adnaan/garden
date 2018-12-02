import React from "react"

import { ConfigConsumer } from "../providers/config-provider"
import Overview from "../components/overview"

export default () => (
  <ConfigConsumer>
    {({ config }) => {
      // FIXME: Property 'flatMap' does not exist on type...
      // @ts-ignore
      return <Overview config={config} />
    }}
  </ConfigConsumer>
)
/*
result:
environmentName: "local"
modules: Array(2)
0:
allowPublish: true
build: {dependencies: Array(0), command: Array(0)}
buildPath: "/Users/eysi/go/src/github.com/garden-io/garden/examples/simple-project/.garden/build/go-service"
description: "Go service container"
name: "go-service"
path: "/Users/eysi/go/src/github.com/garden-io/garden/examples/simple-project/services/go-service"
serviceConfigs: [{…}]
serviceDependencyNames: []
serviceNames: ["go-service"]
services: Array(1)
0:
config:
dependencies: []
name: "go-service"
outputs: {}
spec: {name: "go-service", ports: Array(1), ingresses: Array(1), dependencies: Array(0), outputs: {…}, …}
__proto__: Object
name: "go-service"
spec:
daemon: false
dependencies: []
env: {}
ingresses: Array(1)
0: {path: "/hello-go", port: "http"}
length: 1
__proto__: Array(0)
*/
