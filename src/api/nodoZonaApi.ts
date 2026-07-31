import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type NodoZonaRow = Record<string, unknown>

export type NodoZonaCrearPayload = {
  nodosAsociados: string
  distrito: string
  zona: string
}

export type NodoDistritoCrearPayload = NodoZonaCrearPayload & {
  distritoNuevo: string
}

export type EstadoCorteTapCrearPayload = {
  estado: string
}

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export const fetchNodoZona = async (): Promise<NodoZonaRow[]> => {
  const { data } = await api.get('/backoffice/nodo-zona')
  return normalizeArrayResponse<NodoZonaRow>(data)
}

export const fetchNodoDistrito = async (): Promise<NodoZonaRow[]> => {
  const { data } = await api.get('/backoffice/nodo-zona/distrito')
  return normalizeArrayResponse<NodoZonaRow>(data)
}

export const fetchEstadoCorteTap = async (): Promise<NodoZonaRow[]> => {
  const { data } = await api.get('/backoffice/nodo-zona/estado-corte-tap')
  return normalizeArrayResponse<NodoZonaRow>(data)
}

export const crearNodoZona = async (payload: NodoZonaCrearPayload): Promise<NodoZonaRow> => {
  const { data } = await api.post('/backoffice/nodo-zona', payload, { headers: { 'Content-Type': 'application/json' } })
  return normalizeObjectResponse<NodoZonaRow>(data)
}

export const eliminarNodoZona = async (id: number): Promise<NodoZonaRow> => {
  const { data } = await api.delete(`/backoffice/nodo-zona/${encodeURIComponent(String(id))}`)
  return normalizeObjectResponse<NodoZonaRow>(data)
}

export const crearNodoDistrito = async (payload: NodoDistritoCrearPayload): Promise<NodoZonaRow> => {
  const { data } = await api.post('/backoffice/nodo-zona/distrito', payload, { headers: { 'Content-Type': 'application/json' } })
  return normalizeObjectResponse<NodoZonaRow>(data)
}

export const eliminarNodoDistrito = async (id: number): Promise<NodoZonaRow> => {
  const { data } = await api.delete(`/backoffice/nodo-zona/distrito/${encodeURIComponent(String(id))}`)
  return normalizeObjectResponse<NodoZonaRow>(data)
}

export const crearEstadoCorteTap = async (payload: EstadoCorteTapCrearPayload): Promise<NodoZonaRow> => {
  const { data } = await api.post('/backoffice/nodo-zona/estado-corte-tap', payload, { headers: { 'Content-Type': 'application/json' } })
  return normalizeObjectResponse<NodoZonaRow>(data)
}

export const eliminarEstadoCorteTap = async (id: number): Promise<NodoZonaRow> => {
  const { data } = await api.delete(`/backoffice/nodo-zona/estado-corte-tap/${encodeURIComponent(String(id))}`)
  return normalizeObjectResponse<NodoZonaRow>(data)
}
