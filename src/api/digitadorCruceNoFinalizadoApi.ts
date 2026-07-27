import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type DigitadorCruceNoFinalizadoRow = Record<string, unknown>

export type DigitadorCruceNoFinalizadoPage = {
  items: DigitadorCruceNoFinalizadoRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type DigitadorCruceNoFinalizadoPayload = {
  fechaEjecuacionDigitacion: string
  estadoDigitacion: string
  observacionDigitacion: string
}

export const fetchDigitadorCruceNoFinalizado = async (fechaDesde: string, fechaHasta: string, marcados: boolean, page: number, pageSize = 20): Promise<DigitadorCruceNoFinalizadoPage> => {
  const { data } = await api.get('/digitador/cruce-no-finalizado', { params: { fechaDesde, fechaHasta, marcados, page, pageSize } })
  const payload = data?.data ?? data
  return {
    items: normalizeArrayResponse<DigitadorCruceNoFinalizadoRow>(payload?.items ?? []),
    page: Number(payload?.page ?? page),
    pageSize: Number(payload?.pageSize ?? pageSize),
    total: Number(payload?.total ?? 0),
    totalPages: Number(payload?.totalPages ?? 1),
  }
}

export const fetchDigitadorCruceNoFinalizadoEstados = async (): Promise<Record<string, unknown>[]> => {
  const { data } = await api.get('/digitador/cruce-no-finalizado/estados')
  return normalizeArrayResponse<Record<string, unknown>>(data)
}

export const guardarDigitadorCruceNoFinalizado = async (
  idHistorial: number,
  payload: DigitadorCruceNoFinalizadoPayload,
): Promise<void> => {
  await api.post(`/digitador/cruce-no-finalizado/${idHistorial}/guardar`, payload)
}
