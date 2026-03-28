import axios from 'axios'
import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { ConformacionCuadrillaInput, ConformacionCuadrillaPayload, ConformacionCuadrillaRecord } from '../types/conformacionCuadrilla'
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

const normalizeListParams = (params?: ConformacionCuadrillaListParams): Record<string, unknown> | undefined => {
  if (!params) return undefined
  const limitValue = params.limit ?? params.limite
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

const LEGACY_GUARDAR_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['', '/', '/guardar'])
const LEGACY_CONFIRMADAS_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['/confirmadas', '/cuadrillas/confirmadas'])
const LEGACY_ELIMINADAS_PATHS = buildCandidatePaths(CONFORMACION_LEGACY_BASE_PATHS, ['/eliminadas', '/cuadrillas/eliminadas'])

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
  const sanitizedParams = normalizeListParams(params)
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
  const sanitizedParams = normalizeListParams(params)
  const [webPayload, confirmadasPayload] = await Promise.all([
    requestConformacionWebGet<unknown>('', sanitizedParams),
    requestLegacyReadFromCandidates<unknown>({
      paths: LEGACY_CONFIRMADAS_PATHS,
      params: sanitizedParams,
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
  const data = await requestLegacyReadFromCandidates<unknown>({
    paths: LEGACY_CONFIRMADAS_PATHS,
    params: normalizeListParams(params),
  })
  const rows = normalizeArrayResponse<ConformacionCuadrillaRecord>(data)
  return rows.map((row) => ({ ...row, confirmada: true }))
}

export const fetchConformacionCuadrillaEliminadas = async (
  params: ConformacionCuadrillaEliminadasParams
): Promise<ConformacionCuadrillaRecord[]> => {
  const data = await requestLegacyReadFromCandidates<unknown>({
    paths: LEGACY_ELIMINADAS_PATHS,
    params: normalizeListParams(params),
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
    limit: params.limit,
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
  await requestLegacyWriteFromCandidates<unknown>({
    method: 'post',
    paths: LEGACY_GUARDAR_PATHS,
    body: payload,
  })
}

export const updateConformacionCuadrilla = async (
  id: number,
  payload: ConformacionCuadrillaInput,
  options?: UpdateConformacionCuadrillaOptions
): Promise<void> => {
  if (options?.target === 'dbordenres') {
    await requestLegacyWriteFromCandidates<unknown>({
      method: 'put',
      paths: buildLegacyIdPaths(id),
      body: payload,
    })
    return
  }

  try {
    await requestConformacionWebPut<unknown>(`/${id}`, payload, sanitizeParams({ sucursal: normalizeStringParam(payload.sucursal) }))
    return
  } catch (error) {
    if (!isFallbackRouteError(error)) {
      throw error
    }
  }

  await requestLegacyWriteFromCandidates<unknown>({
    method: 'put',
    paths: buildLegacyIdPaths(id),
    body: payload,
  })
}

