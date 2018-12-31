/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React from "react"

import { fetchStatus } from "../api"
import { FetchStatusResponse } from "../api/types"
import LoadContainer from "../containers/load-container"
import { useFetch } from "../util/use-fetch"

type Context = { status: FetchStatusResponse }
const ErrorMsg = () => <p>Error retrieving status</p>

export const StatusContext = React.createContext<Context | null>(null)

export const StatusProvider: React.SFC = ({ children }) => {
  const { data: status, loading, error } = useFetch<FetchStatusResponse>(fetchStatus)

  return (
    <StatusContext.Provider value={{ status }}>
      <LoadContainer error={error} ErrorComponent={ErrorMsg} loading={loading}>
        {children}
      </LoadContainer>
    </StatusContext.Provider>
  )
}
