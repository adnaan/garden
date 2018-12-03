import React from "react"

import { ConfigConsumer } from "../providers/config-provider"
import LogsProvider, { LogConsumer } from "../providers/logs-provider"

import Logs from "../components/logs"

export default () => (
  <LogsProvider>
    <ConfigConsumer>
      {({ config }) => (
        <LogConsumer>
          {({ logs }) => (
            <Logs config={config} logs={logs} />
          )}
        </LogConsumer>
      )}
    </ConfigConsumer>
  </LogsProvider>
)
