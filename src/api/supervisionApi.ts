import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  SupervisionCatalogoItem,
  SupervisionCreatePayload,
  SupervisionCreateResult,
  SupervisionInicioPendiente,
  SupervisionListParams,
  SupervisionRegistro,
  SupervisionTecnico,
  SupervisionTecnicosParams,
} from '../types/supervision'

const SUPERVISION_BASE_PATH = '/supervisor/supervision'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
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
    normalizedMap.set(key.replace(/[_\s]/g, '').toLowerCase(), value)
  }

  for (const key of keys) {
    const value = normalizedMap.get(key.replace(/[_\s]/g, '').toLowerCase())
    if (value !== undefined && value !== null && value !== '') return value
  }

  return undefined
}

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const mapTecnico = (row: Record<string, unknown>): SupervisionTecnico => {
  return {
    idTecnico: normalizeString(readValue(row, ['idTecnico', 'id_tecnico', 'idtecnico', 'id_vendedor', 'idvendedor'])),
    tecnico: normalizeString(readValue(row, ['tecnico', 'nombre', 'nombrevendedor', 'vendedor'])),
    codEmpleado: normalizeString(readValue(row, ['codEmpleado', 'cod_empleado', 'codempleado'])) || undefined,
    cuentaSf: normalizeString(readValue(row, ['cuentaSf', 'cuenta_sf', 'cuentasf'])) || undefined,
    habilidad: normalizeString(readValue(row, ['habilidad'])) || undefined,
    vehiculo: normalizeString(readValue(row, ['vehiculo'])) || undefined,
    grupo: normalizeString(readValue(row, ['grupo', 'cuadrilla', 'ruta'])) || undefined,
    idRuta: normalizeString(readValue(row, ['idRuta', 'id_ruta', 'idruta'])) || undefined,
  }
}

const mapCatalogo = (row: Record<string, unknown>, idKeys: string[], nombreKeys: string[]): SupervisionCatalogoItem => {
  return {
    id: normalizeString(readValue(row, idKeys)),
    nombre: normalizeString(readValue(row, nombreKeys)),
  }
}

const mapRegistro = (row: Record<string, unknown>): SupervisionRegistro => {
  const idTipoSupervision = normalizeString(readValue(row, ['idTipoSupervision', 'id_tipo_supervision', 'Id_TipoSupervision'])) || undefined
  const idTipoTrabajo = normalizeString(readValue(row, ['idTipoTrabajo', 'id_tipo_trabajo', 'Id_TipoTrabajo'])) || undefined
  return {
    idSupervision: normalizeString(readValue(row, ['idSupervision', 'id_supervision', 'idsupervision', 'Id_Supervision'])),
    fechaRegistro: normalizeString(readValue(row, ['fechaRegistro', 'fecha_registro', 'FechaRegistro'])) || undefined,
    idSupervisor: normalizeString(readValue(row, ['idSupervisor', 'id_supervisor', 'Id_Supervisor'])) || undefined,
    supervisor: normalizeString(readValue(row, ['supervisor', 'nombreSupervisor'])) || undefined,
    idTecnicoPrincipal: normalizeString(readValue(row, ['idTecnicoPrincipal', 'id_tecnico_principal', 'Id_TecnicoPrincipal'])) || undefined,
    tecnicoPrincipal: normalizeString(readValue(row, ['tecnicoPrincipal', 'nombreTecnicoPrincipal'])) || undefined,
    idTecnicoAuxiliar: normalizeString(readValue(row, ['idTecnicoAuxiliar', 'id_tecnico_auxiliar', 'Id_TecnicoAuxiliar'])) || undefined,
    tecnicoAuxiliar: normalizeString(readValue(row, ['tecnicoAuxiliar', 'nombreTecnicoAuxiliar'])) || undefined,
    idTipoSupervision,
    tipoSupervision: normalizeString(readValue(row, ['tipoSupervision', 'TipoSupervision'])) || idTipoSupervision || undefined,
    idTipoTrabajo,
    tipoTrabajo: normalizeString(readValue(row, ['tipoTrabajo', 'TipoTrabajo'])) || idTipoTrabajo || undefined,
    idTipoPenalizacion: normalizeString(readValue(row, ['idTipoPenalizacion', 'id_tipo_penalizacion', 'Id_TipoPenalizacion'])) || undefined,
    tipoPenalizacion: normalizeString(readValue(row, ['tipoPenalizacion', 'TipoPenalizacion'])) || undefined,
    supervisionPor: normalizeString(readValue(row, ['supervisionPor', 'supervision_por', 'Supervision_Por'])) || undefined,
    tecnologia: normalizeString(readValue(row, ['tecnologia', 'Tecnologia'])) || undefined,
    codigo: normalizeString(readValue(row, ['codigo', 'Codigo'])) || undefined,
    ordenTrabajo: normalizeString(readValue(row, ['ordenTrabajo', 'OrdenTrabajo'])) || undefined,
    tipoRevision: normalizeString(readValue(row, ['tipoRevision', 'TipoRevision'])) || undefined,
    observacion: normalizeString(readValue(row, ['observacion', 'Observacion'])) || undefined,
    descripcionAdicionalObservacion:
      normalizeString(readValue(row, ['descripcionAdicionalObservacion', 'DescripcionAdicionalObservacion'])) || undefined,
    ubicacion: normalizeString(readValue(row, ['ubicacion', 'Ubicacion'])) || undefined,
    fotoBoletaSupervision: normalizeString(readValue(row, ['fotoBoletaSupervision', 'FotoBoletaSupervision'])) || undefined,
    fotoCanalesPilos: normalizeString(readValue(row, ['fotoCanalesPilos', 'FotoCanalesPilos'])) || undefined,
    fotoNivelesDocsis: normalizeString(readValue(row, ['fotoNivelesDocsis', 'FotoNivelesDocsis'])) || undefined,
    fotoMedicionRuido: normalizeString(readValue(row, ['fotoMedicionRuido', 'FotoMedicionRuido'])) || undefined,
    fotoBarridoCanales: normalizeString(readValue(row, ['fotoBarridoCanales', 'FotoBarridoCanales'])) || undefined,
    fotoObservacion1: normalizeString(readValue(row, ['fotoObservacion1', 'FotoObservacion1'])) || undefined,
    fotoObservacion2: normalizeString(readValue(row, ['fotoObservacion2', 'FotoObservacion2'])) || undefined,
    fotoObservacion3: normalizeString(readValue(row, ['fotoObservacion3', 'FotoObservacion3'])) || undefined,
    fotoObservacion4: normalizeString(readValue(row, ['fotoObservacion4', 'FotoObservacion4'])) || undefined,
  }
}

const sanitizeListParams = (params?: SupervisionListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries({
    fechaDesde: params.fechaDesde?.trim() || undefined,
    fechaHasta: params.fechaHasta?.trim() || undefined,
    limite: params.limite && Number.isFinite(params.limite) ? Math.trunc(params.limite) : undefined,
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : undefined
}

const sanitizeTecnicosParams = (params?: SupervisionTecnicosParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries({
    q: params.q?.trim() || undefined,
    limit: params.limit && Number.isFinite(params.limit) ? Math.trunc(params.limit) : undefined,
    sucursal: params.sucursal?.trim() || undefined,
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : undefined
}

export const fetchSupervisionTecnicos = async (params?: SupervisionTecnicosParams): Promise<SupervisionTecnico[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/catalogos/tecnicos`, {
    params: sanitizeTecnicosParams(params),
  })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapTecnico).filter((item) => item.idTecnico && item.tecnico)
}

export const fetchSupervisionTiposSupervision = async (): Promise<SupervisionCatalogoItem[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/catalogos/tipos-supervision`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows
    .map((row) => mapCatalogo(row, ['idTipoSupervision', 'Id_TipoSupervision'], ['tipoSupervision', 'Nombre']))
    .filter((item) => item.id && item.nombre)
}

export const fetchSupervisionTiposTrabajo = async (): Promise<SupervisionCatalogoItem[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/catalogos/tipos-trabajo`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows
    .map((row) => mapCatalogo(row, ['idTipoTrabajo', 'Id_TipoTrabajo'], ['tipoTrabajo', 'Nombre']))
    .filter((item) => item.id && item.nombre)
}

export const fetchSupervisionTiposPenalizacion = async (): Promise<SupervisionCatalogoItem[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/catalogos/tipos-penalizacion`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows
    .map((row) => mapCatalogo(row, ['idTipoPenalizacion', 'Id_TipoPenalizacion'], ['tipoPenalizacion', 'Nombre']))
    .filter((item) => item.id && item.nombre)
}

export const fetchSupervisiones = async (params?: SupervisionListParams): Promise<SupervisionRegistro[]> => {
  const { data } = await api.get(SUPERVISION_BASE_PATH, { params: sanitizeListParams(params) })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapRegistro).filter((item) => item.idSupervision)
}

export const fetchSupervisionDetalle = async (idSupervision: string): Promise<SupervisionRegistro> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/${idSupervision}`)
  const payload = normalizeObjectResponse<Record<string, unknown>>(data)
  return mapRegistro(payload)
}

export const createSupervision = async (payload: SupervisionCreatePayload): Promise<SupervisionCreateResult> => {
  const { data } = await api.post(SUPERVISION_BASE_PATH, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return normalizeObjectResponse<SupervisionCreateResult>(data)
}

const mapInicioPendiente = (row: Record<string, unknown>): SupervisionInicioPendiente => ({
  idInicio: normalizeString(readValue(row, ['idInicio', 'id_inicio'])),
  idTecnico: normalizeString(readValue(row, ['idTecnico', 'id_tecnico'])) || undefined,
  tecnicoNombre: normalizeString(readValue(row, ['tecnicoNombre', 'tecnico', 'nombreTecnico'])) || undefined,
  idAuxiliar: normalizeString(readValue(row, ['idAuxiliar', 'id_auxiliar'])) || undefined,
  auxiliarNombre: normalizeString(readValue(row, ['auxiliarNombre', 'auxiliar', 'nombreAuxiliar'])) || undefined,
  idSupervisor: normalizeString(readValue(row, ['idSupervisor', 'id_supervisor', 'id_encargado'])) || undefined,
  fechaRegistro: normalizeString(readValue(row, ['fechaRegistro', 'fecha_registro'])) || undefined,
  fechaCierre: normalizeString(readValue(row, ['fechaCierre', 'fecha_cierre'])) || undefined,
  imagen: normalizeString(readValue(row, ['imagen', 'Imagen'])) || undefined,
  estado: normalizeString(readValue(row, ['estado', 'Estado'])) || undefined,
})

export const fetchIniciosJornadaPendientesSupervision = async (): Promise<SupervisionInicioPendiente[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/jornadas/pendientes`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapInicioPendiente).filter((item) => item.idInicio)
}

export const fetchIniciosJornadaConfirmadosHoySupervision = async (): Promise<SupervisionInicioPendiente[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/jornadas/confirmadas-hoy`)
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapInicioPendiente).filter((item) => item.idInicio)
}

export const aprobarInicioJornadaPendiente = async (idInicio: string): Promise<void> => {
  await api.post(`${SUPERVISION_BASE_PATH}/jornadas/${idInicio}/aprobar`)
}

export const rechazarInicioJornadaPendiente = async (idInicio: string): Promise<void> => {
  await api.post(`${SUPERVISION_BASE_PATH}/jornadas/${idInicio}/rechazar`)
}
