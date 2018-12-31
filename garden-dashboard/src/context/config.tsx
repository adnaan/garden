/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React from "react"

import { fetchConfig } from "../api"
import { FetchConfigResponse } from "../api/types"
import LoadContainer from "../containers/load-container"
import { useFetch } from "../util/use-fetch"

const ErrorMsg = () => <p>Error loading project configuration. Please try refreshing the page.</p>

type Context = { config: FetchConfigResponse }

export const ConfigContext = React.createContext<Context | null>(null)

export const ConfigProvider: React.SFC = ({ children }) => {
  const { data: config, loading, error } = useFetch<FetchConfigResponse>(fetchConfig)

  return (
    <ConfigContext.Provider value={{ config }}>
      <LoadContainer error={error} ErrorComponent={ErrorMsg} loading={loading}>
        {children}
      </LoadContainer>
    </ConfigContext.Provider>
  )
}
