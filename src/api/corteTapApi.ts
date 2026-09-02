import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type CorteTapRow = Record<string, unknown>

export type CorteTapCrearPayload = {
  codigoCliente: string
  tor?: string
  idTecnico: number
  tecnico: string
  sucursal?: string
  nodoTapBocaAntiguo?: string
  nodoTapBoca?: string
  zonaHfc?: string
  estado?: string
  observacion?: string
  creadoDesdeOt?: boolean
}

export type CorteTapDigitacionPayload = {
  nodoTapBocaAntiguo: string
  zonaHfc: string
}

export type CorteTapCatalogos = {
  zonas: CorteTapRow[]
  distritos: CorteTapRow[]
  estados: CorteTapRow[]
}

export type CorteTapResolucionZonaHfc = {
  nodo: string
  zona: string
  distrito: string
}

export type CorteTapEjecucionPayload = {
  ordenTrabajo: string
  observacion: string
  foto1: string | null
  foto2: string | null
  fechaEjecucion: string
}

export type CorteTapEstado = string

export type CorteTapDigitadorPayload = {
  nodoTapBocaAntiguo: string
  zonaHfc: string
  estado: CorteTapEstado
  observacion: string
}

const normalizeObjectResponse = (payload: unknown): CorteTapRow => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data
    return data && typeof data === 'object' ? data as CorteTapRow : {}
  }
  return payload && typeof payload === 'object' ? payload as CorteTapRow : {}
}

export const fetchCortesTap = async (): Promise<CorteTapRow[]> => {
  const { data } = await api.get('/cortes-tap')
  return normalizeArrayResponse<CorteTapRow>(data)
}

export const fetchCorteTapDetalle = async (id: number): Promise<CorteTapRow> => {
  const { data } = await api.get(`/cortes-tap/${id}`)
  return normalizeObjectResponse(data)
}

export const fetchCorteTapCatalogos = async (): Promise<CorteTapCatalogos> => {
  const { data } = await api.get('/cortes-tap/catalogos/digitacion')
  const normalized = normalizeObjectResponse(data)
  return {
    zonas: Array.isArray(normalized.zonas) ? normalized.zonas as CorteTapRow[] : [],
    distritos: Array.isArray(normalized.distritos) ? normalized.distritos as CorteTapRow[] : [],
    estados: Array.isArray(normalized.estados) ? normalized.estados as CorteTapRow[] : [],
  }
}

export const resolverCorteTapZonaHfc = async (zonaHfc: string): Promise<CorteTapResolucionZonaHfc> => {
  const { data } = await api.get('/cortes-tap/resolver-zona-hfc', { params: { zonaHfc } })
  const normalized = normalizeObjectResponse(data)
  return {
    nodo: String(normalized.nodo ?? ''),
    zona: String(normalized.zona ?? ''),
    distrito: String(normalized.distrito ?? ''),
  }
}

export const guardarCorteTapDigitacion = async (id: number, payload: CorteTapDigitacionPayload): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/digitacion`, payload)
  return normalizeObjectResponse(data)
}

export const guardarCorteTapEjecucion = async (id: number, payload: CorteTapEjecucionPayload): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/ejecucion`, payload)
  return normalizeObjectResponse(data)
}

export const guardarCorteTapEstado = async (id: number, estado: CorteTapEstado): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/estado`, { estado })
  return normalizeObjectResponse(data)
}

export const guardarCorteTapObservacion = async (id: number, observacion: string): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/observacion`, { observacion })
  return normalizeObjectResponse(data)
}

export const guardarDatosCorteTapDigitador = async (id: number, payload: CorteTapDigitadorPayload): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/digitador`, payload)
  return normalizeObjectResponse(data)
}

export const finalizarCorteTap = async (id: number): Promise<CorteTapRow> => {
  const { data } = await api.put(`/cortes-tap/${id}/finalizacion`)
  return normalizeObjectResponse(data)
}

export const crearCorteTap = async (payload: CorteTapCrearPayload): Promise<Record<string, unknown>> => {
  const { data } = await api.post('/cortes-tap', payload, { headers: { 'Content-Type': 'application/json' } })
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: Record<string, unknown> }).data
  }
  return data as Record<string, unknown>
}
