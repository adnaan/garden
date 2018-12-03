import { flatten } from "lodash"
import React from "react"

import Table from "./table"

import { GetConfigResult } from "../api"

interface Props {
  config: GetConfigResult
}

const Overview: React.SFC<Props> = ({ config }) => {
  const services = flatten(config.modules.map(m => m.services))
  return (
    <div>
      <Services services={services} />
    </div>
  )
}

const Services = ({ services }) => {
  const rowHeaders = ["Name", "Status", "Endpoints"]
  const rows = services.map(s => [
    s.name,
    s.status || "Running",
    s.spec.ingresses.map(i => i.path).join("\n"),
  ])
  return (
    <Table
      title="Services"
      rowHeaders={rowHeaders}
      rows={rows}
    />
  )
}

export default Overview
