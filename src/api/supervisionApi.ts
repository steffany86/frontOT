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
    idTecnico: normalizeString(
      readValue(row, [
        'idTecnico',
        'id_tecnico',
        'idtecnico',
        'id_vendedor',
        'idvendedor',
        'idUsuario',
        'id_usuario',
        'idUsuarioTecnico',
        'id_usuario_tecnico',
        'Id_Tecnico',
        'Id_Usuario',
      ])
    ),
    tecnico: normalizeString(
      readValue(row, [
        'tecnico',
        'nombre',
        'nombrevendedor',
        'vendedor',
        'Tecnico',
        'Nombre',
        'usuario',
        'Usuario',
      ])
    ),
    codigo: normalizeString(readValue(row, ['codigo', 'Codigo'])) || undefined,
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
  const supervisorNombre = normalizeString(readValue(row, ['supervisorNombre', 'nombreSupervisor', 'supervisor_nombre'])) || undefined
  const tecnicoPrincipalNombre = normalizeString(
    readValue(row, ['tecnicoPrincipalNombre', 'tecnicoNombre', 'nombreTecnicoPrincipal', 'tecnico_principal_nombre'])
  ) || undefined
  const tecnicoAuxiliarNombre = normalizeString(
    readValue(row, ['tecnicoAuxiliarNombre', 'auxiliarNombre', 'nombreTecnicoAuxiliar', 'tecnico_auxiliar_nombre'])
  ) || undefined

  return {
    idSupervision: normalizeString(readValue(row, ['idSupervision', 'id_supervision', 'idsupervision', 'Id_Supervision'])),
    fechaRegistro: normalizeString(readValue(row, ['fechaRegistro', 'fecha_registro', 'FechaRegistro'])) || undefined,
    idSupervisor: normalizeString(readValue(row, ['idSupervisor', 'id_supervisor', 'Id_Supervisor'])) || undefined,
    supervisor: supervisorNombre || normalizeString(readValue(row, ['supervisor', 'nombreSupervisor'])) || undefined,
    idTecnicoPrincipal: normalizeString(readValue(row, ['idTecnicoPrincipal', 'id_tecnico_principal', 'Id_TecnicoPrincipal'])) || undefined,
    tecnicoPrincipal: tecnicoPrincipalNombre || normalizeString(readValue(row, ['tecnicoPrincipal', 'nombreTecnicoPrincipal', 'tecnico'])) || undefined,
    idTecnicoAuxiliar: normalizeString(readValue(row, ['idTecnicoAuxiliar', 'id_tecnico_auxiliar', 'Id_TecnicoAuxiliar'])) || undefined,
    tecnicoAuxiliar:
      tecnicoAuxiliarNombre || normalizeString(readValue(row, ['tecnicoAuxiliar', 'nombreTecnicoAuxiliar', 'auxiliar'])) || undefined,
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
    estadoSup: normalizeString(readValue(row, ['estadoSup', 'estado_sup', 'estdo_sup', 'EstadoSup'])) || undefined,
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

export const fetchSupervisionesPendientes = async (params?: SupervisionListParams): Promise<SupervisionRegistro[]> => {
  const { data } = await api.get(`${SUPERVISION_BASE_PATH}/agenda`, { params: sanitizeListParams(params) })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapRegistro).filter((item) => item.idSupervision)
}

export const fetchBackofficeSupervisionesPorEstado = async (
  estado: 'pendiente' | 'completado',
  params?: SupervisionListParams
): Promise<SupervisionRegistro[]> => {
  const { data } = await api.get('/backoffice/supervision/listado', {
    params: {
      ...sanitizeListParams(params),
      estado,
    },
  })
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

export const realizarSupervisionPendiente = async (
  idSupervision: string,
  payload: SupervisionCreatePayload
): Promise<SupervisionCreateResult> => {
  const { data } = await api.post(`${SUPERVISION_BASE_PATH}/${idSupervision}/realizar`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return normalizeObjectResponse<SupervisionCreateResult>(data)
}

const mapInicioPendiente = (row: Record<string, unknown>): SupervisionInicioPendiente => ({
  idInicio: normalizeString(readValue(row, ['idInicio', 'id_inicio'])),
  idTecnico:
    normalizeString(
      readValue(row, [
        'idTecnico',
        'id_tecnico',
        'id_vendedor',
        'idVendedor',
        'idUsuarioTecnico',
        'id_usuario_tecnico',
        'idTecnicoPrincipal',
        'id_tecnico_principal',
      ])
    ) || undefined,
  tecnicoNombre:
    normalizeString(
      readValue(row, [
        'tecnicoNombre',
        'tecnico',
        'nombreTecnico',
        'nombre_tecnico',
        'tecnico_nombre',
        'tecnicoPrincipalNombre',
        'nombreTecnicoPrincipal',
        'tecnico_principal_nombre',
      ])
    ) || undefined,
  idAuxiliar:
    normalizeString(
      readValue(row, [
        'idAuxiliar',
        'id_auxiliar',
        'idTecnicoAuxiliar',
        'id_tecnico_auxiliar',
        'idAuxiliarTecnico',
      ])
    ) || undefined,
  auxiliarNombre:
    normalizeString(
      readValue(row, [
        'auxiliarNombre',
        'auxiliar',
        'nombreAuxiliar',
        'tecnicoAuxiliarNombre',
        'nombreTecnicoAuxiliar',
        'tecnico_auxiliar_nombre',
      ])
    ) || undefined,
  idSupervisor: normalizeString(readValue(row, ['idSupervisor', 'id_supervisor', 'id_encargado'])) || undefined,
  supervisorNombre: normalizeString(readValue(row, ['supervisorNombre', 'supervisor', 'nombreSupervisor'])) || undefined,
  fechaRegistro: normalizeString(readValue(row, ['fechaRegistro', 'fecha_registro'])) || undefined,
  fechaCierre: normalizeString(readValue(row, ['fechaCierre', 'fecha_cierre'])) || undefined,
  imagen: normalizeString(readValue(row, ['imagen', 'Imagen'])) || undefined,
  estado: normalizeString(readValue(row, ['estado', 'Estado'])) || undefined,
  capacitado: normalizeString(readValue(row, ['capacitado', 'Capacitado'])) || undefined,
  charla: normalizeString(readValue(row, ['charla', 'Charla'])) || undefined,
  botiquin: normalizeString(readValue(row, ['botiquin', 'Botiquin'])) || undefined,
  extintor: normalizeString(readValue(row, ['extintor', 'Extintor'])) || undefined,
  fechaVencimiento: normalizeString(readValue(row, ['fechaVencimiento', 'fecha_vencimiento'])) || undefined,
  equipoEpp: normalizeString(readValue(row, ['equipoEpp', 'equipo_epp'])) || undefined,
  estadoEpp: normalizeString(readValue(row, ['estadoEpp', 'estado_epp'])) || undefined,
  apr: normalizeString(readValue(row, ['apr', 'APR'])) || undefined,
  escalera: normalizeString(readValue(row, ['escalera', 'Escalera'])) || undefined,
  anclaje: normalizeString(readValue(row, ['anclaje', 'Anclaje'])) || undefined,
  ubicacionGeoref: normalizeString(readValue(row, ['ubicacionGeoref', 'ubicacion_georef', 'ubicacionGeoRef', 'ubicacion'])) || undefined,
  codigoClienteCierre:
    normalizeString(readValue(row, ['codigoClienteCierre', 'codigo_cliente_cierre', 'codigoCliente', 'codigo_cliente'])) || undefined,
  danoMaterial: normalizeString(readValue(row, ['danoMaterial', 'dano_material'])) || undefined,
  observacionMaterial:
    normalizeString(readValue(row, ['observacionMaterial', 'observacion_material', 'observacionDanoMaterial'])) || undefined,
  danoPersona: normalizeString(readValue(row, ['danoPersona', 'dano_persona'])) || undefined,
  observacionPersona:
    normalizeString(readValue(row, ['observacionPersona', 'observacion_persona', 'observacionDanoPersona'])) || undefined,
  novedadesTrabajo: normalizeString(readValue(row, ['novedadesTrabajo', 'novedades_trabajo'])) || undefined,
  observacionNovedades:
    normalizeString(readValue(row, ['observacionNovedades', 'observacion_novedades', 'observacionNovedadesTrabajo'])) || undefined,
  ubicacionCierreGeoref:
    normalizeString(
      readValue(row, [
        'ubicacionCierreGeoref',
        'ubicacion_cierre_georef',
        'ubicacionCierreGeoRef',
        'ubicacionGeoRefCierre',
        'ubicacion_georef_cierre',
      ])
    ) || undefined,
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

export const fetchSupervisores = async (): Promise<Array<{ idSupervisor: string; nombre: string }>> => {
  const { data } = await api.get('/backoffice/supervision/supervisores')
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows
    .map((row) => {
      const nombre = normalizeString(
        readValue(row, [
          'nombre',
          'Nombre',
          'Encargado',
          'supervisorACargo',
          'supervisor_a_cargo',
          'SupervisorACargo',
          'supervisor',
          'Supervisor',
          'usuario',
          'Usuario',
        ])
      )

      const rawId = normalizeString(
        readValue(row, [
          'idSupervisor',
          'id_supervisor',
          'idUsuarioSupervisor',
          'id_usuario_supervisor',
          'Id_Usuario',
          'idUsuario',
          'id_usuario',
          'id_encargado',
          'IdEncargado',
          'id',
          'Id',
        ])
      )

      const idFromName = (() => {
        const match = nombre.match(/\((\d+)\)\s*$/)
        return match ? match[1] : ''
      })()

      return {
        idSupervisor: rawId || idFromName,
        nombre,
        sucursal: normalizeString(readValue(row, ['sucursal', 'Sucursal'])) || undefined,
      }
    })
    .filter((item) => item.idSupervisor)
    .map((item) => ({
      ...item,
      nombre: item.nombre || `Supervisor ${item.idSupervisor}`,
    }))
}

export const fetchTecnicosPorSupervisor = async (idSupervisor: string, sucursal?: string, supervisorNombre?: string): Promise<SupervisionTecnico[]> => {
  const supervisorId = idSupervisor.trim()
  const normalizedSupervisorId = supervisorId.replace(/[^0-9]/g, '') || supervisorId
  const params: Record<string, unknown> = {
    idSupervisor: normalizedSupervisorId,
    idUsuarioSupervisor: normalizedSupervisorId,
  }
  if (sucursal?.trim()) params.sucursal = sucursal.trim()
  if (supervisorNombre?.trim()) params.supervisor = supervisorNombre.trim()
  
  const { data } = await api.get('/backoffice/supervision/tecnicos-por-supervisor', { params })
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapTecnico).filter((item) => item.idTecnico && item.tecnico)
}

export const createSupervisionPendiente = async (payload: SupervisionCreatePayload & { idSupervisorAsignado: string }): Promise<SupervisionCreateResult> => {
  const { data } = await api.post('/backoffice/supervision/pendiente', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  return normalizeObjectResponse<SupervisionCreateResult>(data)
}
