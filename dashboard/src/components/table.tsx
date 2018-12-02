import styled from "@emotion/styled/macro"
import React from "react"

import Card from "./card"

import { colors } from "../styles/variables"

interface Props {
  title: string
  rowHeaders: string[]
  rows: string[][]
}

const colStyle = `
  padding: 1em 0.75em;
  border-top: 1px solid ${colors.border};
`

const Td = styled.td`
  ${colStyle}
`

const THead = styled.thead`
  text-align: left;
`

const Th = styled.th`
  ${colStyle}
`

const TableEl = styled.table`
  border-collapse: collapse;
  width: 100%;
`

const Table: React.SFC<Props> = props => (
  <Card title={props.title}>
    <TableEl>
      <THead>
        <tr>
          {props.rowHeaders.map(header => (
            <Th key={header}>{header}</Th>
          ))}
        </tr>
      </THead>
      <tbody>
        {props.rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((col, cidx) => (
              <Td key={cidx}>{col}</Td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableEl>
  </Card>
)

export default Table
