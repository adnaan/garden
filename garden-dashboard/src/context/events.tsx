/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React from "react"

import { WsMessage } from "../api/types"
import { useWs } from "../util/use-ws"

type Context = { message?: WsMessage }

export const EventContext = React.createContext<Context | null>(null)

export const EventProvider: React.SFC = ({ children }) => {
  const { message } = useWs()

  return (
    <EventContext.Provider value={{ message }}>
      {children}
    </EventContext.Provider>
  )
}
