import { css } from "emotion/macro"
import React from "react"
import { BrowserRouter as Router, Route, RouteComponentProps } from "react-router-dom"
import * as H from "history"

import ConfigProvider from "./providers/config-provider"

import Logs from "./containers/logs"
import Sidebar from "./containers/sidebar"

import Header from "./components/header"

import { DashboardPage } from "./api"

const Index = () => <h2>Home</h2>

const App = () => (
  <Router>
    <div className="App">
      <ConfigProvider>
        <div className={css`
          border: 1px solid red;
          display: flex;
        `}>
          <Sidebar />
          <div className={css`
              border: 1px solid blue;
              display: flex;
              flex-direction: column;
              flex-grow: 1;
            `}>
            <Header />
            <div className={css`
              border: 1px solid yellow;
            `}>
              <Route exact path="/" component={Index} />
              <Route path="/logs/" component={Logs} />
              <Route path="/provider/:id" component={Provider} />
            </div>
          </div>
        </div>
      </ConfigProvider>
    </div>
  </Router>
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
