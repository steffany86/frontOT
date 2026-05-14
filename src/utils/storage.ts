import type { SessionData } from '../types/auth'

const SESSION_TTL_MS = 45 * 60 * 1000

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
  const expiresAtRaw = localStorage.getItem(storageKeys.sessionExpiresAt)
  if (!expiresAtRaw) return false
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true
  return Date.now() >= expiresAt
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
  const idSucursal = Number(localStorage.getItem(storageKeys.idSucursal))
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
  const nextExpiresAt =
    Number.isFinite(currentExpiresAt) && currentExpiresAt > Date.now()
      ? currentExpiresAt
      : Date.now() + SESSION_TTL_MS

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
