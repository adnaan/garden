import React, { Component } from "react"
import { ApiResponse } from "../api"

import Spinner from "../components/spinner"

interface Props<T> {
  children: (data: { data: T }) => JSX.Element
  fetchFn: (...any) => Promise<ApiResponse<T>>
  parameters?: any[]
}

interface State<T> {
  error: any
  isLoaded: boolean
  result: ApiResponse<T>
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
    // TODO Handle fetch function parameter
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
      return <div>Error: {error.message}</div>
    } else if (!isLoaded) {
      return <Spinner />
    } else {
      return <div>{this.props.children({ data: result })}</div>
    }
  }
}

export default DataContainer
