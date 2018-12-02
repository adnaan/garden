import styled from "@emotion/styled/macro"
import React, { Component } from "react"

import { H2 } from "./text"
import NavLink from "./nav-link"
import { Page } from "../containers/sidebar"

import { colors } from "../styles/variables"

interface Props {
  pages: Page[]
}

interface State {
  selectedTab: string
}

// color: rgb(224, 224, 224)
    // background-color: rgba(0, 159, 255, 0.098);

const Wrapper = styled.div`
  background-color: rgb(36, 40, 42);
  border-right: 1px solid ${colors.border};
  color: rgb(204, 204, 204);
  min-width: 12rem;
  width: 16vw;
  max-width: 19rem;
  height: 100vh;
`

const Button = styled.li`
  border-radius: 2px;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
  &: hover {
    background-color: rgba(255, 228, 194, 0.2);
    color: rgb(224, 224, 224);
    border-color: rgb(0, 94, 153);
  }
`

const Link = styled(NavLink)`
  display: inline-block;
  margin-left: 1rem;
  padding: 0.5em 0.5em 0.5em 0;
  width: 100%;
`

class Sidebar extends Component<Props, State> {

  constructor(props) {
    super(props)

    // TODO Use tab id instead of title
    this.state = {
      selectedTab: this.props.pages[0].path,
    }
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick(event) {
    this.setState({ selectedTab: event.target.path })
  }

  render() {
    return (
      <Wrapper className="pt-1 pb-1">
        <div className="ml-1">
          <NavLink to="/">
            <H2 color={colors.white}>Garden</H2>
          </NavLink>
        </div>
        <nav>
          <ul>
            {this.props.pages.map(page => (
                <Button tabName={name} onClick={this.handleClick} key={page.title}>
                  <Link
                    exact
                    to={{ pathname: page.path, state: page }}
                    title={page.description}>{page.title}
                  </Link>
                </Button>
              ),
            )}
          </ul>
        </nav>
      </Wrapper>
    )
  }

}

export default Sidebar
