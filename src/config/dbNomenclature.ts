import type { Sucursal } from '../types/auth'

type DbConnectionTarget = {
  host: string
  database: string
  user: string
  password: string
}

export const DB_USER = 'sistemas'
export const DB_PASSWORD = 'sametsis'

export const tigoMakiro: DbConnectionTarget = {
  host: 'tigo.makiro.com.bo',
  database: 'BDSistemaAntenaPM',
  user: DB_USER,
  password: DB_PASSWORD,
}

export const BDControl: DbConnectionTarget = {
  host: '172.16.0.13',
  database: 'BDControlOrdenes',
  user: DB_USER,
  password: DB_PASSWORD,
}

export const resolveLocalFromSucursal = (sucursal?: Sucursal | null): DbConnectionTarget | null => {
  const host = sucursal?.ip?.trim()
  const database = sucursal?.BaseDeDatos?.trim()
  if (!host || !database) return null
  return {
    host,
    database,
    user: DB_USER,
    password: DB_PASSWORD,
  }
}

