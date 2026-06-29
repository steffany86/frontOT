import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { CentralGrupo, CentralSupervisor, CentralTecnico, CentralTecnicoAsignado } from '../types/centralGrupos'

const BASE_PATH = '/central/grupos'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  const normalized = String(value).trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'si') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  return undefined
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  const normalizedMap = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue
    normalizedMap.set(key.replace(/_/g, '').toLowerCase(), value)
  }
  for (const key of keys) {
    const value = normalizedMap.get(key.replace(/_/g, '').toLowerCase())
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

type GrupoRow = {
  idGrupo: string
  nombre: string
  supervisor?: string
  supervisorAusente?: boolean
  tecnicoTemporalBackup?: string
  idTecnicoTemporalBackup?: string
  fechaRegistro?: string
  cantidadSupervisores?: number
  cantidadTecnicos?: number
  tecnico?: CentralTecnicoAsignado
}

const mapGrupoRow = (row: Record<string, unknown>): GrupoRow => {
  const idUsuarioTecnico = normalizeString(readValue(row, ['id_usuario_tecnico', 'idUsuarioTecnico', 'id_tecnico_grupo']))
  const tecnicoNombre = normalizeString(readValue(row, ['tecnico', 'nombre_tecnico', 'nombreTecnico', 'vendedor', 'nombre_vendedor']))
  const idVendedor = normalizeString(readValue(row, ['id_vendedor', 'idVendedor']))

  return {
    idGrupo: normalizeString(readValue(row, ['id_grupo', 'idGrupo'])),
    nombre: normalizeString(readValue(row, ['nombre'])),
    supervisor: normalizeString(readValue(row, ['supervisor', 'supervisor_a_cargo', 'supervisorACargo', 'nombre_supervisor'])) || undefined,
    supervisorAusente: toOptionalBoolean(readValue(row, ['supervisor_ausente', 'supervisorAusente', 'e_supervisor_ausente'])),
    tecnicoTemporalBackup:
      normalizeString(readValue(row, ['tecnico_temporal_backup', 'tecnicoTemporalBackup', 'colaborador_temporal', 'backup_tecnico'])) || undefined,
    idTecnicoTemporalBackup:
      normalizeString(readValue(row, ['id_tecnico_temporal_backup', 'idTecnicoTemporalBackup', 'id_usuario_tecnico_temporal'])) || undefined,
    fechaRegistro: normalizeString(readValue(row, ['fecha_registro', 'fechaRegistro'])) || undefined,
    cantidadSupervisores: toOptionalNumber(readValue(row, ['cantidad_supervisores', 'cantidadSupervisores'])),
    cantidadTecnicos: toOptionalNumber(readValue(row, ['cantidad_tecnicos', 'cantidadTecnicos'])),
    tecnico:
      tecnicoNombre || idUsuarioTecnico
        ? {
            idUsuarioTecnico: idUsuarioTecnico || idVendedor || tecnicoNombre,
            idVendedor: idVendedor || undefined,
            tecnico: tecnicoNombre || `Tecnico ${idUsuarioTecnico || idVendedor}`,
          }
        : undefined,
  }
}

const mapSupervisor = (row: Record<string, unknown>): CentralSupervisor => ({
  idUsuarioSupervisor: normalizeString(readValue(row, ['idUsuarioSupervisor', 'id_usuario', 'idUsuario', 'id'])),
  supervisorACargo: normalizeString(readValue(row, ['supervisorACargo', 'supervisor', 'nombre'])),
})

const mapTecnico = (row: Record<string, unknown>): CentralTecnico => ({
  idTecnico: normalizeString(readValue(row, ['id_tecnico', 'idTecnico', 'id_vendedor'])),
  tecnico: normalizeString(readValue(row, ['tecnico', 'nombre', 'vendedor'])),
})

const agruparGrupos = (rows: GrupoRow[]): CentralGrupo[] => {
  const grouped = new Map<string, CentralGrupo>()

  for (const row of rows) {
    if (!row.idGrupo || !row.nombre) continue

    const current = grouped.get(row.idGrupo)
    if (!current) {
      grouped.set(row.idGrupo, {
        idGrupo: row.idGrupo,
        nombre: row.nombre,
        supervisor: row.supervisor,
        supervisorAusente: row.supervisorAusente,
        tecnicoTemporalBackup: row.tecnicoTemporalBackup,
        idTecnicoTemporalBackup: row.idTecnicoTemporalBackup,
        fechaRegistro: row.fechaRegistro,
        cantidadSupervisores: row.cantidadSupervisores,
        cantidadTecnicos: row.cantidadTecnicos,
        tecnicos: row.tecnico ? [row.tecnico] : [],
      })
      continue
    }

    if (row.fechaRegistro && !current.fechaRegistro) current.fechaRegistro = row.fechaRegistro
    if (row.supervisor && !current.supervisor) current.supervisor = row.supervisor
    if (row.supervisorAusente !== undefined) current.supervisorAusente = row.supervisorAusente
    if (row.tecnicoTemporalBackup) current.tecnicoTemporalBackup = row.tecnicoTemporalBackup
    if (row.idTecnicoTemporalBackup) current.idTecnicoTemporalBackup = row.idTecnicoTemporalBackup
    if (row.cantidadSupervisores !== undefined) current.cantidadSupervisores = row.cantidadSupervisores
    if (row.cantidadTecnicos !== undefined) current.cantidadTecnicos = row.cantidadTecnicos

    if (row.tecnico) {
      const exists = current.tecnicos.some((item) => item.idUsuarioTecnico === row.tecnico?.idUsuarioTecnico)
      if (!exists) {
        current.tecnicos.push(row.tecnico)
      }
    }
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      cantidadTecnicos: item.cantidadTecnicos ?? item.tecnicos.length,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
}

export const fetchCentralGrupos = async (sucursal?: string): Promise<CentralGrupo[]> => {
  const { data } = await api.get(BASE_PATH, { params: { sucursal: sucursal || undefined } })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return agruparGrupos(rows.map(mapGrupoRow))
}

export const fetchCentralSupervisores = async (sucursal?: string): Promise<CentralSupervisor[]> => {
  const { data } = await api.get(`${BASE_PATH}/filtros/supervisores`, { params: { sucursal: sucursal || undefined } })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  const deduped = new Map<string, CentralSupervisor>()
  rows.map(mapSupervisor)
    .filter((item) => item.idUsuarioSupervisor && item.supervisorACargo)
    .forEach((item) => {
      const key = item.idUsuarioSupervisor.replace(/[^0-9]/g, '') || item.idUsuarioSupervisor.trim()
      if (!key || key === '0' || deduped.has(key)) return
      deduped.set(key, item)
    })
  return Array.from(deduped.values())
}

export const fetchCentralTecnicos = async (sucursal?: string): Promise<CentralTecnico[]> => {
  const { data } = await api.get(`${BASE_PATH}/filtros/tecnicos`, { params: { sucursal: sucursal || undefined } })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapTecnico).filter((item) => item.idTecnico && item.tecnico)
}

export const crearCentralGrupo = async (payload: { nombre: string; sucursal?: string }): Promise<Record<string, unknown>> => {
  const { data } = await api.post(BASE_PATH, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const asignarCentralSupervisor = async (payload: {
  idGrupo: number
  idUsuarioSupervisor: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/asignar-supervisor`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const asignarCentralTecnico = async (payload: {
  idGrupo: number
  idUsuarioTecnico: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/asignar-tecnico`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const quitarCentralTecnico = async (payload: {
  idGrupo: number
  idUsuarioTecnico: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/quitar-tecnico`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const eliminarCentralGrupo = async (payload: { idGrupo: number; sucursal?: string }): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/eliminar`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const marcarSupervisorAusenteCentral = async (payload: {
  idGrupo: number
  idUsuarioTecnico: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/supervisor-ausente`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const restaurarSupervisorCentral = async (payload: {
  idGrupo: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/restaurar-supervisor`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const cambiarColaboradorBackupCentral = async (payload: {
  idGrupo: number
  idUsuarioTecnico: number
  sucursal?: string
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/cambiar-colaborador-backup`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const cambiarSupervisorMasivoCentral = async (payload: {
  idSupervisorOrigen: number
  idSupervisorDestino: number
  idGrupos?: number[]
  sucursal?: string
  reasignarInicioJornada?: boolean
}): Promise<Record<string, unknown>> => {
  const { data } = await api.post(`${BASE_PATH}/cambiar-supervisor-masivo`, payload)
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: Record<string, unknown> }).data : data) as Record<string, unknown>
}

export const validarIniciosJornadaCambioSupervisorCentral = async (payload: {
  idSupervisorOrigen: number
  idSupervisorDestino: number
  idGrupos?: number[]
  sucursal?: string
}): Promise<{ requiereConfirmacion?: boolean; conflictos?: Record<string, unknown>[] }> => {
  const { data } = await api.post(`${BASE_PATH}/cambiar-supervisor-masivo/inicios-jornada`, payload)
  return (data && typeof data === 'object' && 'data' in data
    ? (data as { data: { requiereConfirmacion?: boolean; conflictos?: Record<string, unknown>[] } }).data
    : data) as { requiereConfirmacion?: boolean; conflictos?: Record<string, unknown>[] }
}
