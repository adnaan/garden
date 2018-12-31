/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React, { useContext } from "react"

import { ConfigContext } from "../context/config"

import { fetchLogs } from "../api"
// tslint:disable-next-line:no-unused (https://github.com/palantir/tslint/issues/4022)
import { FetchLogResponse } from "../api/types"

import Logs from "../components/logs"
import PageError from "../components/page-error"
import { useFetch } from "../util/use-fetch"
import LoadContainer from "./load-container"

export default () => {
  const { config } = useContext(ConfigContext)
  const { data: logs, loading, error } = useFetch<FetchLogResponse>(fetchLogs)

  return (
    <LoadContainer error={error} ErrorComponent={PageError} loading={loading}>
      <Logs config={config} logs={logs} />
    </LoadContainer>
  )
}
