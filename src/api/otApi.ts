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
import { getSessionStorage } from '../utils/storage'

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

  if (params.tecnico?.trim()) {
    searchParams.set('tecnico', params.tecnico.trim())
  }
  if (typeof params.idUsuario === 'number' && Number.isFinite(params.idUsuario) && params.idUsuario > 0) {
    searchParams.set('idUsuario', String(params.idUsuario))
  }

  const hasSessionToken = Boolean(getSessionStorage()?.sessionToken)
  if (!hasSessionToken && params.rol?.trim()) {
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

export const fetchSupervisorUltimoEstadoDia = async (params: {
  fecha: string
  idUsuario?: number
  tecnico?: string
  rol?: string
}): Promise<OtSummary[]> => {
  try {
    return await fetchListaOt({
      fecha: params.fecha,
      tecnico: params.tecnico,
      idUsuario: params.idUsuario,
      rol: params.rol,
    })
  } catch (listaOtError) {
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
        return rows.map(mapOtSummary)
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 405 || status === 500) {
          continue
        }
        throw error
      }
    }

    throw listaOtError
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

export const fetchOtByNumero = async (numero: string): Promise<UnknownRecord> => {
  const { data } = await api.get(`/ot/numero/${encodeURIComponent(numero.trim())}`)
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

export const createOtRealizada = async (payload: OtRealizadaPayload): Promise<void> => {
  await api.post('/ot/realizada', payload)
}

export const createOtDetalle = async (payload: OtRegistrarDetallePayload): Promise<{ idVenta?: number; numeroOrden?: number }> => {
  const { data } = await api.post('/ot/detalle-materiales', payload)
  const raw = unwrapData(data)
  if (!isRecord(raw)) return {}
  return {
    idVenta: readNumber(raw, ['idVenta', 'IdVenta', 'id_venta', 'Id_Venta']) ?? undefined,
    numeroOrden: readNumber(raw, ['numeroOrden', 'NumeroOrden', 'ordenTrabajo', 'OrdenTrabajo']) ?? undefined,
  }
}

export const createOtCargoUsuario = async (payload: OtCargoUsuarioPayload): Promise<{ guardados?: number }> => {
  const { data } = await api.post('/ot/cargo-usuario', payload)
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
}): Promise<{ existeVenta: boolean; tieneDetalleEnCodigoVenta: boolean }> => {
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
  }

  let data: unknown
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
  const cantidadVentas = readNumber(payload, ['cantidadVentas', 'CantidadVentas', 'countVentas', 'CountVentas']) ?? 0
  const existeVenta = existeVentaFlag !== undefined ? existeVentaFlag : cantidadVentas > 0 ? true : resolveVentaExists(data)

  const detalleFlag = readBoolean(payload, ['tieneDetalleEnCodigoVenta', 'TieneDetalleEnCodigoVenta', 'existeDetalle', 'ExisteDetalle'])
  const cantidadDetalles = readNumber(payload, ['cantidadDetalles', 'CantidadDetalles', 'countDetalles', 'CountDetalles']) ?? 0
  const tieneDetalleEnCodigoVenta = detalleFlag !== undefined ? detalleFlag : cantidadDetalles > 0

  return {
    existeVenta,
    tieneDetalleEnCodigoVenta,
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
}): Promise<{ bloqueado: boolean; mensaje: string }> => {
  const queryParams: Record<string, string | number> = {}
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    const fecha = toIsoDateParam(params.fecha)
    queryParams.fecha = fecha
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

export const validateCuadreRuta = async (params: {
  idRuta: number
  fecha?: string
}): Promise<boolean> => {
  const queryParams: Record<string, string | number> = {
    idRuta: params.idRuta,
  }
  if (typeof params.fecha === 'string' && params.fecha.trim()) {
    const fecha = toIsoDateParam(params.fecha)
    queryParams.fecha = fecha
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
  }
}

export const registrarVentaParaRegistroOtWb = async (
  payload: Record<string, unknown>
): Promise<RegistrarVentaParaRegistroOtResult> => {
  try {
    const response = await api.post('/ot/venta/registro-otwb', payload)
    return response.data as RegistrarVentaParaRegistroOtResult
  } catch (error) {
    if (!shouldFallbackToLegacyEndpoint(error)) throw error
    const response = await api.post('/ot/spx_RegistrarVentaParaRegistroOTwb', payload)
    return response.data as RegistrarVentaParaRegistroOtResult
  }
}
