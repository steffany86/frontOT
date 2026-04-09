import type { ApiResponse } from '../types/auth'
import type { PrivilegiosRolDetalle, Rol } from '../types/permisos'
import httpClient, { unwrapApiData } from './httpClient'

export const fetchRolesPrivilegios = async (): Promise<Rol[]> => {
  const { data } = await httpClient.get<ApiResponse<Rol[]>>('/admin/privilegios/roles')
  return unwrapApiData(data)
}

export const fetchPrivilegiosRolDetalle = async (idRol: number): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.get<ApiResponse<PrivilegiosRolDetalle>>(`/admin/privilegios/roles/${idRol}/menu`)
  return unwrapApiData(data)
}

export const updatePrivilegiosRolMenu = async (idRol: number, menuIds: number[]): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.put<ApiResponse<PrivilegiosRolDetalle>>(`/admin/privilegios/roles/${idRol}/menu`, {
    menuIds,
  })
  return unwrapApiData(data)
}

export const applySupervisorCuadrillasPreset = async (idRol: number): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.put<ApiResponse<PrivilegiosRolDetalle>>(
    `/admin/privilegios/roles/${idRol}/preset/supervisor-cuadrillas`
  )
  return unwrapApiData(data)
}
