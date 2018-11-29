import styled from "@emotion/styled/macro"
import React, { Component } from "react"

import { DashboardPage } from "../api"
import NavLink from "./nav-link"

interface Props {
  dashboardPages: DashboardPage[]
}

interface State {
  selectedTab: string | null
}

const Wrapper = styled.div`
  border: 1px solid black;
  min-width: 12rem;
  height: 100vh;
  width: 20vw;
`

class Sidebar extends Component<Props, State> {

  constructor(props) {
    super(props)

    this.state = {
      selectedTab: "First builtin tab",
    }
  }

  render() {
    return (
      <Wrapper>
        <h1>Side bar</h1>
        <nav>
          <ul>
            <li>
              <NavLink exact to="/" title="overview">Overview</NavLink>
            </li>
            <li>
              <NavLink to="/logs" title="logs">Logs</NavLink>
            </li>
            {this.props.dashboardPages.map(page => (
              <li key={page.title}>
                <NavLink
                  to={{ pathname: `/provider/${page.title}`, state: page }}
                  title={page.description}>{page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </Wrapper>
    )
  }

}

export default Sidebar
