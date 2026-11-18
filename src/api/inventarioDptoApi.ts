import api from './http'

export const ESTADOS = ['Bueno', 'Regular', 'Dañado', 'Faltante', 'A cambiar'] as const
export type Estado = (typeof ESTADOS)[number]

export type RegistroInventario = {
  estado: Estado
  observacion: string
  fechaCambio: string // yyyy-MM-dd (solo "A cambiar")
  motivoCambio: string // (solo "A cambiar")
}

export type DatosInventario = {
  registros: Record<number, RegistroInventario>
  /** item -> ids de fotos */
  fotos: Record<number, number[]>
}

const str = (value: unknown): string => (value === null || value === undefined ? '' : String(value))

const unwrap = (payload: unknown): Record<string, unknown> => {
  const inner = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload
  return (inner && typeof inner === 'object' ? inner : {}) as Record<string, unknown>
}

export const fetchInventarioDpto = async (): Promise<DatosInventario> => {
  const { data } = await api.get('/inventario-dpto-91/datos')
  const body = unwrap(data)
  const registros: Record<number, RegistroInventario> = {}
  const fotos: Record<number, number[]> = {}
  for (const row of (Array.isArray(body.items) ? body.items : []) as Record<string, unknown>[]) {
    const estado = ESTADOS.includes(str(row.estado) as Estado) ? (str(row.estado) as Estado) : 'Bueno'
    registros[Number(row.item)] = {
      estado,
      observacion: str(row.observacion),
      fechaCambio: str(row.fechaCambio),
      motivoCambio: str(row.motivoCambio),
    }
  }
  for (const row of (Array.isArray(body.fotos) ? body.fotos : []) as Record<string, unknown>[]) {
    const item = Number(row.item)
    ;(fotos[item] ??= []).push(Number(row.id))
  }
  return { registros, fotos }
}

export const guardarItemInventario = async (item: number, r: RegistroInventario): Promise<void> => {
  await api.put('/inventario-dpto-91/item', { item, ...r })
}

export const agregarFotoInventario = async (item: number, imagen: string): Promise<number> => {
  const { data } = await api.post('/inventario-dpto-91/foto', { item, imagen })
  return Number(unwrap(data).id)
}

export const fetchFotoInventario = async (id: number): Promise<string> => {
  const { data } = await api.get(`/inventario-dpto-91/foto/${id}`)
  return str(unwrap(data).imagen)
}

export const eliminarFotoInventario = async (id: number): Promise<void> => {
  await api.delete(`/inventario-dpto-91/foto/${id}`)
}
