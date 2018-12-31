/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from "react"

interface FetchOutput<T> {
  loading: boolean
  data: T | null
  error: Error | null
}

type FetchFn<T> = (...any) => Promise<T>

export function useFetch<T>(fetchFn: FetchFn<T>): FetchOutput<T> {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetchFn()
        console.log("GOT RES", res)
        setData(res)
        // if (response.ok) {
        //   const res = await response.json()
        //   setData(res)
        // } else {
        //   setError(new Error(response.statusText))
        // }
      } catch (e) {
        setError(e)
      }
      setLoading(false)
    })()
  }, [fetchFn])

  return { error, loading, data }
}
