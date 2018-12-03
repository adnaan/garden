import React from "react"
import { NavLink } from "react-router-dom"

import { colors } from "../styles/variables"

export default props => (
  <NavLink {...props} activeStyle={{ color: colors.gardenPink}} />
)
