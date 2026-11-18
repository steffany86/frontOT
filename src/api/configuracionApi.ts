import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type ConfiguracionItem = {
  clave: string
  titulo: string
  descripcion: string
  tipo: string
  valor: string
}

/** Claves conocidas (deben existir en ConfiguracionService del backend). */
export const CONFIG_KEYS = {
  supervisionV2TuercaHabilitada: 'supervision_v2.tuerca_habilitada',
} as const

const str = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim())

export const fetchConfiguraciones = async (): Promise<ConfiguracionItem[]> => {
  const { data } = await api.get('/configuraciones')
  return normalizeArrayResponse<Record<string, unknown>>(data).map((row) => ({
    clave: str(row.clave),
    titulo: str(row.titulo),
    descripcion: str(row.descripcion),
    tipo: str(row.tipo),
    valor: str(row.valor),
  }))
}

/** Lectura abierta a cualquier usuario con sesion. */
export const fetchConfiguracionValor = async (clave: string): Promise<string> => {
  const { data } = await api.get(`/configuraciones/${encodeURIComponent(clave)}`)
  const payload = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as Record<string, unknown> | null
  return str(payload?.valor)
}

export const updateConfiguracion = async (clave: string, valor: string): Promise<void> => {
  await api.put(`/configuraciones/${encodeURIComponent(clave)}`, { valor })
}
