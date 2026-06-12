import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { CuNoRealizadoCreatePayload, CuNoRealizadoDetail, CuNoRealizadoSummary } from '../types/cu'

export const fetchCuList = async (): Promise<CuNoRealizadoSummary[]> => {
  const { data } = await api.get('/cu-no-realizado')
  return normalizeArrayResponse<CuNoRealizadoSummary>(data)
}

export const fetchCuDetail = async (id: number): Promise<CuNoRealizadoDetail> => {
  const { data } = await api.get<CuNoRealizadoDetail>(`/cu-no-realizado/${id}`)
  return data
}

export const createCuNoRealizado = async (payload: CuNoRealizadoCreatePayload): Promise<void> => {
  await api.post('/cu-no-realizado', payload)
}
