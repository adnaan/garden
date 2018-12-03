import cls from "classnames"
import { css } from "emotion/macro"
import React from "react"
import { Route, RouteComponentProps } from "react-router-dom"
import * as H from "history"

import Logs from "./containers/logs"
import Overview from "./containers/overview"
import Sidebar from "./containers/sidebar"

import Header from "./components/header"

import { DashboardPage } from "./api"
import { colors } from "./styles/variables"
import "flexboxgrid/dist/flexboxgrid.min.css"
import "./styles/padding-margin-mixin.scss"

const App = () => (
  <div>
    <div className={css`
          display: flex;
          min-height: 100vh;
        `}>
      <Sidebar />
      <div className={css`
              display: flex;
              flex-direction: column;
              flex-grow: 1;
            `}>
        <Header />
        <div className={cls(css`
              background-color: ${colors.lightGray};
              flex-grow: 1;
            `, "p-2")}>
          <Route exact path="/" component={Overview} />
          <Route path="/logs/" component={Logs} />
          <Route path="/provider/:id" component={Provider} />
        </div>
      </div>
    </div>
  </div>
)

interface RoutePropsWithState extends RouteComponentProps {
  location: H.Location<DashboardPage>
}

const Provider: React.SFC<RoutePropsWithState> = props => {
  const page = props.location.state
  return (
    <div>
      <h2>Provider</h2>
      <p>Url is {page.url}</p>
    </div>
  )
}

export default App
