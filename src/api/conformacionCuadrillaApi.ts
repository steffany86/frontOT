import axios from 'axios'
import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  ConformacionCuadrillaInput,
  ConformacionCuadrillaPayload,
  ConformacionCuadrillaRecord,
  ConformacionCuadrillaRelacionPayload,
} from '../types/conformacionCuadrilla'
import type { CatalogItem } from './catalogApi'

export type ConformacionCuadrillaListParams = {
  fecha?: string
  sucursal?: string
  q?: string
  limit?: number
  limite?: number
  idTecnico?: number
}

export type ConformacionCuadrillaCatalogParams = {
  sucursal?: string
  q?: string
  limit?: number
}

export type ConformacionCuadrillaPendientesParams = ConformacionCuadrillaListParams
export type ConformacionCuadrillaConfirmadasParams = ConformacionCuadrillaListParams
export type ConformacionCuadrillaEliminadasParams = ConformacionCuadrillaListParams

export type ConformacionCuadrillaVehiculosParams = {
  sucursal?: string
  q?: string
  filtro?: string
  limit?: number
}

export type UpdateConformacionCuadrillaOptions = {
  target?: 'web' | 'dbordenres'
}

const CONFORMACION_WEB_BASE_PATH = '/supervisor/conformacion-cuadrilla-web'
const CONFORMACION_WEB_CATALOG_BASE_PATH = `${CONFORMACION_WEB_BASE_PATH}/catalogos`
const CONFORMACION_BACKOFFICE_BASE_PATH = '/supervisor/conformacion-cuadrilla'
const CONFORMACION_BACKOFFICE_CATALOG_BASE_PATH = `${CONFORMACION_BACKOFFICE_BASE_PATH}/catalogos`
const CONFORMACION_CATALOG_BASE_PATHS = [
  CONFORMACION_WEB_CATALOG_BASE_PATH,
  CONFORMACION_BACKOFFICE_CATALOG_BASE_PATH,
] as const
const CONFORMACION_LEGACY_BASE_PATHS = ['/supervisor/conformacion-cuadrilla', '/supervisor/conformacion-cuadrillas'] as const
const apiVerboseEnabled = import.meta.env.VITE_API_DEBUG === 'true'
const ROUTE_FALLBACK_STATUS = new Set([404, 405])

const sanitizeParams = (params?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : undefined
}

const joinPath = (basePath: string, suffix: string): string => {
  if (!suffix || suffix === '/') return suffix === '/' ? `${basePath}/` : basePath
  if (suffix.startsWith('/')) return `${basePath}${suffix}`
  return `${basePath}/${suffix}`
}

const buildCandidatePaths = (basePaths: readonly string[], suffixes: readonly string[]): string[] => {
  const paths = new Set<string>()
  for (const basePath of basePaths) {
    for (const suffix of suffixes) {
      paths.add(joinPath(basePath, suffix))
    }
  }
  return Array.from(paths)
}

const normalizeStringParam = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const normalizeLimitParam = (value: unknown): number | undefined => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.trunc(parsed)
}

const todayIsoString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeWebListParams = (params?: ConformacionCuadrillaListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const limitValue = normalizeLimitParam(params.limite ?? params.limit)
  return sanitizeParams({
    fecha: normalizeStringParam(params.fecha),
    sucursal: normalizeStringParam(params.sucursal),
    limite: limitValue,
  })
}

const normalizeLegacyListParams = (params?: ConformacionCuadrillaListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const limitValue = normalizeLimitParam(params.limite ?? params.limit)
  return sanitizeParams({
    fecha: normalizeStringParam(params.fecha),
    sucursal: normalizeStringParam(params.sucursal),
    q: normalizeStringParam(params.q),
    limit: limitValue,
    limite: limitValue,
    idTecnico: params.idTecnico,
  })
}

const normalizeCatalogParams = (
  params?: ConformacionCuadrillaCatalogParams | ConformacionCuadrillaVehiculosParams
): Record<string, unknown> | undefined => {
  if (!params) return undefined
  return sanitizeParams({
    sucursal: normalizeStringParam(params.sucursal),
    q: normalizeStringParam(params.q),
    limit: params.limit,
    filtro: 'filtro' in params ? normalizeStringParam(params.filtro) : undefined,
  })
}

const requestConformacionWebGet = async <T>(suffix = '', params?: Record<string, unknown>): Promise<T> => {
  const requestParams = sanitizeParams(params)
  const path = joinPath(CONFORMACION_WEB_BASE_PATH, suffix)
  const { data } = await api.get(path, requestParams ? { params: requestParams } : undefined)
  return data as T
}

const requestConformacionWebPost = async <T>(
  suffix: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<T> => {
  const requestParams = sanitizeParams(params)
  const path = joinPath(CONFORMACION_WEB_BASE_PATH, suffix)
  const { data } = await api.post(path, body, {
    headers: { 'Content-Type': 'application/json' },
    ...(requestParams ? { params: requestParams } : {}),
  })
  return data as T
}

const requestConformacionCatalogGet = async <T>(suffix: string, params?: Record<string, unknown>): Promise<T> => {
  const requestParams = sanitizeParams(params)
  let lastError: unknown

  for (const basePath of CONFORMACION_CATALOG_BASE_PATHS) {
    const path = joinPath(basePath, suffix)
    try {
      const { data } = await api.get(path, requestParams ? { params: requestParams } : undefined)
      return data as T
    } catch (error) {
      if (!isFallbackRouteError(error)) throw error
      lastError = error
    }
  }

  if (lastError) throw lastError
  throw new Error(`No se encontro un endpoint de catalogos disponible para ${suffix}.`)
}

const requestConformacionWebPut = async <T>(
  suffix: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<T> => {
  const requestParams = sanitizeParams(params)
  const path = joinPath(CONFORMACION_WEB_BASE_PATH, suffix)
  const { data } = await api.put(path, body, {
    headers: { 'Content-Type': 'application/json' },
    ...(requestParams ? { params: requestParams } : {}),
  })
  return data as T
}

const isFallbackRouteError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status !== undefined && ROUTE_FALLBACK_STATUS.has(status)
}

const isRecoverableLegacyGuardarError = (error: unknown): boolean => {
  if (isFallbackRouteError(error)) return true
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status !== undefined && status >= 500
}

const requestLegacyWriteFromCandidates = async <T>(args: {
  method: 'post' | 'put'
  paths: string[]
  params?: Record<string, unknown>
  body?: unknown
}): Promise<T> => {
  const requestParams = sanitizeParams(args.params)
  let lastError: unknown

  for (const path of args.paths) {
    try {
      if (args.method === 'post') {
        const { data } = await api.post(path, args.body, {
          headers: { 'Content-Type': 'application/json' },
          ...(requestParams ? { params: requestParams } : {}),
        })
        return data as T
      }
      const { data } = await api.put(path, args.body, {
        headers: { 'Content-Type': 'application/json' },
        ...(requestParams ? { params: requestParams } : {}),
      })
      return data as T
    } catch (error) {
      if (!isFallbackRouteError(error)) throw error
      lastError = error
    }
  }

  if (lastError) throw lastError
  throw new Error('No se encontro un endpoint legacy disponible para cuadrillas.')
}

const requestLegacyReadFromCandidates = async <T>(args: {
  paths: string[]
  params?: Record<string, unknown>
}): Promise<T> => {
  const requestParams = sanitizeParams(args.params)
  let lastError: unknown

  for (const path of args.paths) {
    try {
      const { data } = await api.get(path, requestParams ? { params: requestParams } : undefined)
      return data as T
    } catch (error) {
      if (!isFallbackRouteError(error)) throw error
      lastError = error
    }
  }

  if (lastError) throw lastError
  throw new Error('No se encontro un endpoint legacy disponible para cuadrillas.')
}

const normalizeObjectResponse = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const normalizeCatalogObjectResponse = (payload: unknown): CatalogItem => {
  const normalized = normalizeObjectResponse<CatalogItem | CatalogItem[]>(payload)
  if (Array.isArray(normalized)) {
    return normalized[0] ?? {}
  }
  return normalized ?? {}
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeSingleRecordResponse = (payload: unknown): ConformacionCuadrillaRecord => {
  const normalized = normalizeObjectResponse<unknown>(payload)
  if (Array.isArray(normalized)) {
    throw new Error('Respuesta invalida de detalle: se recibio un listado en lugar de un objeto.')
  }
  if (!isRecord(normalized)) {
    throw new Error('Respuesta invalida de detalle: formato no reconocido.')
  }
  return normalized as unknown as ConformacionCuadrillaRecord
}

const applyLimit = <T>(rows: T[], limit?: number): T[] => {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return rows
  return rows.slice(0, limit)
}

const normalizeOptionalText = (value?: string): string | undefined => {
  return normalizeStringParam(value)
}

const normalizeRequiredText = (value?: string): string => {
  return normalizeStringParam(value) ?? ''
}

const normalizeActividadForWrite = (value?: string): 'TITULAR' | 'BACKUP' => {
  const normalized = normalizeRequiredText(value).toUpperCase()
  return normalized === 'BACKUP' ? 'BACKUP' : 'TITULAR'
}

const normalizeOptionalNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const toObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

const extractFilasInsertadas = (payload: unknown): number | null => {
  const envelope = toObjectRecord(payload)
  const data = envelope && 'data' in envelope ? envelope.data : payload
  const dataObj = toObjectRecord(data)
  if (!dataObj || !('filasInsertadas' in dataObj)) {
    return null
  }
  const parsed = Number(dataObj.filasInsertadas)
  return Number.isFinite(parsed) ? parsed : null
}

const WEB_WRITE_REQUIRED_STRING_FIELDS = ['fecha', 'estado', 'actividad', 'sucursal'] as const
const WEB_CREATE_EXTRA_REQUIRED_STRING_FIELDS = ['vehiculo', 'grupo'] as const
const WEB_WRITE_REQUIRED_NUMBER_FIELDS = ['idTecnico', 'idUsuarioSupervisor', 'idUsuarioRegistra'] as const

const toConformacionWebWriteRow = (row: ConformacionCuadrillaInput): ConformacionCuadrillaInput => {
  return {
    ...row,
    fecha: normalizeRequiredText(row.fecha),
    estado: normalizeRequiredText(row.estado).toUpperCase(),
    actividad: normalizeActividadForWrite(row.actividad),
    idTecnico: normalizeOptionalNumber(row.idTecnico),
    cuentaSf: normalizeOptionalText(row.cuentaSf),
    salesforce: normalizeOptionalText(row.salesforce),
    habilidad: normalizeOptionalText(row.habilidad),
    vehiculo: normalizeOptionalText(row.vehiculo),
    grupo: normalizeOptionalText(row.grupo),
    almacen: normalizeOptionalText(row.almacen),
    grupoDigitacion: normalizeOptionalText(row.grupoDigitacion),
    idUsuarioDigitador: normalizeOptionalNumber(row.idUsuarioDigitador),
    digitador: normalizeOptionalText(row.digitador),
    tecnico: normalizeOptionalText(row.tecnico),
    idTecnicoAuxiliar: normalizeOptionalNumber(row.idTecnicoAuxiliar),
    auxiliar: normalizeOptionalText(row.auxiliar),
    idUsuarioSupervisor: normalizeOptionalNumber(row.idUsuarioSupervisor),
    supervisorACargo: normalizeOptionalText(row.supervisorACargo),
    sucursal: normalizeRequiredText(row.sucursal),
    observacion: normalizeOptionalText(row.observacion),
    idUsuarioRegistra: normalizeOptionalNumber(row.idUsuarioRegistra),
    supervisorConfirmo: normalizeOptionalText(row.supervisorConfirmo ?? undefined),
  }
}

const assertConformacionWebWriteRow = (row: ConformacionCuadrillaInput, forCreate: boolean): void => {
  const requiredStrings: Array<
    (typeof WEB_WRITE_REQUIRED_STRING_FIELDS)[number] | (typeof WEB_CREATE_EXTRA_REQUIRED_STRING_FIELDS)[number]
  > = forCreate
    ? [...WEB_WRITE_REQUIRED_STRING_FIELDS, ...WEB_CREATE_EXTRA_REQUIRED_STRING_FIELDS]
    : [...WEB_WRITE_REQUIRED_STRING_FIELDS]
  const missing: string[] = []

  for (const field of requiredStrings) {
    if (!normalizeRequiredText(row[field]).trim()) {
      missing.push(field)
    }
  }

  for (const field of WEB_WRITE_REQUIRED_NUMBER_FIELDS) {
    if (normalizeOptionalNumber(row[field]) === undefined) {
      missing.push(field)
    }
  }

  if (!missing.length) return
  throw new Error(`Payload invalido para conformacion-cuadrilla-web. Faltan: ${missing.join(', ')}`)
}

const LEGACY_GUARDAR_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['/guardar'])
const LEGACY_PENDIENTES_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['/pendientes', '/cuadrillas/pendientes'])
const LEGACY_CONFIRMADAS_DIRECT_PATH = '/supervisor/conformacion-cuadrilla/confirmadas'
const LEGACY_ELIMINADAS_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['/eliminadas', '/cuadrillas/eliminadas'])
const LEGACY_RELACIONES_CUADRILLA_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, [
  '/relaciones-cuadrilla',
  '/cuadrillas/relaciones',
])

const buildLegacyIdPaths = (id: number): string[] => {
  return buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, [`/${id}`])
}

const toBooleanLike = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'si') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  }
  return undefined
}

const readRecordAlias = (row: ConformacionCuadrillaRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key as keyof ConformacionCuadrillaRecord]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const isRecordConfirmada = (row: ConformacionCuadrillaRecord): boolean => {
  const value = readRecordAlias(row, ['confirmada', 'Confirmada'])
  return toBooleanLike(value) ?? false
}

const isRecordEliminada = (row: ConformacionCuadrillaRecord): boolean => {
  const value = readRecordAlias(row, ['e_eliminado', 'eEliminado', 'EEliminado', 'eliminado', 'Eliminado'])
  return toBooleanLike(value) ?? false
}

const toKeyToken = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  if (!text) return null
  return text.toLowerCase()
}

const buildConformacionKey = (row: ConformacionCuadrillaRecord): string | null => {
  const idTecnico = toKeyToken(readRecordAlias(row, ['idTecnico', 'id_tecnico', 'idtecnico', 'id_vendedor', 'idvendedor']))
  if (idTecnico) return `id:${idTecnico}`

  const grupo = toKeyToken(readRecordAlias(row, ['grupo', 'cuadrilla', 'ruta', 'nombre']))
  if (grupo) return `grupo:${grupo}`

  return null
}

export const fetchConformacionCuadrillaList = async (
  params?: ConformacionCuadrillaListParams
): Promise<ConformacionCuadrillaRecord[]> => {
  const sanitizedParams = normalizeWebListParams(params)
  const data = await requestConformacionWebGet<unknown>('', sanitizedParams)
  const rows = normalizeArrayResponse<ConformacionCuadrillaRecord>(data)
  if (apiVerboseEnabled) {
    console.info('[CUADRILLA][LISTADO]', { totalFilas: rows.length, params: sanitizedParams ?? {} })
  }
  return rows
}

export const fetchConformacionCuadrillaPendientes = async (
  params: ConformacionCuadrillaPendientesParams
): Promise<ConformacionCuadrillaRecord[]> => {
  const legacyParams = normalizeLegacyListParams(params)
  let legacyRows: ConformacionCuadrillaRecord[] = []
  try {
    const pendientesPayload = await requestLegacyReadFromCandidates<unknown>({
      paths: LEGACY_PENDIENTES_PATHS,
      params: legacyParams,
    })
    legacyRows = normalizeArrayResponse<ConformacionCuadrillaRecord>(pendientesPayload)
    if (legacyRows.length > 0) {
      return legacyRows
        .filter((row) => !isRecordEliminada(row))
        .map((row) => ({ ...row, confirmada: false, eEliminado: false, e_eliminado: false, eliminado: false }))
    }
  } catch (error) {
    if (!isFallbackRouteError(error)) {
      throw error
    }
  }

  const webParams = normalizeWebListParams(params)
  const [webPayload, confirmadasPayload] = await Promise.all([
    requestConformacionWebGet<unknown>('', webParams),
    requestLegacyReadFromCandidates<unknown>({
      paths: [LEGACY_CONFIRMADAS_DIRECT_PATH],
      params: legacyParams,
    }),
  ])

  const webRows = normalizeArrayResponse<ConformacionCuadrillaRecord>(webPayload)
  const confirmadasRows = normalizeArrayResponse<ConformacionCuadrillaRecord>(confirmadasPayload)
  const confirmadasKeys = new Set(confirmadasRows.map(buildConformacionKey).filter((value): value is string => Boolean(value)))

  return webRows
    .filter((row) => !isRecordEliminada(row))
    .filter((row) => {
      const key = buildConformacionKey(row)
      if (!key) return true
      return !confirmadasKeys.has(key)
    })
    .map((row) => ({ ...row, confirmada: false, eEliminado: false, e_eliminado: false, eliminado: false }))
}

export const fetchConformacionCuadrillaConfirmadas = async (
  params: ConformacionCuadrillaConfirmadasParams
): Promise<ConformacionCuadrillaRecord[]> => {
  const fechaParam = normalizeStringParam(params?.fecha) ?? todayIsoString()
  const data = await requestLegacyReadFromCandidates<unknown>({
    paths: [LEGACY_CONFIRMADAS_DIRECT_PATH],
    params: normalizeLegacyListParams({
      ...params,
      fecha: fechaParam,
    }),
  })
  const rows = normalizeArrayResponse<ConformacionCuadrillaRecord>(data)
  return rows.map((row) => ({ ...row, confirmada: true }))
}

export const fetchConformacionCuadrillaEliminadas = async (
  params: ConformacionCuadrillaEliminadasParams
): Promise<ConformacionCuadrillaRecord[]> => {
  const data = await requestLegacyReadFromCandidates<unknown>({
    paths: LEGACY_ELIMINADAS_PATHS,
    params: normalizeLegacyListParams(params),
  })
  const eliminadas = normalizeArrayResponse<ConformacionCuadrillaRecord>(data)
  return eliminadas.map((row) => ({
    ...row,
    confirmada: isRecordConfirmada(row),
    eliminado: true,
    eEliminado: true,
    e_eliminado: true,
  }))
}

export const fetchConformacionCuadrillaById = async (
  id: number,
  sucursal?: string
): Promise<ConformacionCuadrillaRecord> => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('ID real invalido para consultar detalle.')
  }
  const data = await requestConformacionWebGet<unknown>(`/${id}`, sanitizeParams({ sucursal: normalizeStringParam(sucursal) }))
  return normalizeSingleRecordResponse(data)
}

export const fetchConformacionTecnicos = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/tecnicos',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionAuxiliares = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/auxiliares',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionTecnicoDetalle = async (id: number, sucursal?: string): Promise<CatalogItem> => {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('ID de tecnico invalido para cargar detalle.')
  }
  const data = await requestConformacionCatalogGet<unknown>(
    `/tecnicos/${id}`,
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  if (apiVerboseEnabled) {
    const normalized = normalizeObjectResponse<CatalogItem | CatalogItem[]>(data)
    const row = Array.isArray(normalized) ? (normalized[0] ?? null) : normalized
    console.info('[CUADRILLA][TECNICO_DETALLE]', { idTecnico: id, encontrado: Boolean(row) })
  }
  return normalizeCatalogObjectResponse(data)
}

export const fetchConformacionDigitadores = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/digitadores',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionSupervisores = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/supervisores',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionSalesforce = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/salesforce',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionActividades = async (sucursal?: string): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>(
    '/actividades',
    sanitizeParams({ sucursal: normalizeStringParam(sucursal) })
  )
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionVehiculos = async (params?: ConformacionCuadrillaVehiculosParams): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>('/vehiculos', normalizeCatalogParams(params))
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchConformacionGrupos = async (params: ConformacionCuadrillaCatalogParams): Promise<CatalogItem[]> => {
  const rows = await fetchConformacionCuadrillaList({
    sucursal: params.sucursal,
    q: params.q,
    limite: params.limit,
  })
  const query = params.q?.trim().toLowerCase()
  const byKey = new Map<string, CatalogItem>()
  for (const row of rows) {
    const label = String(row.grupo ?? row.ruta ?? '').trim()
    if (!label) continue
    const normalized = label.toLowerCase()
    if (query && !normalized.includes(query)) continue
    if (!byKey.has(normalized)) {
      byKey.set(normalized, { grupo: label })
    }
  }
  return applyLimit(Array.from(byKey.values()), params.limit)
}

export const fetchConformacionSucursales = async (): Promise<CatalogItem[]> => {
  const data = await requestConformacionCatalogGet<unknown>('/sucursales')
  return normalizeArrayResponse<CatalogItem>(data, [normalizeObjectResponse<CatalogItem>(data)])
}

export const guardarConformacionCuadrillaConfirmada = async (payload: ConformacionCuadrillaPayload): Promise<void> => {
  const rows = payload.filas.map(toConformacionWebWriteRow)
  for (const row of rows) {
    assertConformacionWebWriteRow(row, true)
  }
  if (!rows.length) return

  let legacyResponse: unknown = null
  try {
    legacyResponse = await requestLegacyWriteFromCandidates<unknown>({
      method: 'post',
      paths: LEGACY_GUARDAR_PATHS,
      body: { filas: rows },
    })

    const filasInsertadas = extractFilasInsertadas(legacyResponse)
    if (filasInsertadas !== null && filasInsertadas <= 0) {
      throw new Error('La API no inserto filas en BDControlOrdenes (filasInsertadas=0).')
    }
    return
  } catch (error) {
    if (!isRecoverableLegacyGuardarError(error)) {
      throw error
    }
  }

  for (const row of rows) {
    await requestConformacionWebPost<unknown>(
      '',
      row,
      sanitizeParams({ sucursal: normalizeStringParam(row.sucursal) })
    )
  }
}

export const updateConformacionCuadrilla = async (
  id: number,
  payload: ConformacionCuadrillaInput,
  options?: UpdateConformacionCuadrillaOptions
): Promise<void> => {
  const normalizedPayload = toConformacionWebWriteRow(payload)

  if (options?.target === 'dbordenres') {
    await requestLegacyWriteFromCandidates<unknown>({
      method: 'put',
      paths: buildLegacyIdPaths(id),
      body: normalizedPayload,
    })
    return
  }

  assertConformacionWebWriteRow(normalizedPayload, false)

  try {
    await requestConformacionWebPut<unknown>(
      `/${id}`,
      normalizedPayload,
      sanitizeParams({ sucursal: normalizeStringParam(normalizedPayload.sucursal) })
    )
    return
  } catch (error) {
    if (!isFallbackRouteError(error)) {
      throw error
    }
  }

  await requestLegacyWriteFromCandidates<unknown>({
    method: 'put',
    paths: buildLegacyIdPaths(id),
    body: normalizedPayload,
  })
}

/**
 * Actualiza solo estado (ACTIVO/AUSENTE) y e_eliminado de una cuadrilla ya confirmada
 * en BDControlOrdenes, sin tocar el resto de columnas de tbl_ConformacionCuadrillaDiario.
 */
export const actualizarEstadoConformacionCuadrilla = async (
  id: number,
  estado: string,
  eliminado: boolean
): Promise<void> => {
  await api.patch(`${CONFORMACION_BACKOFFICE_BASE_PATH}/${id}/estado`, { estado, eliminado })
}

export const guardarRelacionCuadrilla = async (payload: ConformacionCuadrillaRelacionPayload): Promise<void> => {
  const idRuta = normalizeOptionalNumber(payload.idRuta)
  if (idRuta === undefined || idRuta <= 0) {
    throw new Error('idRuta invalido para guardar relacion de cuadrilla.')
  }

  const relationPayload: ConformacionCuadrillaRelacionPayload = {
    idRuta: Math.trunc(idRuta),
    idTecnicoAuxiliar: normalizeOptionalNumber(payload.idTecnicoAuxiliar) ?? null,
    auxiliar: normalizeOptionalText(payload.auxiliar ?? undefined) ?? null,
    idUsuarioDigitador: normalizeOptionalNumber(payload.idUsuarioDigitador) ?? null,
    digitador: normalizeOptionalText(payload.digitador ?? undefined) ?? null,
    sucursal: normalizeOptionalText(payload.sucursal ?? undefined) ?? null,
    activo: payload.activo !== false,
  }

  await requestLegacyWriteFromCandidates<unknown>({
    method: 'post',
    paths: LEGACY_RELACIONES_CUADRILLA_PATHS,
    body: relationPayload,
  })
}
