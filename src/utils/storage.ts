import type { SessionData } from '../types/auth'

const storageKeys = {
  sessionToken: 'sessionToken',
  idUsuario: 'idUsuario',
  nombre: 'nombre',
  rol: 'rol',
  idRol: 'idRol',
  idSucursal: 'idSucursal',
} as const

export const getSessionStorage = (): SessionData | null => {
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
  localStorage.setItem(storageKeys.sessionToken, data.sessionToken)
  localStorage.setItem(storageKeys.idUsuario, String(data.idUsuario))
  localStorage.setItem(storageKeys.nombre, data.nombre)
  localStorage.setItem(storageKeys.rol, data.rol)
  localStorage.setItem(storageKeys.idRol, String(data.idRol))
  localStorage.setItem(storageKeys.idSucursal, String(data.idSucursal))
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
  return Boolean(localStorage.getItem(storageKeys.sessionToken))
}

export { storageKeys }
