import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type CruceAgendaMakiroRow = Record<string, unknown>

export const fetchCruceAgendaMakiro = async (fecha: string): Promise<CruceAgendaMakiroRow[]> => {
  const { data } = await api.get('/supervisor/cruce-ordenes-agenda-makiro', {
    params: { fecha },
  })
  return normalizeArrayResponse<CruceAgendaMakiroRow>(data)
}

export const marcarCruceVerificaBack = async (
  idHistorial: number,
  observacion: string
): Promise<CruceAgendaMakiroRow> => {
  const { data } = await api.post(`/supervisor/cruce-ordenes-agenda-makiro/${idHistorial}/verifica-back`, {
    observacion,
    actualizado: 'SI',
  })
  if (data && typeof data === 'object' && 'data' in data && data.data && typeof data.data === 'object') {
    return data.data as CruceAgendaMakiroRow
  }
  return data as CruceAgendaMakiroRow
}
