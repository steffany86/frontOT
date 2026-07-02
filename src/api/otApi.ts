import axios from 'axios'
import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  ListaOtParams,
  OtCreatePayload,
  OtCreateResult,
  OtCreateResponseEnvelope,
  OtDetail,
  OtFechaPayload,
  OtListParams,
  OtMaterial,
  OtRealizadaPayload,
  OtSummary,
  OtUpdatePayload,
} from '../types/ot'

type UnknownRecord = Record<string, unknown>
type RegistroAgendaValidacionApi = {
  bloqueado?: boolean
  mensaje?: string
  codigoBloqueo?: string
  cierreAlmacenBloqueado?: boolean
  cierrePrPdBloqueado?: boolean
  movimientosBloqueados?: boolean
}

export type OtDetalleMaterialPayload = {
  idProducto: number
  idTipoMaterial: number
  serie?: string
  chipId?: string
  cantidad: number
  entregado?: boolean
}

export type OtRegistrarDetallePayload = {
  numeroOrden: string
  idVenta?: number
  codigoCliente?: number
  fechaEjecucion?: string
  idEstado?: number
  observacion?: string
  materiales: OtDetalleMaterialPayload[]
}

export type OtCargoUsuarioItemPayload = {
  idProducto: number
  serie?: string
  chipId?: string
  cantidad: number
  existe?: string
}

export type OtCargoUsuarioPayload = {
  numeroOrden: string
  items: OtCargoUsuarioItemPayload[]
}

export type OtRegistroCompletoVenta = {
  cabecera: UnknownRecord | null
  instalados: UnknownRecord[]
  retirados: UnknownRecord[]
  cargoUsuario: UnknownRecord[]
}

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

const pickValue = (record: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }
  return undefined
}

const readString = (record: UnknownRecord, keys: string[]): string => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const readNumber = (record: UnknownRecord, keys: string[]): number | undefined => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const readBoolean = (record: UnknownRecord, keys: string[]): boolean | undefined => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 's'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return undefined
}

const unwrapData = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

const mapOtSummary = (row: UnknownRecord): OtSummary => {
  const id = readNumber(row, ['id', 'Id', 'idVenta', 'Id_Venta', 'idOT', 'IdOT']) ?? 0
  const codigo = readString(row, ['codigo', 'Codigo', 'ordenTrabajo', 'OrdenTrabajo', 'numeroOrden', 'NumeroOrden'])
  const fecha = readString(row, [
    'inicio_agendado',
    'Inicio_Agendado',
    'InicioAgendado',
    'fecha',
    'Fecha',
    'fechaEjecucion',
    'Fecha_Ejecucion',
    'FechaEjecucion',
  ])
  const cliente = readString(row, ['cliente', 'Cliente', 'nombreCliente', 'NombreCliente'])
  const tecnico = readString(row, ['tecnico', 'Tecnico', 'nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
  const estado = readString(row, ['estado', 'Estado', 'estadoOt', 'Estado_OT'])
  const direccion = readString(row, ['direccion', 'Direccion', 'domicilio'])
  const ruta = readString(row, ['ruta', 'Ruta', 'grupo', 'Grupo'])
  const idUsuario = readNumber(row, ['idUsuario', 'Id_Usuario', 'idTecnico', 'Id_Tecnico', 'idVendedor', 'Id_Vendedor'])
  const nombreUsuario = readString(row, ['nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
  const pendiente = readBoolean(row, ['pendiente', 'Pendiente', 'otRealizada', 'OTRealizada'])

  return {
    ...row,
    id,
    codigo,
    fecha,
    cliente,
    tecnico,
    estado,
    direccion: direccion || undefined,
    ruta: ruta || undefined,
    idUsuario,
    nombreUsuario: nombreUsuario || undefined,
    ordenTrabajo: codigo || undefined,
    pendiente,
  }
}

const mapOtHeader = (row: UnknownRecord): OtDetail['header'] => {
  const mapped = mapOtSummary(row)
  return {
    id: mapped.id,
    codigo: mapped.codigo || String(mapped.id ?? ''),
    fecha: mapped.fecha,
    cliente: mapped.cliente,
    direccion: mapped.direccion ?? '',
    tecnico: mapped.tecnico,
    estado: mapped.estado,
    observaciones: readString(row, ['observacion', 'Observacion', 'observaciones', 'Observaciones']) || undefined,
  }
}

const mapMaterial = (row: UnknownRecord): OtMaterial => {
  return {
    ...row,
    id: readNumber(row, ['id', 'Id', 'idDetalle', 'IdDetalle']) ?? 0,
    codigo: readString(row, ['codigo', 'Codigo', 'codigoMaterial', 'CodigoMaterial']),
    descripcion: readString(row, ['descripcion', 'Descripcion', 'material', 'Material']),
    cantidad: readNumber(row, ['cantidad', 'Cantidad', 'cant', 'Cant']) ?? 0,
    unidad: readString(row, ['unidad', 'Unidad', 'uMedida', 'UMedida']),
  }
}

const sanitizeParams = (params?: OtListParams): Record<string, string | number | boolean> | undefined => {
  if (!params) return undefined
  const nextEntries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (nextEntries.length === 0) return undefined
  return Object.fromEntries(nextEntries) as Record<string, string | number | boolean>
}

const shouldFallbackToLegacyEndpoint = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 404 || status === 405
}

export const fetchOtList = async (params?: OtListParams): Promise<OtSummary[]> => {
  const { data } = await api.get('/ot', {
    params: sanitizeParams(params),
  })
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapOtSummary)
}

export const fetchOtFinalizadas = async (params?: { fecha?: string; usuario?: number }): Promise<OtSummary[]> => {
  const { data } = await api.get('/ot/finalizadas', {
    params: sanitizeParams(params),
  })
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapOtSummary)
}

const buildListaOtQuery = (params: ListaOtParams): string => {
  const searchParams = new URLSearchParams()
  searchParams.set('fecha', params.fecha)

  if (params.estado?.trim()) {
    searchParams.set('estado', params.estado.trim())
  }

  if (params.estados?.length) {
    params.estados
      .map((estado) => estado.trim())
      .filter(Boolean)
      .forEach((estado) => {
        searchParams.append('estados', estado)
      })
  }

  // El tecnico se resuelve en backend por sesion -> idUsuario -> idVendedor -> salesForce.
  // Evitamos enviar nombre desde front para no romper el match del SP.
  if (typeof params.idUsuario === 'number' && Number.isFinite(params.idUsuario) && params.idUsuario > 0) {
    searchParams.set('idUsuario', String(params.idUsuario))
  }

  if (params.rol?.trim()) {
    searchParams.set('rol', params.rol.trim())
  }

  return searchParams.toString()
}

export const fetchListaOt = async (params: ListaOtParams): Promise<OtSummary[]> => {
  const query = buildListaOtQuery(params)
  const endpoint = query ? `/ListaOt?${query}` : '/ListaOt'
  const { data } = await api.get(endpoint)
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapOtSummary)
}

const buildOtSummaryMergeKey = (row: OtSummary): string => {
  const source = row as UnknownRecord
  const ot = readString(source, [
    'ot',
    'OT',
    'ordenTrabajo',
    'OrdenTrabajo',
    'orden_trabajo',
    'Orden_Trabajo',
    'codigo',
    'Codigo',
  ]).trim()
  const cliente = readString(source, [
    'cliente_nro',
    'Cliente_Nro',
    'clienteNro',
    'ClienteNro',
    'codigo_cliente',
    'Codigo_Cliente',
    'codigoCliente',
    'CodigoCliente',
    'CODIGO',
  ]).trim()
  if (ot && cliente) {
    return `otcliente:${ot}|${cliente}`
  }

  const idVenta = readNumber(source, ['id_venta', 'Id_Venta', 'idVenta', 'IdVenta', 'id', 'Id'])
  if (typeof idVenta === 'number' && Number.isFinite(idVenta) && idVenta > 0) {
    return `idventa:${Math.trunc(idVenta)}`
  }

  const fecha = readString(source, [
    'fechaEjecucion',
    'Fecha_Ejecucion',
    'FechaEjecucion',
    'fecha',
    'Fecha',
    'inicio_agendado',
    'Inicio_Agendado',
  ]).trim()
  const origen = readString(source, ['origen', 'Origen']).trim().toLowerCase()
  return `${ot}|${cliente}|${fecha}|${origen}`
}

const mergeOtSummaries = (...groups: OtSummary[][]): OtSummary[] => {
  const out = new Map<string, OtSummary>()
  const isManualRow = (row: OtSummary): boolean => {
    const source = row as UnknownRecord
    const origen = readString(source, ['origen', 'Origen']).trim().toLowerCase()
    return origen.includes('manual')
  }
  for (const rows of groups) {
    for (const row of rows) {
      const key = buildOtSummaryMergeKey(row)
      const current = out.get(key)
      if (!current) {
        out.set(key, row)
        continue
      }
      const currentManual = isManualRow(current)
      const candidateManual = isManualRow(row)
      if (currentManual && !candidateManual) {
        out.set(key, row)
      }
    }
  }
  return Array.from(out.values())
}

const filterOtRowsByTecnico = (rows: OtSummary[], tecnico?: string): OtSummary[] => {
  const tecnicoNorm = (tecnico ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!tecnicoNorm) return rows

  return rows.filter((row) => {
    const source = row as UnknownRecord
    const tecnicoRow = readString(source, [
      'tecnico',
      'Tecnico',
      'tecnico_nombre',
      'tecnicoNombre',
      'nombre_tecnico',
      'NombreTecnico',
      'nombreUsuario',
      'NombreUsuario',
      'usuario',
      'Usuario',
      'nombre',
      'Nombre',
      'vendedor',
      'Vendedor',
      'nombreVendedor',
      'NombreVendedor',
    ])
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    if (!tecnicoRow) return false
    return tecnicoRow === tecnicoNorm || tecnicoRow.includes(tecnicoNorm) || tecnicoNorm.includes(tecnicoRow)
  })
}

const fetchOtWebPendientesConFallback = async (params: {
  fecha: string
  idUsuario?: number
  tecnico?: string
  rol?: string
}): Promise<OtSummary[]> => {
  const otWebRows = await fetchOtList({
    fecha: params.fecha,
    usuario: params.idUsuario,
    rol: params.rol,
    pendiente: true,
  }).catch(() => [])
  if (otWebRows.length > 0) {
    return otWebRows
  }

  const otWebRowsSinFiltro = await fetchOtList({
    fecha: params.fecha,
    pendiente: true,
  }).catch(() => [])
  return filterOtRowsByTecnico(otWebRowsSinFiltro, params.tecnico)
}

export const fetchSupervisorUltimoEstadoDia = async (params: {
  fecha: string
  idUsuario?: number
  tecnico?: string
  rol?: string
}): Promise<OtSummary[]> => {
  try {
    const listaOtRows = await fetchListaOt({
      fecha: params.fecha,
      tecnico: params.tecnico,
      idUsuario: params.idUsuario,
      rol: params.rol,
    })
    const otWebRows = await fetchOtWebPendientesConFallback(params)

    if (listaOtRows.length === 0) {
      return otWebRows
    }
    if (otWebRows.length === 0) {
      return listaOtRows
    }
    return mergeOtSummaries(listaOtRows, otWebRows)
  } catch (listaOtError) {
    const listaOtStatus = (listaOtError as { response?: { status?: number } })?.response?.status
    if (listaOtStatus === 500 || listaOtStatus === 401 || listaOtStatus === 403) {
      throw listaOtError
    }

    // Fallback legado por compatibilidad con entornos antiguos.
    const queryParams: Record<string, string | number> = { fecha: params.fecha }
    if (typeof params.idUsuario === 'number' && Number.isFinite(params.idUsuario) && params.idUsuario > 0) {
      queryParams.idUsuario = params.idUsuario
    }
    if (typeof params.tecnico === 'string' && params.tecnico.trim()) {
      queryParams.tecnico = params.tecnico.trim()
    }

    const endpoints = [
      '/supervisor/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO',
      '/ot/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO',
      '/spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO',
    ]

    for (const endpoint of endpoints) {
      try {
        const { data } = await api.get(endpoint, { params: queryParams })
        const rows = normalizeArrayResponse<UnknownRecord>(data)
        const mapped = rows.map(mapOtSummary)
        if (mapped.length > 0) {
          const otWebRows = await fetchOtWebPendientesConFallback(params)
          return otWebRows.length > 0 ? mergeOtSummaries(mapped, otWebRows) : mapped
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 405 || status === 500) {
          continue
        }
        throw error
      }
    }

    return await fetchOtList({
      fecha: params.fecha,
      usuario: params.idUsuario,
      rol: params.rol,
      pendiente: true,
    }).catch(() => {
      throw listaOtError
    })
  }
}

export const fetchOtDetail = async (id: number): Promise<OtDetail> => {
  const { data } = await api.get(`/ot/${id}`)
  const raw = unwrapData(data)
  if (!isRecord(raw)) {
    throw new Error('Respuesta de detalle OT sin formato esperado.')
  }
  return { header: mapOtHeader(raw) }
}

export const fetchOtByNumero = async (numero: string, idSucursal?: number): Promise<UnknownRecord> => {
  const params =
    typeof idSucursal === 'number' && Number.isFinite(idSucursal) && idSucursal > 0
      ? { idSucursal }
      : undefined
  const { data } = await api.get(`/ot/numero/${encodeURIComponent(numero.trim())}`, params ? { params } : undefined)
  const raw = unwrapData(data)
  if (!isRecord(raw)) {
    throw new Error('Respuesta de OT por numero sin formato esperado.')
  }
  return raw
}

export type OtMaterialTipo = 'instalados' | 'retirados' | 'excedentes' | 'cargo-usuario'

export const fetchOtMateriales = async (id: number, tipo: OtMaterialTipo): Promise<OtMaterial[]> => {
  const { data } = await api.get(`/ot/${id}/${tipo}`)
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapMaterial)
}

const toUnknownRecord = (payload: unknown): UnknownRecord | null => {
  const unwrapped = unwrapData(payload)
  if (Array.isArray(unwrapped)) {
    const first = normalizeArrayResponse<UnknownRecord>(unwrapped)[0]
    return first && isRecord(first) ? first : null
  }
  return isRecord(unwrapped) ? (unwrapped as UnknownRecord) : null
}

const toUnknownRecordList = (payload: unknown): UnknownRecord[] => {
  const unwrapped = unwrapData(payload)
  return normalizeArrayResponse<UnknownRecord>(unwrapped)
}

export const fetchOtRegistroCompleto = async (idVenta: number, idSucursal?: number): Promise<OtRegistroCompletoVenta> => {
  if (!Number.isFinite(idVenta) || idVenta <= 0) {
    throw new Error('idVenta invalido para cargar registro completo.')
  }
  const params =
    typeof idSucursal === 'number' && Number.isFinite(idSucursal) && idSucursal > 0
      ? { idSucursal }
      : undefined

  try {
    const { data } = await api.get(`/ot/${idVenta}/registro-completo`, params ? { params } : undefined)
    const unwrapped = unwrapData(data)
    const payload = isRecord(unwrapped) ? (unwrapped as UnknownRecord) : {}
    return {
      cabecera: toUnknownRecord(payload.cabecera),
      instalados: toUnknownRecordList(payload.instalados),
      retirados: toUnknownRecordList(payload.retirados),
      cargoUsuario: toUnknownRecordList(payload.cargoUsuario),
    }
  } catch (error) {
    if (!shouldFallbackToLegacyEndpoint(error)) throw error
  }

  const [cabeceraRaw, instaladosRaw, retiradosRaw, cargoRaw] = await Promise.all([
    api.get(`/ot/${idVenta}`, params ? { params } : undefined),
    api.get(`/ot/${idVenta}/instalados`, params ? { params } : undefined),
    api.get(`/ot/${idVenta}/retirados`, params ? { params } : undefined),
    api.get(`/ot/${idVenta}/cargo-usuario`, params ? { params } : undefined),
  ])

  return {
    cabecera: toUnknownRecord(cabeceraRaw.data),
    instalados: toUnknownRecordList(instaladosRaw.data),
    retirados: toUnknownRecordList(retiradosRaw.data),
    cargoUsuario: toUnknownRecordList(cargoRaw.data),
  }
}

export const createOtRealizada = async (payload: OtRealizadaPayload, idSucursal?: number): Promise<void> => {
  const params =
    typeof idSucursal === 'number' && Number.isFinite(idSucursal) && idSucursal > 0
      ? { idSucursal }
      : undefined
  await api.post('/ot/realizada', payload, params ? { params } : undefined)
}

export const createOtDetalle = async (
  payload: OtRegistrarDetallePayload,
  idSucursal?: number
): Promise<{ idVenta?: number; numeroOrden?: number }> => {
  const params =
    typeof idSucursal === 'number' && Number.isFinite(idSucursal) && idSucursal > 0
      ? { idSucursal }
      : undefined
  console.info('[OT][DETALLE][REQUEST]', {
    endpoint: '/ot/detalle-materiales',
    query: params ?? {},
    body: payload,
  })
  const { data } = await api.post('/ot/detalle-materiales', payload, params ? { params } : undefined)
  const raw = unwrapData(data)
  if (!isRecord(raw)) return {}
  const idVenta =
    readNumber(raw, ['idVenta', 'IdVenta', 'id_venta', 'Id_Venta', 'idCodigoVenta', 'IdCodigoVenta', 'id_codigoventa', 'Id_CodigoVenta']) ??
    undefined
  return {
    idVenta,
    numeroOrden: readNumber(raw, ['numeroOrden', 'NumeroOrden', 'ordenTrabajo', 'OrdenTrabajo']) ?? undefined,
  }
}

export const createOtCargoUsuario = async (payload: OtCargoUsuarioPayload, idSucursal?: number): Promise<{ guardados?: number }> => {
  const params =
    typeof idSucursal === 'number' && Number.isFinite(idSucursal) && idSucursal > 0
      ? { idSucursal }
      : undefined
  const { data } = await api.post('/ot/cargo-usuario', payload, params ? { params } : undefined)
  const raw = unwrapData(data)
  if (!isRecord(raw)) return {}
  return {
    guardados: readNumber(raw, ['guardados', 'Guardados']) ?? undefined,
  }
}

export const updateOtDatos = async (id: number, payload: OtUpdatePayload): Promise<void> => {
  await api.put(`/ot/${id}/datos`, payload)
}

export const updateOtFecha = async (id: number, payload: OtFechaPayload): Promise<void> => {
  await api.put(`/ot/${id}/fecha`, payload)
}

export const deleteOt = async (
  id: number,
  modo: 'con_cu' | 'solo_cu',
  idUsuario?: number
): Promise<void> => {
  const params: Record<string, string | number> = { modo }
  if (idUsuario !== undefined && idUsuario !== null) {
    params.usuario = idUsuario
  }
  await api.delete(`/ot/${id}`, { params })
}

const readEnvelopeNumber = (
  record: UnknownRecord,
  directKeys: string[],
  nestedKeys: string[]
): number | null => {
  const directValue = pickValue(record, directKeys)
  if (typeof directValue === 'number' && Number.isFinite(directValue)) return directValue
  if (typeof directValue === 'string') {
    const parsed = Number(directValue)
    if (Number.isFinite(parsed)) return parsed
  }

  const nestedCandidate = pickValue(record, ['data'])
  if (isRecord(nestedCandidate)) {
    const nestedValue = pickValue(nestedCandidate, nestedKeys)
    if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) return nestedValue
    if (typeof nestedValue === 'string') {
      const parsed = Number(nestedValue)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

export const createOt = async (payload: OtCreatePayload): Promise<OtCreateResult> => {
  const normalizedPayload: OtCreatePayload = {
    ...payload,
    tieneObservacion: payload.tieneObservacion ?? false,
  }
  const { data } = await api.post<OtCreateResponseEnvelope | UnknownRecord>('/ot', normalizedPayload)
  const payloadRecord = isRecord(data) ? data : {}

  const idVenta = readEnvelopeNumber(
    payloadRecord,
    ['idVenta', 'Id_Venta'],
    ['idVenta', 'Id_Venta']
  )
  const ordenTrabajo = readEnvelopeNumber(
    payloadRecord,
    ['ordenTrabajo', 'OrdenTrabajo'],
    ['ordenTrabajo', 'OrdenTrabajo']
  )

  return {
    idVenta,
    ordenTrabajo,
  }
}

const parseBooleanLike = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 's', 'yes', 'y'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return null
}

const parseExistenceFromString = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  if (['true', 'si', 'sí', 'yes', 'y'].includes(normalized)) return true
  if (['false', 'no', 'n'].includes(normalized)) return false
  if (/^\d+$/.test(normalized)) return Number(normalized) > 0

  if (normalized.includes('no existe') || normalized.includes('sin registro') || normalized.includes('ningun registro')) return false
  if (normalized.includes('existe') || normalized.includes('registrado') || normalized.includes('encontrado')) return true

  const numericMatch = normalized.match(/\b\d+\b/)
  if (numericMatch && (normalized.includes('venta') || normalized.includes('detalle') || normalized.includes('registro'))) {
    return Number(numericMatch[0]) > 0
  }

  return null
}

const resolveVentaExistsDeep = (payload: unknown): boolean | null => {
  if (payload === undefined || payload === null) return null

  if (typeof payload === 'number') return payload > 0
  if (typeof payload === 'boolean') return payload
  if (typeof payload === 'string') return parseExistenceFromString(payload)

  const primitiveFlag = parseBooleanLike(payload)
  if (primitiveFlag !== null) return primitiveFlag

  if (Array.isArray(payload)) {
    if (payload.length === 0) return false
    let sawFalse = false
    for (const item of payload) {
      const result = resolveVentaExistsDeep(item)
      if (result === true) return true
      if (result === false) sawFalse = true
    }
    return sawFalse ? false : null
  }

  if (!isRecord(payload)) return null

  const priorityKeys = [
    'existeVenta',
    'ExisteVenta',
    'tieneVenta',
    'TieneVenta',
    'ventaExiste',
    'VentaExiste',
    'registrado',
    'Registrado',
    'idVenta',
    'IdVenta',
    'id_venta',
    'Id_Venta',
    'total',
    'Total',
    'count',
    'Count',
    'cantidad',
    'Cantidad',
    'message',
    'Message',
    'mensaje',
    'Mensaje',
  ]
  for (const key of priorityKeys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue
    const result = resolveVentaExistsDeep(payload[key])
    if (result !== null) return result
  }

  for (const value of Object.values(payload)) {
    const result = resolveVentaExistsDeep(value)
    if (result === true) return true
  }

  return null
}

const resolveVentaExists = (payload: unknown): boolean => {
  const deepResolved = resolveVentaExistsDeep(payload)
  if (deepResolved !== null) return deepResolved

  if (payload === undefined || payload === null) return false

  const parsedPrimitive = parseBooleanLike(payload)
  if (parsedPrimitive !== null) return parsedPrimitive

  if (Array.isArray(payload)) {
    if (payload.length === 0) return false
    if (payload.length === 1) return resolveVentaExists(payload[0])
    return true
  }

  if (!isRecord(payload)) return false

  const message = readString(payload, ['message', 'Message', 'mensaje', 'Mensaje']).trim().toLowerCase()
  if (message) {
    if (message.includes('no existe') || message.includes('sin registro') || message.includes('no encontrado')) return false
    if (message.includes('existe') || message.includes('encontrado') || message.includes('registrado')) return true
  }

  const directFlag = parseBooleanLike(
    pickValue(payload, ['existeVenta', 'ExisteVenta', 'tieneVenta', 'TieneVenta', 'ventaExiste', 'VentaExiste', 'registrado', 'Registrado'])
  )
  if (directFlag !== null) return directFlag

  const idVenta = readNumber(payload, ['idVenta', 'IdVenta', 'id_venta', 'Id_Venta']) ?? 0
  const idCodigoVenta = readNumber(payload, ['idCodigoVenta', 'IdCodigoVenta', 'id_codigoventa', 'Id_CodigoVenta']) ?? 0
  if (idVenta > 0 || idCodigoVenta > 0) return true

  const total = readNumber(payload, ['total', 'Total', 'count', 'Count', 'cantidad', 'Cantidad']) ?? 0
  if (total > 0) return true

  // If backend returns a row with venta-like keys, we treat it as existing sale/detail.
  const rowLikeOt = readString(payload, ['ot', 'OT', 'ordenTrabajo', 'OrdenTrabajo']).trim()
  const rowLikeCliente = readString(payload, ['clienteNro', 'ClienteNro', 'cliente_nro', 'Cliente_Nro', 'nroCliente', 'NroCliente']).trim()
  const rowLikeFecha = readString(payload, ['fecha', 'Fecha', 'fechaVenta', 'FechaVenta', 'fechaRegistro', 'FechaRegistro']).trim()
  if (rowLikeOt || rowLikeCliente || rowLikeFecha) return true

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length > 0) return true
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return resolveVentaExists(payload.data)
  }

  return false
}

export const validateVentaYDetalle = async (params: {
  fecha: string
  ot: string
  clienteNro: string
  incluirManual?: boolean
  desdeAgenda?: boolean
}): Promise<{
  idVenta?: number
  idRuta?: number
  existeVenta: boolean
  tieneDetalle: boolean
  tieneDetalleEnCodigoVenta: boolean
  cantidadVentas: number
  cantidadDetalles: number
  addMaterialOCargoUsuario: boolean
  habilitarCargarMaterial: boolean
}> => {
  const rawFecha = params.fecha.trim()
  const isoLike = rawFecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const dmyLike = rawFecha.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  const compactLike = rawFecha.match(/^(\d{4})(\d{2})(\d{2})$/)

  const fechaDdMmYyyy = isoLike
    ? `${isoLike[3]}/${isoLike[2]}/${isoLike[1]}`
    : dmyLike
      ? `${dmyLike[1]}/${dmyLike[2]}/${dmyLike[3]}`
      : compactLike
        ? `${compactLike[3]}/${compactLike[2]}/${compactLike[1]}`
        : rawFecha.slice(0, 10)

  const queryParams = {
    fecha: fechaDdMmYyyy,
    nroOT: params.ot.trim(),
    numeroCliente: params.clienteNro.trim(),
    incluirManual: params.incluirManual === true,
    desdeAgenda: params.desdeAgenda === true,
  }

  let data: unknown = null
  try {
    const response = await api.get('/ot/venta/validar-detalle', { params: queryParams })
    data = response.data
  } catch (error) {
    if (!shouldFallbackToLegacyEndpoint(error)) throw error
    const response = await api.get('/ot/spx_ValidarVentaYDetallewb', { params: queryParams })
    data = response.data
  }

  const envelopeData = isRecord(data) && isRecord(data.data) ? data.data : data
  const payload = isRecord(envelopeData) ? envelopeData : {}

  const existeVentaFlag = readBoolean(payload, ['existeVenta', 'ExisteVenta', 'ventaExiste', 'VentaExiste'])
  const cantidadVentas = readNumber(payload, ['cantidadVentas', 'CantidadVentas', 'countVentas', 'CountVentas']) ?? (existeVentaFlag ? 1 : 0)
  const existeVenta = existeVentaFlag !== undefined ? existeVentaFlag : cantidadVentas > 0 ? true : resolveVentaExists(data)

  const detalleFlag = readBoolean(payload, ['tieneDetalleEnCodigoVenta', 'TieneDetalleEnCodigoVenta', 'existeDetalle', 'ExisteDetalle'])
  const cantidadDetalles = readNumber(payload, ['cantidadDetalles', 'CantidadDetalles', 'countDetalles', 'CountDetalles']) ?? (detalleFlag ? 1 : 0)
  const tieneDetalleEnCodigoVenta = detalleFlag !== undefined ? detalleFlag : cantidadDetalles > 0
  const tieneDetalleFlag = readBoolean(payload, ['TieneDetalle', 'tieneDetalle', 'tiene_detalle', 'Tiene_Detalle'])

  const addMaterialFlag = readBoolean(payload, [
    'addMaterialOCargoUsuario',
    'AddMaterialOCargoUsuario',
    'addMaterial_o_CargoUsuario',
    'AddMaterial_o_CargoUsuario',
    'addmaterial_o_cargousuario',
  ])

  const habilitarCargarMaterialFlag = readBoolean(payload, [
    'habilitarCargarMaterial',
    'HabilitarCargarMaterial',
    'puedeCargarMaterial',
    'PuedeCargarMaterial',
  ])

  const addMaterialOCargoUsuario = addMaterialFlag ?? false
  const tieneDetalle = tieneDetalleFlag ?? addMaterialOCargoUsuario
  const habilitarCargarMaterial =
    habilitarCargarMaterialFlag !== undefined
      ? habilitarCargarMaterialFlag
        : addMaterialFlag !== undefined
        ? addMaterialFlag && !tieneDetalleEnCodigoVenta
        : existeVenta && !tieneDetalleEnCodigoVenta

  return {
    idVenta: readNumber(payload, ['idVenta', 'IdVenta', 'id_venta', 'Id_Venta']) ?? undefined,
    idRuta: readNumber(payload, ['idRuta', 'IdRuta', 'id_ruta', 'Id_Ruta', 'idruta']) ?? undefined,
    existeVenta,
    tieneDetalle,
    tieneDetalleEnCodigoVenta,
    cantidadVentas,
    cantidadDetalles,
    addMaterialOCargoUsuario,
    habilitarCargarMaterial,
  }
}

const toIsoDateParam = (value?: string): string => {
  const raw = (value ?? '').trim()
  if (!raw) return ''

  const isoLike = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`

  const dmyLike = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmyLike) return `${dmyLike[3]}-${dmyLike[2]}-${dmyLike[1]}`

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  const year = String(parsed.getFullYear())
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const coerceApiBoolean = (payload: unknown): boolean | null => {
  const resolved = resolveVentaExistsDeep(payload)
  if (resolved !== null) return resolved

  if (payload === undefined || payload === null) return null
  if (typeof payload === 'boolean') return payload
  if (typeof payload === 'number') return payload !== 0
  if (typeof payload === 'string') {
    const normalized = payload.trim().toLowerCase()
    if (!normalized) return null
    if (['1', 'true', 'si', 's', 'yes', 'y', 'existe', 'cerrado', 'cerrada'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n', 'abierto', 'abierta'].includes(normalized)) return false
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) return false
    let sawNonEmptyObject = false
    for (const item of payload) {
      const itemResult = coerceApiBoolean(item)
      if (itemResult !== null) return itemResult
      if (isRecord(item) && Object.keys(item).length > 0) {
        sawNonEmptyObject = true
      }
    }
    return sawNonEmptyObject ? true : null
  }

  if (!isRecord(payload)) return null

  const directKeys = [
    'bloqueado',
    'Bloqueado',
    'existe',
    'Existe',
    'tieneCierre',
    'TieneCierre',
    'existeCierre',
    'ExisteCierre',
    'cierreAlmacenBloqueado',
    'CierreAlmacenBloqueado',
    'cierrePrPdBloqueado',
    'CierrePrPdBloqueado',
    'hayCierre',
    'HayCierre',
    'tieneCuadre',
    'TieneCuadre',
    'existeCuadre',
    'ExisteCuadre',
    'movimientosBloqueados',
    'MovimientosBloqueados',
    'hayCuadre',
    'HayCuadre',
    'cerrado',
    'Cerrado',
    'resultado',
    'Resultado',
    'data',
    'Data',
    'value',
    'Value',
  ]

  for (const key of directKeys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue
    const result = coerceApiBoolean(payload[key])
    if (result !== null) return result
  }

  const total = readNumber(payload, ['total', 'Total', 'count', 'Count', 'cantidad', 'Cantidad'])
  if (typeof total === 'number') return total > 0

  const message = readString(payload, ['message', 'Message', 'mensaje', 'Mensaje']).trim().toLowerCase()
  if (message) {
    if (message.includes('no existe') || message.includes('sin cierre') || message.includes('sin cuadre')) return false
    if (message.includes('existe') || message.includes('cierre') || message.includes('cuadre')) return true
  }

  for (const value of Object.values(payload)) {
    const nested = coerceApiBoolean(value)
    if (nested !== null) return nested
  }

  return null
}

export const validateExisteCierreAlmacen = async (params: {
  fecha?: string
  idSucursal?: number
}): Promise<{ bloqueado: boolean; mensaje: string }> => {
  const queryParams: Record<string, string | number> = {}
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    const fecha = toIsoDateParam(params.fecha)
    queryParams.fecha = fecha
  }
  if (typeof params.idSucursal === 'number' && Number.isFinite(params.idSucursal) && params.idSucursal > 0) {
    queryParams.idSucursal = params.idSucursal
  }

  const { data } = await api.get<{ data?: RegistroAgendaValidacionApi; message?: string }>('/ot/spx_ExisteCierreAlmacen', {
    params: Object.keys(queryParams).length ? queryParams : undefined,
  })

  const payload = isRecord(data) && isRecord(data.data) ? (data.data as RegistroAgendaValidacionApi) : null
  if (payload) {
    const blocked =
      payload.bloqueado === true ||
      payload.cierreAlmacenBloqueado === true ||
      payload.cierrePrPdBloqueado === true ||
      payload.movimientosBloqueados === true
    return {
      bloqueado: blocked,
      mensaje: String(payload.mensaje ?? data.message ?? '').trim(),
    }
  }

  const resolved = coerceApiBoolean(data)
  return {
    bloqueado: resolved ?? false,
    mensaje: isRecord(data) && typeof data.message === 'string' ? data.message : '',
  }
}

const inferMovimientosBlockedFromMessage = (message: string): boolean | null => {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return null

  if (
    normalized.includes('no hay transacciones pendientes') ||
    normalized.includes('sin transacciones pendientes') ||
    normalized.includes('sin movimientos pendientes')
  ) {
    return false
  }

  if (
    normalized.includes('transacciones pendientes') ||
    normalized.includes('movimientos pendientes') ||
    normalized.includes('verificar fecha servidor')
  ) {
    return true
  }

  return null
}

const extractApiMessage = (payload: unknown): string => {
  if (payload === undefined || payload === null) return ''

  if (typeof payload === 'string') return payload.trim()
  if (typeof payload === 'number' || typeof payload === 'boolean') return ''

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractApiMessage(item)
      if (nested) return nested
    }
    return ''
  }

  if (!isRecord(payload)) return ''

  const directMessage = readString(payload, [
    'mensaje',
    'Mensaje',
    'message',
    'Message',
    'detalle',
    'Detalle',
    'descripcion',
    'Descripcion',
    'error',
    'Error',
  ]).trim()
  if (directMessage) return directMessage

  const nestedData = pickValue(payload, ['data', 'Data', 'value', 'Value'])
  const nestedMessage = extractApiMessage(nestedData)
  if (nestedMessage) return nestedMessage

  for (const value of Object.values(payload)) {
    const nested = extractApiMessage(value)
    if (nested) return nested
  }

  return ''
}

export const validateMovimientosCierre = async (params: {
  fecha?: string
  grupo?: string
  idRuta?: number
  idSucursal?: number | null
}): Promise<{ bloqueado: boolean; mensaje: string }> => {
  const queryParams: Record<string, string | number> = {}
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    queryParams.fecha = toIsoDateParam(params.fecha)
  }
  if (typeof params.grupo === 'string' && params.grupo.trim()) {
    queryParams.grupo = params.grupo.trim()
  }
  if (typeof params.idRuta === 'number' && Number.isFinite(params.idRuta) && params.idRuta > 0) {
    queryParams.idRuta = params.idRuta
  }
  if (typeof params.idSucursal === 'number' && Number.isFinite(params.idSucursal) && params.idSucursal > 0) {
    queryParams.idSucursal = params.idSucursal
  }

  const endpoints = ['/cuadre/spx_ValidaMovimientosCierre', '/ot/spx_ValidaMovimientosCierre', '/ot/valida-movimientos-cierre']

  let data: unknown
  let lastFallbackError: unknown = null
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      })
      data = response.data
      lastFallbackError = null
      break
    } catch (error) {
      if (!shouldFallbackToLegacyEndpoint(error)) {
        throw error
      }
      lastFallbackError = error
    }
  }

  if (lastFallbackError) {
    throw lastFallbackError
  }

  const message = extractApiMessage(data)
  const payload = isRecord(data) && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data
  const resolved = coerceApiBoolean(payload)
  const inferredFromMessage = inferMovimientosBlockedFromMessage(message)

  return {
    bloqueado: resolved ?? inferredFromMessage ?? false,
    mensaje: message,
  }
}

export const validateCuadreRuta = async (params: {
  idRuta: number
  fecha?: string
  idSucursal?: number
}): Promise<boolean> => {
  const queryParams: Record<string, string | number> = {
    idRuta: params.idRuta,
  }
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    const fecha = toIsoDateParam(params.fecha)
    queryParams.fecha = fecha
  }
  if (typeof params.idSucursal === 'number' && Number.isFinite(params.idSucursal) && params.idSucursal > 0) {
    queryParams.idSucursal = params.idSucursal
  }

  const { data } = await api.get('/cuadre/spx_ValidarCuadreRuta', {
    params: queryParams,
  })

  const resolved = coerceApiBoolean(
    isRecord(data) && Object.prototype.hasOwnProperty.call(data, 'data')
      ? (data as Record<string, unknown>).data
      : data
  )
  return resolved ?? false
}

export const fetchSaldoRuta = async (params: {
  idRuta: number
  fecha?: string
  idSucursal?: number
}): Promise<UnknownRecord[]> => {
  const queryParams: Record<string, string | number> = {
    idRuta: params.idRuta,
  }
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    const fecha = toIsoDateParam(params.fecha)
    queryParams.fecha = fecha
  }
  if (typeof params.idSucursal === 'number' && Number.isFinite(params.idSucursal) && params.idSucursal > 0) {
    queryParams.idSucursal = params.idSucursal
  }

  const { data } = await api.get('/ot/spx_ObtenerSaldoRuta', {
    params: queryParams,
  })
  return normalizeArrayResponse<UnknownRecord>(data)
}

export const fetchCabeceraVentaParaRegistroOtWb = async (params: {
  clienteNro: number
  ot: number
  tor: string
  grupo: string
  tecnicoNombre: string
}): Promise<UnknownRecord[]> => {
  let data: unknown
  try {
    const response = await api.get('/ot/cabecera-venta/registro-otwb', { params })
    data = response.data
  } catch (error) {
    if (!shouldFallbackToLegacyEndpoint(error)) throw error
    const response = await api.get('/ot/spx_ObtenerCaberaVentaParaRegistroOTwb', { params })
    data = response.data
  }

  if (Array.isArray(data)) return data as UnknownRecord[]
  if (isRecord(data) && Array.isArray(data.data)) {
    return data.data as UnknownRecord[]
  }
  if (isRecord(data)) return [data as UnknownRecord]
  return []
}

type RegistrarVentaParaRegistroOtResult = {
  data?: {
    idVenta?: number
    ordenTrabajo?: number
    rutaPdf?: string
  }
}

export const registrarVentaParaRegistroOtWb = async (
  payload: Record<string, unknown>,
  pdfFile?: File | null
): Promise<RegistrarVentaParaRegistroOtResult> => {
  const body: Record<string, unknown> | FormData = (() => {
    if (!pdfFile) return payload
    const rawCodigoCliente = payload.codigoCliente
    const codigoCliente =
      typeof rawCodigoCliente === 'number'
        ? String(rawCodigoCliente)
        : typeof rawCodigoCliente === 'string'
          ? rawCodigoCliente.trim()
          : ''
    const originalName = pdfFile.name ?? 'archivo'
    const extensionMatch = originalName.match(/(\.[A-Za-z0-9]+)$/)
    const extension = extensionMatch?.[1] ?? ''
    const baseName = extension ? originalName.slice(0, -extension.length) : originalName
    const finalName = codigoCliente ? `${baseName}_COD_${codigoCliente}${extension}` : originalName
    const fileToUpload =
      finalName === originalName
        ? pdfFile
        : new File([pdfFile], finalName, {
            type: pdfFile.type || 'application/octet-stream',
            lastModified: pdfFile.lastModified,
          })
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    formData.append('pdf', fileToUpload)
    return formData
  })()
  try {
    const response = await api.post('/ot/venta/registro-otwb', body)
    return response.data as RegistrarVentaParaRegistroOtResult
  } catch (error) {
    if (!shouldFallbackToLegacyEndpoint(error)) throw error
    const response = await api.post('/ot/spx_RegistrarVentaParaRegistroOTwb', body)
    return response.data as RegistrarVentaParaRegistroOtResult
  }
}


