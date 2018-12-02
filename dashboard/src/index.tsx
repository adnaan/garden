import React from "react"
import ReactDOM from "react-dom"
import { BrowserRouter as Router } from "react-router-dom"
import * as serviceWorker from "./serviceWorker"

import App from "./app"
import ConfigProvider from "./providers/config-provider"
import GlobalStyle from "./components/global-style"

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()

// Hoist Router and ConfigProvider for smoother hot reloading (hot module replacement)
const rootEl = document.getElementById("root")
const render = Component => ReactDOM.render(
  <Router>
    <div>
      <GlobalStyle />
      <ConfigProvider>
        <Component />
      </ConfigProvider>
    </div>
  </Router>,
  rootEl,
)

render(App)

// Enable hot module replacement
// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.accept("./app", () => {
    const NextApp = require("./app").default
    render(NextApp)
  })
}
