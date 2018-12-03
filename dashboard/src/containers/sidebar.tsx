import { flatten, kebabCase } from "lodash"
import React from "react"

import { ConfigConsumer } from "../providers/config-provider"
import Sidebar from "../components/sidebar"
import { DashboardPage } from "../api"

export interface Page extends DashboardPage {
  path: string
}

const builtinPages: Page[] = [
  {
    title: "Overview",
    description: "Overview",
    path: "/",
    newWindow: false,
    url: "",
  },
  {
    title: "Logs",
    description: "Logs",
    path: "/logs",
    newWindow: false,
    url: "",
  },
]

export default () => (
  <ConfigConsumer>
    {({ config }) => {
      // FIXME typecast
      const pages = flatten(config.providers.map(p => p.dashboardPages)).map(p => {
        p["path"] = `/provider/${kebabCase(p.title)}`
        return p as Page
      })
      return <Sidebar pages={[...builtinPages, ...pages]} />
    }}
  </ConfigConsumer>
)
