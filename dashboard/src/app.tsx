import React from "react"
import { BrowserRouter as Router, Route } from "react-router-dom"

import Sidebar from "./components/sidebar"
import Header from "./components/header"

const Index = () => <h2>Home</h2>
const Graph = () => <h2>Graph</h2>
const Logs = () => <h2>Logs</h2>

const App = () => (
  <Router>
    <div className="App">
      <Sidebar />
      <Header />
      <Route path="/" exact component={Index} />
      <Route path="/about/" component={Graph} />
      <Route path="/users/" component={Logs} />
    </div>
  </Router>
)

export default App
