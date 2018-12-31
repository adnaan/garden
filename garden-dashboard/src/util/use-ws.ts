/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from "react"
import { WsMessage } from "../api/types"
import getApiUrl from "../api/get-api-url"

interface WsOutput {
  message: WsMessage | null
}

export function useWs(): WsOutput {
  const [data, setData] = useState<WsOutput | null>(null)
  useEffect(() => {
    const url = getApiUrl()
    const ws = new WebSocket(`ws://${url}/ws`)

    ws.onopen = event => {
      console.log("ws open", event)
    }
    ws.onclose = event => {
      // TODO
      console.log("ws close", event)
    }
    ws.onmessage = msg => {
      const message = JSON.parse(msg.data) as WsMessage

      // TOOD
      if (message.type === "error") {
        console.error(message)
      }

      if (message.type === "event") {
        console.log(message)
        setData({ message })
      }
    }
    return function cleanUp() {
      console.log("ws cleanup")
      ws.close()
    }
  }, [])

  const wsMessage = data ? data.message : null

  return { message: wsMessage }
}
