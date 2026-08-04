import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { NombreNpsSucursal, NombreNpsVendedor } from '../types/nombresNps'

const normalizeString = (value: unknown): string => String(value ?? '').trim()

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const mapVendedor = (row: Record<string, unknown>): NombreNpsVendedor => ({
  sucursal: normalizeString(row.sucursal),
  idSucursal: normalizeNumber(row.idSucursal),
  idVendedor: normalizeNumber(row.idVendedor),
  nombre: normalizeString(row.nombre),
  nombreNps: normalizeString(row.nombreNps) || undefined,
  nombreNpsActual: normalizeString(row.nombreNpsActual) || undefined,
  sugeridoNombreNps: normalizeString(row.sugeridoNombreNps) || undefined,
  score: row.score === undefined || row.score === null ? undefined : normalizeNumber(row.score),
  estado: normalizeString(row.estado) || 'sin_match',
})

const mapSucursal = (row: Record<string, unknown>): NombreNpsSucursal => {
  const rawRows = Array.isArray(row.rows) ? (row.rows as Record<string, unknown>[]) : []
  return {
    sucursal: normalizeString(row.sucursal),
    idSucursal: normalizeNumber(row.idSucursal),
    total: normalizeNumber(row.total),
    conMatch: normalizeNumber(row.conMatch),
    sinMatch: normalizeNumber(row.sinMatch),
    actualizados: normalizeNumber(row.actualizados),
    rows: rawRows.map(mapVendedor).filter((item) => item.idVendedor && item.nombre),
  }
}

export const fetchNombresNps = async (): Promise<NombreNpsSucursal[]> => {
  const { data } = await api.get('/backoffice/nombres-nps')
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapSucursal).filter((item) => item.idSucursal)
}

export const obtenerNombresNpsSucursal = async (sucursal: string | number): Promise<NombreNpsSucursal> => {
  const { data } = await api.post(`/backoffice/nombres-nps/${encodeURIComponent(String(sucursal))}/obtener`)
  return mapSucursal(normalizeObjectResponse<Record<string, unknown>>(data))
}

export const actualizarNombreNpsManual = async (params: {
  sucursal: string | number
  idVendedor: string | number
  nombreNps: string
}): Promise<{ idVendedor: number; nombreNps: string; idSucursal: number; sucursal: string }> => {
  const { data } = await api.patch(
    `/backoffice/nombres-nps/${encodeURIComponent(String(params.sucursal))}/vendedores/${encodeURIComponent(String(params.idVendedor))}`,
    { nombreNps: params.nombreNps },
    { headers: { 'Content-Type': 'application/json' } }
  )
  const payload = normalizeObjectResponse<Record<string, unknown>>(data)
  return {
    idVendedor: normalizeNumber(payload.idVendedor),
    nombreNps: normalizeString(payload.nombreNps),
    idSucursal: normalizeNumber(payload.idSucursal),
    sucursal: normalizeString(payload.sucursal),
  }
}
