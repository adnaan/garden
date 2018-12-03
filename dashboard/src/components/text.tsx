import styled from "@emotion/styled/macro"
import { colors, fontRegular } from "../styles/variables"

export const H2 = styled.h2`
  ${fontRegular};
  font-size: 2rem;
  line-height: 3.5rem;
  color: ${props => props.color || colors.lightBlack};
  margin: 0 0 2rem 0;
`

export const H3 = styled.h3`
  ${fontRegular};
  font-size: 1.75rem;
  line-height: 3.2rem;
  color: ${props => props.color || colors.lightBlack};
  margin: 0 0 2rem 0;
`
