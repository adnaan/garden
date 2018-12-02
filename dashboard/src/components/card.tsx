import styled from "@emotion/styled/macro"
import React from "react"

import { colors, fontRegular } from "../styles/variables"

interface CardProps {
  children: JSX.Element
  title: string
}

const Wrapper = styled.div`
  background-color: ${colors.white};
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
`

const Title = styled.h3`
  ${fontRegular};
  font-size: 1.3rem;
  margin: 0;
`

const Card: React.SFC<CardProps> = ({ children, title }) => (
  <Wrapper className="pt-1">
    <div className="pl-1 pr-1 mb-1">
      <Title>{title}</Title>
    </div>
    {children}
  </Wrapper>
)

// interface CardWithSelectProps {
//   children: JSX.Element
//   onSelect: () => string
//   titles: string[]
// }
//
// export const CardWithSelect: React.SFC<CardWithSelectProps> = ({ children, onSelect, titles }) => {
//   return (
//     <Wrapper className="pt-1">
//       <div className="pl-1 pr-1 mb-1">
//         <Title>{titles}</Title>
//       </div>
//       {children}
//     </Wrapper>
//   )
// }

export default Card
