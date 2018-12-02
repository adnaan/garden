import styled from "@emotion/styled/macro"
import React from "react"

import { colors } from "../styles/variables"

const Wrapper = styled.div`
  border-bottom: 1px solid ${colors.border};
`

export default () => (
  <Wrapper className="p-1">
    <p>Header // TODO</p>
    <nav>
      <ul>
        <li>
        </li>
      </ul>
    </nav>
  </Wrapper>
)
