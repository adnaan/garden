import styled from "@emotion/styled/macro"
import React from "react"

import { H2 } from "./text"
import { colors } from "../styles/variables"

const Wrapper = styled.div`
  border-bottom: 1px solid ${colors.border};
`

const Title = styled(H2)`
  margin-bottom: 0;
`

export default () => (
  <Wrapper className="pl-2 pt-1 pb-1">
    <Title>Dashboard</Title>
    <nav>
      <ul>
        <li>
        </li>
      </ul>
    </nav>
  </Wrapper>
)
