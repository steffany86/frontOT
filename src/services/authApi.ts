import type { ApiResponse, AuthMeResponse, LoginRequest, SessionData, Sucursal } from '../types/auth'
import type { PermisosUsuario } from '../types/permisos'
import httpClient, { unwrapApiData } from './httpClient'
import { fetchMe as fetchMeLegacy, fetchSucursales as fetchSucursalesLegacy, login as loginLegacy } from '../api/authApi'

export const login = (payload: LoginRequest): Promise<SessionData> => {
  return loginLegacy(payload)
}

export const fetchSucursales = (): Promise<ApiResponse<Sucursal[]>> => {
  return fetchSucursalesLegacy()
}

export const fetchMe = (sessionToken?: string): Promise<AuthMeResponse> => {
  return fetchMeLegacy(sessionToken)
}

export const fetchPermisos = async (sessionToken?: string): Promise<PermisosUsuario> => {
  const { data } = await httpClient.get<ApiResponse<PermisosUsuario>>('/auth/permisos', {
    headers: sessionToken ? { 'X-Session-Token': sessionToken } : undefined,
  })
  return unwrapApiData(data)
}
