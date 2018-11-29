import React from "react"

import { GetLogResult } from "../api"

interface Props {
  logs: GetLogResult
}

const Logs: React.SFC<Props> = ({ logs }) => {
  console.log(logs)
  return (
    <div>
    {logs.map((log, idx) => (
      <p key={idx}>{log.msg}</p>
    ))}
    </div>
  )
}

export default Logs
