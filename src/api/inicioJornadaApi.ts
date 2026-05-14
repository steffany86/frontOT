import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  CierreJornadaEstado,
  CierreJornadaPayload,
  InicioJornadaCreatePayload,
  InicioJornadaEncargado,
  InicioJornadaEstado,
} from '../types/inicioJornada'

const BASE_PATH = '/tecnico/inicio-jornada'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  const text = normalizeString(value).toLowerCase()
  return text === '1' || text === 'true' || text === 'si'
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  return undefined
}

export const fetchInicioJornadaEstado = async (sucursal?: string): Promise<InicioJornadaEstado> => {
  const { data } = await api.get(`${BASE_PATH}/estado`, { params: { sucursal: sucursal || undefined } })
  const row = (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
  return {
    idTecnico: Number(readValue(row, ['idTecnico', 'id_tecnico']) ?? 0),
    pendiente: normalizeBoolean(readValue(row, ['pendiente'])),
    fechaServidor: normalizeString(readValue(row, ['fechaServidor', 'fecha_servidor'])) || undefined,
  }
}

export const fetchInicioJornadaEncargados = async (sucursal?: string): Promise<InicioJornadaEncargado[]> => {
  const { data } = await api.get(`${BASE_PATH}/encargados`, { params: { sucursal: sucursal || undefined } })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows
    .map((row) => ({
      idEncargado: normalizeString(readValue(row, ['idEncargado', 'id_encargado', 'idUsuarioSupervisor', 'id_usuario'])),
      encargado: normalizeString(readValue(row, ['encargado', 'supervisor', 'nombre'])),
    }))
    .filter((item) => item.idEncargado && item.encargado)
}

export const registrarInicioJornada = async (payload: InicioJornadaCreatePayload): Promise<Record<string, unknown>> => {
  const { data } = await api.post(BASE_PATH, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const fetchCierreJornadaEstado = async (): Promise<CierreJornadaEstado> => {
  const { data } = await api.get(`${BASE_PATH}/cierre-estado`)
  const row = (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
  return {
    idTecnico: Number(readValue(row, ['idTecnico', 'id_tecnico']) ?? 0),
    tieneInicioHoy: normalizeBoolean(readValue(row, ['tieneInicioHoy'])),
    cerradoHoy: normalizeBoolean(readValue(row, ['cerradoHoy'])),
    requiereCierre: normalizeBoolean(readValue(row, ['requiereCierre'])),
    noMarcoCount: Number(readValue(row, ['noMarcoCount', 'no_marco_count']) ?? 0),
  }
}

export const cerrarJornada = async (payload: CierreJornadaPayload): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/cerrar-jornada`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}
