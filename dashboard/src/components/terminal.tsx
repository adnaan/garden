import styled from "@emotion/styled/macro"
import { padEnd } from "lodash"
import React from "react"

import Card from "./card"
import { colors } from "../styles/variables"
import { ServiceLogEntry } from "../api"

interface Props {
  entries: ServiceLogEntry[]
  sectionPad: number
  title: string
  showServiceName: boolean
}

const Term = styled.div`
  background-color: ${colors.lightBlack};
  border-radius: 2px;
  max-height: 30rem;
  overflow-y: auto;
`

const P = styled.p`
  color: ${colors.white};
  font-size: 0.8rem;
`

const Service = styled.span`
  color: ${colors.brightTealAccent};
  display: inline-block;
`

const Timestamp = styled.span`
  color: ${colors.lightGray};
`

// FIXME Use whitespace instead of dots for the sectinon padding.
// For some reason whitespace is not rendered inside spans.
const Terminal: React.SFC<Props> = ({ entries, sectionPad, showServiceName, title }) => {
  return (
    <Card title={title}>
      <Term className="p-1">
        <code>
          {entries.map((e, idx) => {
            const service = showServiceName
              ? <Service>{padEnd(e.serviceName, sectionPad + 3, ".")}</Service>
              : ""
            return (
              <P key={idx}>
                {service}
                <Timestamp>[{e.timestamp}] </Timestamp>
                {e.msg}
              </P>
            )
          })}
        </code>
      </Term>
    </Card>
  )
}

export default Terminal
