import cls from "classnames"
import { css } from "emotion/macro"
import React, { Component } from "react"

import { H3 } from "../components/text"
import Spinner from "../components/spinner"

import { colors } from "../styles/variables"

interface Props<T> {
  children: (data: { data: T }) => JSX.Element
  fetchFn: (...any) => Promise<T>
  parameters?: any[]
}

interface State<T> {
  error: any
  isLoaded: boolean
  result: T
}

// TODO Style me!
const ErrorMsg = ({ error }) => {
  const suggestion = error.response.status === 500
    ? <p>Are you sure Garden server is running? You can run it with:<p><code>garden serve</code></p></p>
    : ""
  return (
    <div className={cls(css`
      text-align: center;
    `, "p-2")}>
      <H3 color={colors.gardenPink}>
        Whoops, something went wrong.
      </H3>
      <p>Messsage: {error.message}</p>
      {suggestion}
    </div>
  )
}

class DataContainer<T> extends Component<Props<T>, State<T>> {

  constructor(props) {
    super(props)
    this.state = {
      error: null,
      isLoaded: false,
      result: null,
    }
  }

  componentDidMount() {
    // TODO Fetch function parameter? Currently we can just wrap the function.
    this.props.fetchFn()
      .then(
        result => {
          console.log(result)
          this.setState({
            isLoaded: true,
            result,
          })
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        error => {
          this.setState({
            isLoaded: true,
            error,
          })
        },
      )
  }

  render() {
    const { error, isLoaded, result } = this.state
    if (error) {
      return <ErrorMsg error={error} />
    } else if (!isLoaded) {
      return <Spinner />
    } else {
      return <div>{this.props.children({ data: result })}</div>
    }
  }
}

export default DataContainer
