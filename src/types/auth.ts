export interface LoginRequest {
  usuario: string
  password: string
  idSucursal: number
}

export interface AuthMeResponse {
  idUsuario: number
  nombre: string
  rol: string
  idRol: number
  idSucursal: number
}

export interface Sucursal {
  idSucursal: number
  sucursal: string
}

export interface ApiResponse<T> {
  data: T
  message: string
  timestamp: string
}

export type SessionData = AuthMeResponse & { sessionToken: string }
