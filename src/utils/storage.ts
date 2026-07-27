import type { SessionData } from '../types/auth'

const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000

const storageKeys = {
  sessionToken: 'sessionToken',
  idUsuario: 'idUsuario',
  nombre: 'nombre',
  rol: 'rol',
  idRol: 'idRol',
  idSucursal: 'idSucursal',
  sessionExpiresAt: 'sessionExpiresAt',
} as const

const isSessionExpired = (): boolean => {
  const expiresAt = getSessionExpiresAt()
  if (expiresAt === null) return false
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true
  return Date.now() >= expiresAt
}

const readSucursalFromToken = (token: string): number | null => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>
    const value = Number(claims.idSucursal ?? claims.IdSucursal ?? claims.id_sucursal ?? claims.Id_Sucursal)
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
  } catch {
    return null
  }
}

export const getSessionSucursalId = (): number | null => {
  const stored = Number(localStorage.getItem(storageKeys.idSucursal))
  if (Number.isFinite(stored) && stored > 0) return Math.trunc(stored)
  const token = localStorage.getItem(storageKeys.sessionToken)
  return token ? readSucursalFromToken(token) : null
}

export const getSessionExpiresAt = (): number | null => {
  const expiresAtRaw = localStorage.getItem(storageKeys.sessionExpiresAt)
  if (!expiresAtRaw) return null
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null
  return expiresAt
}

export const getSessionRemainingMs = (): number | null => {
  const expiresAt = getSessionExpiresAt()
  if (expiresAt === null) return null
  return Math.max(0, expiresAt - Date.now())
}

export const getSessionStorage = (): SessionData | null => {
  if (isSessionExpired()) {
    clearSessionStorage()
    return null
  }

  const sessionToken = localStorage.getItem(storageKeys.sessionToken)
  if (!sessionToken) return null

  const idUsuario = Number(localStorage.getItem(storageKeys.idUsuario))
  const nombre = localStorage.getItem(storageKeys.nombre) ?? ''
  const rol = localStorage.getItem(storageKeys.rol) ?? ''
  const idRol = Number(localStorage.getItem(storageKeys.idRol))
  const idSucursal = getSessionSucursalId() ?? 0
  const hostName = localStorage.getItem('hostName') ?? undefined

  return {
    sessionToken,
    idUsuario,
    nombre,
    rol,
    idRol,
    idSucursal,
    hostName,
  }
}

export const setSessionStorage = (data: SessionData): void => {
  const currentExpiresAtRaw = localStorage.getItem(storageKeys.sessionExpiresAt)
  const currentExpiresAt = Number(currentExpiresAtRaw)
  const backendExpiresAt = data.expira ? Date.parse(data.expira) : NaN
  const nextExpiresAt =
    Number.isFinite(backendExpiresAt) && backendExpiresAt > Date.now()
      ? backendExpiresAt
      : Number.isFinite(currentExpiresAt) && currentExpiresAt > Date.now()
        ? currentExpiresAt
        : Date.now() + DEFAULT_SESSION_TTL_MS

  localStorage.setItem(storageKeys.sessionToken, data.sessionToken)
  localStorage.setItem(storageKeys.idUsuario, String(data.idUsuario))
  localStorage.setItem(storageKeys.nombre, data.nombre)
  localStorage.setItem(storageKeys.rol, data.rol)
  localStorage.setItem(storageKeys.idRol, String(data.idRol))
  localStorage.setItem(storageKeys.idSucursal, String(data.idSucursal))
  localStorage.setItem(storageKeys.sessionExpiresAt, String(nextExpiresAt))
  if (data.hostName) {
    localStorage.setItem('hostName', data.hostName)
  } else {
    localStorage.removeItem('hostName')
  }
}

export const clearSessionStorage = (): void => {
  Object.values(storageKeys).forEach((key) => localStorage.removeItem(key))
  localStorage.removeItem('hostName')
}

export const hasSessionStorage = (): boolean => {
  return Boolean(getSessionStorage()?.sessionToken)
}

export { storageKeys }
