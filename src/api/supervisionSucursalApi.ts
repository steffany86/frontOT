import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type SupervisionSucursalAsignacion = {
  id: number
  idUsuario: number
  nombreUsuario: string
  idSucursalUsuario: number
  nombreSucursalUsuario: string
  idSucursalPermiso: number
  nombreSucursalPermiso: string
  fechaRegistro?: string
  idUsuarioRegistro?: number
}

const SUPERVISION_SUCURSAL_BASE_PATH = '/sistemas/supervision-sucursales'

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return undefined
}

const toNumber = (value: unknown): number => {
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const toText = (value: unknown): string => String(value ?? '').trim()

const mapAsignacion = (row: Record<string, unknown>): SupervisionSucursalAsignacion => ({
  id: toNumber(readValue(row, ['id', 'Id'])),
  idUsuario: toNumber(readValue(row, ['idUsuario', 'id_usuario'])),
  nombreUsuario: toText(readValue(row, ['nombreUsuario', 'nombre_usuario'])),
  idSucursalUsuario: toNumber(readValue(row, ['idSucursalUsuario', 'id_sucursalUsuario', 'id_sucursalusuario'])),
  nombreSucursalUsuario: toText(readValue(row, ['nombreSucursalUsuario', 'nombre_sucursalUsuario', 'nombre_sucursalusuario'])),
  idSucursalPermiso: toNumber(readValue(row, ['idSucursalPermiso', 'id_SucursalPermiso', 'id_sucursalpermiso'])),
  nombreSucursalPermiso: toText(readValue(row, ['nombreSucursalPermiso', 'nombre_SucursalPermiso', 'nombre_sucursalpermiso'])),
  fechaRegistro: toText(readValue(row, ['fechaRegistro', 'fecha_registro'])) || undefined,
  idUsuarioRegistro: toNumber(readValue(row, ['idUsuarioRegistro', 'id_UsuarioRegistro', 'id_usuarioregistro'])) || undefined,
})

export const fetchSupervisionSucursales = async (): Promise<SupervisionSucursalAsignacion[]> => {
  const { data } = await api.get(SUPERVISION_SUCURSAL_BASE_PATH)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapAsignacion).filter((item) => item.id > 0)
}

export const crearSupervisionSucursal = async (payload: {
  idUsuario: number
  idSucursalUsuario: number
  idSucursalPermiso: number
}): Promise<SupervisionSucursalAsignacion> => {
  const { data } = await api.post(SUPERVISION_SUCURSAL_BASE_PATH, payload)
  return mapAsignacion(normalizeObjectResponse<Record<string, unknown>>(data))
}

export const eliminarSupervisionSucursal = async (id: number): Promise<void> => {
  await api.delete(`${SUPERVISION_SUCURSAL_BASE_PATH}/${id}`)
}
