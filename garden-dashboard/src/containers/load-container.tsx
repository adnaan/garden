/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React from "react"

import Spinner from "../components/spinner"

interface LoadContainerProps {
  error: Error
  loading: boolean
  ErrorComponent: React.SFC<any> | React.ComponentClass<any>
  skipSpinner?: boolean
}

const LoadContainer: React.SFC<LoadContainerProps> = props => {
  const { error, children, loading, ErrorComponent, skipSpinner } = props
  if (error) {
    return <ErrorComponent error={error} />
  } else if (loading) {
    return skipSpinner ? null : <Spinner />
  } else {
    return <div>{children}</div>
  }
}

export default LoadContainer
