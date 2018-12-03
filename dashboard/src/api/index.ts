import axios from "axios"

// TODO: Better type handling

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
  dashboardPages: DashboardPage[]
}

interface Service {
  config: any
  name: string
  spec: any
}

export interface Module {
  buildPath: string
  // version: ModuleVersion

  services: Service[]
  serviceNames: string[]
  serviceDependencyNames: string[]

  // tasks: Task<Module<M, S, T, W>>[]
  taskNames: string[]
  taskDependencyNames: string[]

  // _ConfigType: ModuleConfig<M, S, T, W>
}

export interface GetConfigResult {
  environmentName: string
  providers: Provider[]
  modules: Module[]
}

export interface ServiceLogEntry {
  serviceName: string
  timestamp: Date
  msg: string
}

export type GetLogResult = ServiceLogEntry[]

export interface ApiRequest {
  command: string
  parameters: {}
}

export async function fetchConfig(): Promise<GetConfigResult> {
  return apiPost<GetConfigResult>("get.config")
}

export async function fetchLogs(services?: string[]): Promise<GetLogResult> {
  const params = services ? { service: services } : {}
  return apiPost<GetLogResult>("logs", params)
}

async function apiPost<T>(command: string, parameters: {} = {}): Promise<T> {
  const url = "/api"
  const method = "POST"
  const headers = {
    "Content-Type": "application/json",
  }
  const data: ApiRequest = { command, parameters }

  const res = await axios({ url, method, headers, data })

  console.log(res.data)
  return res.data.result
}
