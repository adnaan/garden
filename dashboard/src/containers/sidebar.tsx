import React from "react"

import { ConfigConsumer } from "../providers/config-provider"
import Sidebar from "../components/sidebar"

export default () => (
  <ConfigConsumer>
    {({ config }) => {
      // FIXME: Property 'flatMap' does not exist on type...
      // @ts-ignore
      const pages = config.providers.flatMap(p => p.dashboardPages)
      return <Sidebar dashboardPages={pages} />
    }}
  </ConfigConsumer>
)
