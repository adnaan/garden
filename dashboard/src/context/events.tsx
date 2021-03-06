/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React from "react"

import { WsMessage } from "../api/types"
import WsContainer from "../containers/ws-container"

type Context = { message?: WsMessage }
const EventContext = React.createContext<Context | null>(null)

const EventConsumer = EventContext.Consumer

const EventProvider = ({ children }) => (
  <WsContainer>
    {({ message }) => (
      <EventContext.Provider value={{ message }}>
        {children}
      </EventContext.Provider>
    )}
  </WsContainer>
)

export { EventProvider, EventConsumer }
