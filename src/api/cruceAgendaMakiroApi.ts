import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type CruceAgendaMakiroRow = Record<string, unknown>

export const fetchCruceAgendaMakiro = async (fecha: string): Promise<CruceAgendaMakiroRow[]> => {
  const { data } = await api.get('/supervisor/cruce-ordenes-agenda-makiro', {
    params: { fecha },
  })
  return normalizeArrayResponse<CruceAgendaMakiroRow>(data)
}
