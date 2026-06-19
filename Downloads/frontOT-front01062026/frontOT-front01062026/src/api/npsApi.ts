import api from './http'

export type NpsDashboardParams = {
  modo?: 'nps_respuestas' | 'nps_invitado'
  fechaInicio?: string
  fechaFin?: string
  idSucursal?: number
  idSupervisor?: number
  idTecnico?: number
  supervisorNombre?: string
  tecnicoNombre?: string
}

export type NpsDashboardResponse = {
  scope?: string
  idSucursal?: number
  idSupervisor?: number | null
  idTecnico?: number | null
  rows: Record<string, unknown>[]
  filtros?: {
    supervisores?: Record<string, unknown>[]
    tecnicos?: Record<string, unknown>[]
  }
}

export type NpsFiltrosResponse = {
  scope?: string
  idSucursal?: number
  idSupervisor?: number | null
  idTecnico?: number | null
  filtros?: {
    supervisores?: Record<string, unknown>[]
    tecnicos?: Record<string, unknown>[]
  }
}

const unwrapObject = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const sanitizeParams = (params?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null || value === '') return false
    if (typeof value === 'number') return Number.isFinite(value)
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase()
      return Boolean(text) && text !== 'undefined' && text !== 'null' && text !== 'todos'
    }
    return true
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

export const fetchNpsDashboard = async (params: NpsDashboardParams): Promise<NpsDashboardResponse> => {
  const { data } = await api.get('/nps/dashboard', { params: sanitizeParams(params) })
  const mapped = unwrapObject<NpsDashboardResponse>(data)
  return {
    scope: mapped?.scope,
    idSucursal: mapped?.idSucursal,
    idSupervisor: mapped?.idSupervisor ?? null,
    idTecnico: mapped?.idTecnico ?? null,
    rows: Array.isArray(mapped?.rows) ? mapped.rows : [],
    filtros: mapped?.filtros ?? {},
  }
}

export const fetchNpsFiltros = async (params: Pick<NpsDashboardParams, 'modo' | 'idSucursal' | 'idSupervisor' | 'idTecnico' | 'supervisorNombre' | 'tecnicoNombre'>): Promise<NpsFiltrosResponse> => {
  const { data } = await api.get('/nps/filtros', { params: sanitizeParams(params) })
  const mapped = unwrapObject<NpsFiltrosResponse>(data)
  return {
    scope: mapped?.scope,
    idSucursal: mapped?.idSucursal,
    idSupervisor: mapped?.idSupervisor ?? null,
    idTecnico: mapped?.idTecnico ?? null,
    filtros: mapped?.filtros ?? {},
  }
}
