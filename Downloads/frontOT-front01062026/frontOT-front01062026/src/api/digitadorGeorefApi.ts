import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type DigitadorGeorefRow = Record<string, unknown>

export const fetchDigitadorGeorefDistancias = async (fecha: string): Promise<DigitadorGeorefRow[]> => {
  const { data } = await api.get('/digitador/georef/distancias', {
    params: { fecha },
  })
  return normalizeArrayResponse<DigitadorGeorefRow>(data)
}

export const confirmarDigitadorGeorefDistancia = async (id: number): Promise<void> => {
  await api.post(`/digitador/georef/distancias/${id}/confirmar`)
}
