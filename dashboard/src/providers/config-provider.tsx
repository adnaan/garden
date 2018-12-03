import React from "react"

import { fetchConfig, GetConfigResult } from "../api"
import DataContainer from "./data-container"

type Context = { config: GetConfigResult }
const ConfigContext = React.createContext<Context | null>(null)

export const ConfigConsumer = ConfigContext.Consumer

// Needed to make a generic React component.
// See: https://github.com/Microsoft/TypeScript/issues/3960#issuecomment-165330151
type ConfigDataContainer = new () => DataContainer<GetConfigResult>
const ConfigDataContainer = DataContainer as ConfigDataContainer

const ConfigProvider = ({ children }) => (
  <ConfigDataContainer fetchFn={fetchConfig}>
    {({ data: config }) => (
      <ConfigContext.Provider value={{ config }}>
        {children}
      </ConfigContext.Provider>
    )}
  </ConfigDataContainer>
)

export default ConfigProvider
