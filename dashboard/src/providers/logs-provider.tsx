import React from "react"

import { getLogs, GetLogResult } from "../api"
import DataContainer from "./data-container"

type Context = { logs: GetLogResult }
const LogContext = React.createContext<Context | null>(null)

export const LogConsumer = LogContext.Consumer

// Needed to make a generic React component.
// See: https://github.com/Microsoft/TypeScript/issues/3960#issuecomment-165330151
type LogsDataContainer = new () => DataContainer<GetLogResult>
const LogsDataContainer = DataContainer as LogsDataContainer

const LogsProvider = ({ children }) => (
  <LogsDataContainer fetchFn={getLogs}>
    {({ data: logs }) => (
      <LogContext.Provider value={{ logs }}>
        {children}
      </LogContext.Provider>
    )}
  </LogsDataContainer>
)

export default LogsProvider
