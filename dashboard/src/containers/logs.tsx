import React from "react"

import LogsProvider, { LogConsumer } from "../providers/logs-provider"

import Logs from "../components/logs"

export default () => (
  <LogsProvider>
    <LogConsumer>
      {({ logs }) => (
        <Logs logs={logs} />
      )}
    </LogConsumer>
  </LogsProvider>
)
