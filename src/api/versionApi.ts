import type { ApiResponse } from '../types/auth'
import httpClient, { unwrapApiData } from '../services/httpClient'

export type BackendVersion = {
  version: string | null
  fechaCompilacion: string | null
  fechaServidorAhora: string | null
}

export const fetchBackendVersion = async (): Promise<BackendVersion> => {
  const { data } = await httpClient.get<ApiResponse<BackendVersion>>('/version')
  return unwrapApiData(data)
}
