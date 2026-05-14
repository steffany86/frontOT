import api from './http'
import type { ApiResponse, AuthMeResponse, LoginRequest, SessionData, Sucursal } from '../types/auth'

type HeaderValue = string | string[] | number | boolean | null | undefined

const apiVerboseEnabled = import.meta.env.VITE_API_DEBUG === 'true'
const apiIssueLogsEnabled = import.meta.env.DEV || import.meta.env.VITE_API_LOG_ISSUES === 'true'
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const readStringField = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }
  return ''
}

const readNumberField = (record: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

const mapRoleName = (idRol: number, current: string): string => {
  if (current.trim()) return current
  if (idRol === 8) return 'Tecnico'
  if (idRol === 9) return 'Supervisor'
  return ''
}

const normalizeAuthMeResponse = (payload: unknown): AuthMeResponse => {
  const base = isRecord(payload) && isRecord(payload.data) ? payload.data : isRecord(payload) ? payload : {}
  const idRol = readNumberField(base, ['idRol', 'IdRol', 'Id_Rol', 'id_rol'])
  const rol = mapRoleName(idRol, readStringField(base, ['rol', 'Rol', 'nombreRol', 'NombreRol']))
  return {
    idUsuario: readNumberField(base, ['idUsuario', 'IdUsuario', 'Id_Usuario', 'id_usuario', 'idTecnico', 'Id_Tecnico']),
    nombre: readStringField(base, ['nombre', 'Nombre', 'nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario']),
    rol,
    idRol,
    idSucursal: readNumberField(base, ['idSucursal', 'IdSucursal', 'Id_Sucursal', 'id_sucursal']),
    hostName: readStringField(base, ['hostName', 'HostName', 'hostname', 'Hostname', 'pcName', 'PcName']),
    necesitaCambio: String(readStringField(base, ['necesitaCambio', 'NecesitaCambio', 'necesitacambio', 'Necesita_Cambio'])).toLowerCase() === 'true'
      || readNumberField(base, ['necesitaCambio', 'NecesitaCambio', 'necesitacambio', 'Necesita_Cambio']) === 1,
    ultimaModificacion: readStringField(base, ['ultimaModificacion', 'UltimaModificacion', 'ultimamodificacion', 'ultima_modificacion']) || undefined,
  }
}

const hasAuthData = (payload: unknown): boolean => {
  if (!isRecord(payload)) return false
  const base = isRecord(payload.data) ? payload.data : payload
  return (
    readNumberField(base, ['idUsuario', 'IdUsuario', 'Id_Usuario', 'id_usuario']) > 0 ||
    Boolean(readStringField(base, ['nombre', 'Nombre', 'nombreUsuario', 'NombreUsuario'])) ||
    Boolean(readStringField(base, ['rol', 'Rol', 'nombreRol', 'NombreRol']))
  )
}

const hasAuthMe = (me?: AuthMeResponse | null): boolean => {
  if (!me) return false
  return Boolean(me.idUsuario || me.idRol || me.idSucursal || me.nombre || me.rol)
}

const normalizeSucursalesResponse = (payload: unknown): ApiResponse<Sucursal[]> => {
  if (payload && typeof payload === 'object') {
    const record = payload as ApiResponse<Sucursal[]>
    if (Array.isArray(record.data)) {
      return record
    }
  }
  if (Array.isArray(payload)) {
    return {
      data: payload as Sucursal[],
      message: '',
      timestamp: '',
    }
  }
  if (apiIssueLogsEnabled) {
    console.warn('Respuesta /auth/sucursales sin formato esperado:', payload)
  }
  return {
    data: [],
    message: '',
    timestamp: '',
  }
}

const readSessionToken = (headers: Record<string, HeaderValue> | undefined): string => {
  const rawToken = headers?.['x-session-token'] ?? headers?.['X-Session-Token']
  const token = Array.isArray(rawToken)
    ? rawToken[0]
    : typeof rawToken === 'string'
      ? rawToken
      : typeof rawToken === 'number' || typeof rawToken === 'boolean'
        ? String(rawToken)
        : undefined

  if (!token) {
    throw new Error('No se recibio el header X-Session-Token.')
  }
  return token
}

export const fetchSucursales = async (): Promise<ApiResponse<Sucursal[]>> => {
  if (apiVerboseEnabled) {
    console.log('Request /auth/sucursales ->', api.defaults.baseURL ?? '(sin baseURL)')
  }
  const response = await api.get('/auth/sucursales')
  if (apiVerboseEnabled) {
    console.log('Respuesta cruda /auth/sucursales:', response.status, response.data)
  }
  return normalizeSucursalesResponse(response.data)
}

export const fetchMe = async (sessionToken?: string): Promise<AuthMeResponse> => {
  if (apiVerboseEnabled) {
    console.log('Request /auth/me ->', api.defaults.baseURL ?? '(sin baseURL)', 'token?', Boolean(sessionToken))
  }
  const { data } = await api.get<AuthMeResponse>('/auth/me', {
    headers: sessionToken ? { 'X-Session-Token': sessionToken } : undefined,
  })
  return normalizeAuthMeResponse(data)
}

export const login = async (payload: LoginRequest): Promise<SessionData> => {
  if (apiVerboseEnabled) {
    console.log('Request /auth/login ->', api.defaults.baseURL ?? '(sin baseURL)', {
      ...payload,
      password: payload.password ? '***' : '',
    })
  }
  const response = await api.post('/auth/login', payload)
  if (apiVerboseEnabled) {
    console.log('Respuesta /auth/login:', response.status, response.data, response.headers)
  }
  const sessionToken = readSessionToken(response.headers as Record<string, HeaderValue> | undefined)
  const loginMe = hasAuthData(response.data) ? normalizeAuthMeResponse(response.data) : null
  try {
    const me = await fetchMe(sessionToken)
    if (!hasAuthMe(me) && loginMe) {
      return { sessionToken, ...loginMe }
    }
    return { sessionToken, ...me }
  } catch (error) {
    if (loginMe) {
      return { sessionToken, ...loginMe }
    }
    throw error
  }
}
