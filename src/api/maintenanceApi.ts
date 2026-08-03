import type { ApiResponse } from '../types/auth'
import httpClient, { unwrapApiData } from '../services/httpClient'

export type MaintenanceStatus = {
  active: boolean
  message: string
  changedBy?: string
  changedAt?: string
}

export type MaintenanceCredentials = {
  usuario: string
  password: string
  message?: string
}

export const fetchMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const { data } = await httpClient.get<ApiResponse<MaintenanceStatus>>('/system/maintenance/status')
  return unwrapApiData(data)
}

export const activarMaintenance = async (payload: MaintenanceCredentials): Promise<MaintenanceStatus> => {
  const { data } = await httpClient.post<ApiResponse<MaintenanceStatus>>('/system/maintenance/on', payload)
  return unwrapApiData(data)
}

export const desactivarMaintenance = async (payload: MaintenanceCredentials): Promise<MaintenanceStatus> => {
  const { data } = await httpClient.post<ApiResponse<MaintenanceStatus>>('/system/maintenance/off', payload)
  return unwrapApiData(data)
}
