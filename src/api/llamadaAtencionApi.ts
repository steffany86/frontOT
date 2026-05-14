import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  LlamadaAtencionCreatePayload,
  LlamadaAtencionCreateResult,
  LlamadaAtencionListParams,
  LlamadaAtencionRegistro,
  LlamadaAtencionTecnico,
  LlamadaAtencionTecnicosParams,
  LlamadaAtencionTipoComunicacion,
} from '../types/llamadaAtencion'

const LLAMADA_ATENCION_BASE_PATH = '/supervisor/llamada-atencion'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
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

const mapTecnico = (row: Record<string, unknown>): LlamadaAtencionTecnico => {
  return {
    idTecnico: normalizeString(readValue(row, ['idTecnico', 'id_tecnico', 'idtecnico', 'id_vendedor', 'idvendedor'])),
    tecnico: normalizeString(readValue(row, ['tecnico', 'nombre', 'nombrevendedor', 'vendedor'])),
    codEmpleado: normalizeString(readValue(row, ['codEmpleado', 'cod_empleado', 'codempleado'])) || undefined,
    cuentaSf: normalizeString(readValue(row, ['cuentaSf', 'cuenta_sf', 'cuentasf'])) || undefined,
    salesforce: normalizeString(readValue(row, ['salesforce'])) || undefined,
    habilidad: normalizeString(readValue(row, ['habilidad'])) || undefined,
    vehiculo: normalizeString(readValue(row, ['vehiculo'])) || undefined,
  }
}

const mapTipoComunicacion = (row: Record<string, unknown>): LlamadaAtencionTipoComunicacion => {
  return {
    idTipoComunicacion: normalizeString(readValue(row, ['idTipoComunicacion', 'id_tipocomunicacion', 'id_tipocomunicacion'])),
    tipoComunicacion: normalizeString(readValue(row, ['tipoComunicacion', 'tipocomunicacion'])),
  }
}

const mapRegistro = (row: Record<string, unknown>): LlamadaAtencionRegistro => {
  return {
    idLlamadaAtencion: normalizeString(readValue(row, ['idLlamadaAtencion', 'id_llamadaatencion', 'id_llamadaatencion'])),
    idTecnico: normalizeString(readValue(row, ['idTecnico', 'id_tecnico', 'idtecnico'])) || undefined,
    tecnico: normalizeString(readValue(row, ['tecnico', 'tecnicoNombre', 'tecniconombre'])) || undefined,
    codEmpleado: normalizeString(readValue(row, ['codEmpleado', 'cod_empleado', 'codempleado'])) || undefined,
    idUsuarioSupervisor: Number(readValue(row, ['idUsuarioSupervisor', 'id_usuariosupervisor', 'idsupervisor'])) || undefined,
    idTipoComunicacion: normalizeString(readValue(row, ['idTipoComunicacion', 'id_tipocomunicacion'])) || undefined,
    tipoComunicacion: normalizeString(readValue(row, ['tipoComunicacion', 'tipocomunicacion'])) || undefined,
    fechaRegistro: normalizeString(readValue(row, ['fechaRegistro', 'fecha_registro'])) || undefined,
    motivo: normalizeString(readValue(row, ['motivo'])) || undefined,
    descripcion: normalizeString(readValue(row, ['descripcion'])) || undefined,
    comentarioColaborador: normalizeString(readValue(row, ['comentarioColaborador', 'comentariocolaborador'])) || undefined,
    acuerdos: normalizeString(readValue(row, ['acuerdos'])) || undefined,
    testigo: normalizeString(readValue(row, ['testigo'])) || undefined,
    fechaSeguimiento: normalizeString(readValue(row, ['fechaSeguimiento', 'fechaseguimiento'])) || undefined,
    firmaTecnico: normalizeString(readValue(row, ['firmaTecnico', 'firmatecnico'])) || undefined,
    firmaTestigo: normalizeString(readValue(row, ['firmaTestigo', 'firmatestigo'])) || undefined,
  }
}

const sanitizeListParams = (params?: LlamadaAtencionListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries({
    idTecnico: params.idTecnico?.trim() || undefined,
    fechaDesde: params.fechaDesde?.trim() || undefined,
    fechaHasta: params.fechaHasta?.trim() || undefined,
    limite: params.limite && Number.isFinite(params.limite) ? Math.trunc(params.limite) : undefined,
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : undefined
}

const sanitizeTecnicosParams = (params?: LlamadaAtencionTecnicosParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries({
    q: params.q?.trim() || undefined,
    limit: params.limit && Number.isFinite(params.limit) ? Math.trunc(params.limit) : undefined,
    sucursal: params.sucursal?.trim() || undefined,
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : undefined
}

export const fetchLlamadaAtencionTecnicos = async (
  params?: LlamadaAtencionTecnicosParams
): Promise<LlamadaAtencionTecnico[]> => {
  const { data } = await api.get(`${LLAMADA_ATENCION_BASE_PATH}/tecnicos`, {
    params: sanitizeTecnicosParams(params),
  })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapTecnico).filter((item) => item.idTecnico && item.tecnico)
}

export const fetchLlamadaAtencionTiposComunicacion = async (): Promise<LlamadaAtencionTipoComunicacion[]> => {
  const { data } = await api.get(`${LLAMADA_ATENCION_BASE_PATH}/tipos-comunicacion`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapTipoComunicacion).filter((item) => item.idTipoComunicacion && item.tipoComunicacion)
}

export const fetchLlamadasAtencion = async (params?: LlamadaAtencionListParams): Promise<LlamadaAtencionRegistro[]> => {
  const { data } = await api.get(LLAMADA_ATENCION_BASE_PATH, {
    params: sanitizeListParams(params),
  })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapRegistro).filter((item) => item.idLlamadaAtencion)
}

export const createLlamadaAtencion = async (
  payload: LlamadaAtencionCreatePayload
): Promise<LlamadaAtencionCreateResult> => {
  const { data } = await api.post(LLAMADA_ATENCION_BASE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return normalizeObjectResponse<LlamadaAtencionCreateResult>(data)
}
