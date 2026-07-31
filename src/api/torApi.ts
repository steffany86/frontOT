import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { TorRegistrado, TorRegistroPayload, TorRegistroResponse } from '../types/tor'

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }

  const normalizedMap = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue
    normalizedMap.set(key.replace(/_/g, '').trim().toLowerCase(), value)
  }

  for (const key of keys) {
    const value = normalizedMap.get(key.replace(/_/g, '').trim().toLowerCase())
    if (value !== undefined && value !== null && value !== '') return value
  }

  return undefined
}

const mapRegistrado = (row: Record<string, unknown>): TorRegistrado => ({
  id: normalizeString(readValue(row, ['id', 'Id', 'ID', 'idTor', 'id_tor'])),
  nroTrans: normalizeString(readValue(row, ['NroTrans', 'nroTrans', 'nro_trans'])),
  detalle: normalizeString(readValue(row, ['Detalle', 'detalle'])),
  tor: normalizeString(readValue(row, ['TOR', 'tor'])),
  tipoServicio: normalizeString(readValue(row, ['TIPO_SERVICIO', 'tipoServicio', 'tipo_servicio'])),
  usuarioRegistra: normalizeString(readValue(row, ['usuarioRegistra', 'usuario_registra', 'UsuarioRegistra'])),
})

export const registrarTor = async (payload: TorRegistroPayload): Promise<TorRegistroResponse> => {
  const { data } = await api.post('/tor/registro', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return normalizeObjectResponse<TorRegistroResponse>(data)
}

export const fetchTorRegistrados = async (): Promise<TorRegistrado[]> => {
  const { data } = await api.get('/tor/registrados')
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapRegistrado)
}
