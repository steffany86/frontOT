import api from './http'

export type RegistroActividad = {
  nivel: number | null
  minutos: number | null
  observacion: string
}

export type NotaDia = {
  animo: string
  observacion: string
}

export type DatosActividades = {
  /** Clave "yyyy-MM-dd|idActividad" */
  registros: Record<string, RegistroActividad>
  /** Clave "yyyy-MM-dd" */
  dias: Record<string, NotaDia>
}

const str = (value: unknown): string => (value === null || value === undefined ? '' : String(value))
const numOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const unwrap = (payload: unknown): Record<string, unknown> => {
  const inner = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload
  return (inner && typeof inner === 'object' ? inner : {}) as Record<string, unknown>
}

export const fetchActividadesSantiago = async (): Promise<DatosActividades> => {
  const { data } = await api.get('/actividades-santiago/datos')
  const body = unwrap(data)
  const registros: Record<string, RegistroActividad> = {}
  const dias: Record<string, NotaDia> = {}
  for (const row of (Array.isArray(body.registros) ? body.registros : []) as Record<string, unknown>[]) {
    registros[`${str(row.fecha)}|${str(row.id)}`] = {
      nivel: numOrNull(row.nivel),
      minutos: numOrNull(row.minutos),
      observacion: str(row.observacion),
    }
  }
  for (const row of (Array.isArray(body.dias) ? body.dias : []) as Record<string, unknown>[]) {
    dias[str(row.fecha)] = { animo: str(row.animo), observacion: str(row.observacion) }
  }
  return { registros, dias }
}

export const guardarRegistroActividad = async (fecha: string, id: string, registro: RegistroActividad): Promise<void> => {
  await api.put('/actividades-santiago/registro', {
    fecha,
    id,
    nivel: registro.nivel,
    minutos: registro.minutos,
    observacion: registro.observacion,
  })
}

export const guardarNotaDia = async (fecha: string, nota: NotaDia): Promise<void> => {
  await api.put('/actividades-santiago/dia', { fecha, animo: nota.animo, observacion: nota.observacion })
}

/** Sube registros ya existentes (por ejemplo, un respaldo .json de la version anterior). */
export const importarActividadesSantiago = async (
  registros: { fecha: string; id: string; nivel: number | null; minutos: number | null; observacion: string }[],
): Promise<number> => {
  const { data } = await api.post('/actividades-santiago/importar', { registros })
  return Number(unwrap(data).importados) || 0
}
