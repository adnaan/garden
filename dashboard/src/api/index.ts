import axios from "axios"

export interface DashboardPage {
  title: string
  description: string
  url: string
  newWindow: boolean
  // TODO: allow nested sections
  // children: DashboardPage[]
}

interface Provider {
  name: string
  dashboardPages: DashboardPage
}

export interface GetConfigResult {
  environmentName: string
  providers: Provider[]
}

export interface ServiceLogEntry {
  serviceName: string
  timestamp: Date
  msg: string
}

export type GetLogResult = ServiceLogEntry[]

export type ApiResponse<T> = T

export type Fetch<T> = (...any) => Promise<ApiResponse<T>>

export async function getConfig(): Promise<ApiResponse<GetConfigResult>> {
  console.log("getting config")
  return apiPost<GetConfigResult>("get.config")
}

export async function getLogs(services?: string[]): Promise<ApiResponse<GetLogResult>> {
  console.log("getting logs", services)
  const params = services ? { service: services } : {}
  return apiPost<GetLogResult>("logs", params)
}

export async function apiPost<T>(command: string, parameters: {} = {}): Promise<ApiResponse<T>> {
  const url = "http://localhost:9777/api"
  const method = "POST"
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  }

  const res = await axios({
    url,
    method,
    headers,
    data: {
      command,
      parameters,
    },
  })

  console.log(res.data)
  return res.data.result
}
