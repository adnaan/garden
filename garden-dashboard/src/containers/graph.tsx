/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React, { useContext } from "react"

import { ConfigContext } from "../context/config"

import { fetchGraph } from "../api"
// tslint:disable-next-line:no-unused (https://github.com/palantir/tslint/issues/4022)
import { FetchGraphResponse } from "../api/types"

import Graph from "../components/graph"
import PageError from "../components/page-error"
import { EventContext } from "../context/events"
import LoadContainer from "./load-container"
import { useFetch } from "../util/use-fetch"

export default () => {
  const { config } = useContext(ConfigContext)
  const { message } = useContext(EventContext)
  const { data: graph, loading, error } = useFetch<FetchGraphResponse>(fetchGraph)

  return (
    <LoadContainer error={error} ErrorComponent={PageError} loading={loading}>
      <Graph message={message} config={config} graph={graph} />
    </LoadContainer>
  )
}
