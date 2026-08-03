import axios, { AxiosError } from 'axios'
import { clearSessionStorage, getSessionStorage } from '../utils/storage'
import { useSessionStore } from '../store/sessionStore'
import { assertNoSqlInjectionPayload } from '../utils/inputSecurity'

type ApiEnvelope<T> = {
  data: T
  message?: string
  timestamp?: string
}

type UnknownRecord = Record<string, unknown>

const baseURL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL ?? '/api')
const apiVerboseEnabled = import.meta.env.VITE_API_DEBUG === 'true'
const apiIssueLogsEnabled = import.meta.env.DEV || import.meta.env.VITE_API_LOG_ISSUES === 'true'

let unauthorizedHandler: (() => void) | null = null

const MAINTENANCE_EVENT = 'system-maintenance-active'

const maskToken = (token: string): string => {
  if (token.length <= 10) return '***'
  return `${token.slice(0, 6)}...${token.slice(-4)}`
}

const toPlainHeaders = (headers: unknown): Record<string, unknown> => {
  if (!headers) return {}
  if (typeof headers === 'object' && headers !== null) {
    const candidate = headers as { toJSON?: () => Record<string, unknown> }
    if (typeof candidate.toJSON === 'function') {
      return candidate.toJSON()
    }
    return headers as Record<string, unknown>
  }
  return {}
}

const sanitizeHeaders = (headers: unknown): Record<string, unknown> => {
  const plain = toPlainHeaders(headers)
  return Object.fromEntries(
    Object.entries(plain).map(([key, value]) => {
      if (key.toLowerCase() === 'x-session-token' && typeof value === 'string') {
        return [key, maskToken(value)]
      }
      return [key, value]
    })
  )
}

const sanitizePayload = (payload: unknown): unknown => {
  if (payload === undefined || payload === null) return null
  let parsed = payload
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload)
    } catch {
      return payload
    }
  }
  if (!isRecord(parsed)) return parsed
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => {
      const normalized = key.toLowerCase()
      if (normalized.includes('password') || normalized.includes('token') || normalized.includes('contrasena')) {
        return [key, typeof value === 'string' && value ? '***' : value]
      }
      return [key, value]
    })
  )
}

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null
}

const hasOwn = <TKey extends string>(value: UnknownRecord, key: TKey): value is UnknownRecord & Record<TKey, unknown> => {
  return Object.prototype.hasOwnProperty.call(value, key)
}

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  return isRecord(value) && hasOwn(value, 'data')
}

type ApiDebugSnapshot = {
  message: string | null
  timestamp: string | null
  dataType: 'array' | 'object' | 'primitive' | 'null'
  totalItems: number | null
}

const buildApiDebugSnapshot = (payload: unknown): ApiDebugSnapshot => {
  const envelope = isApiEnvelope<unknown>(payload) ? payload : null
  const data = envelope ? envelope.data : payload
  const message = envelope && typeof envelope.message === 'string' ? envelope.message : null
  const timestamp = envelope && typeof envelope.timestamp === 'string' ? envelope.timestamp : null

  if (Array.isArray(data)) {
    return {
      message,
      timestamp,
      dataType: 'array',
      totalItems: data.length,
    }
  }

  if (data === null) {
    return {
      message,
      timestamp,
      dataType: 'null',
      totalItems: null,
    }
  }

  if (isRecord(data)) {
    return {
      message,
      timestamp,
      dataType: 'object',
      totalItems: null,
    }
  }

  return {
    message,
    timestamp,
    dataType: 'primitive',
    totalItems: null,
  }
}

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

const extractValidationFields = (payload: unknown): string[] => {
  if (!isRecord(payload)) return []

  const fields = new Set<string>()
  const collect = (value: unknown): void => {
    const normalized = toNonEmptyString(value)
    if (normalized) fields.add(normalized)
  }

  const errors = payload.errors
  if (isRecord(errors)) {
    for (const fieldName of Object.keys(errors)) {
      collect(fieldName)
    }
  } else if (Array.isArray(errors)) {
    for (const item of errors) {
      if (!isRecord(item)) continue
      collect(item.field)
      collect(item.name)
      collect(item.param)
    }
  }

  const fieldErrors = payload.fieldErrors
  if (isRecord(fieldErrors)) {
    for (const fieldName of Object.keys(fieldErrors)) {
      collect(fieldName)
    }
  }

  const invalidFields = payload.invalidFields
  if (Array.isArray(invalidFields)) {
    for (const field of invalidFields) {
      collect(field)
    }
  }

  return Array.from(fields)
}

const summarizeErrorPayload = (payload: unknown): { message: string | null; fields: string[] } => {
  if (!isRecord(payload)) return { message: null, fields: [] }

  const messageKeys = ['message', 'error', 'detail', 'title']
  let message: string | null = null
  for (const key of messageKeys) {
    const value = payload[key]
    const parsed = toNonEmptyString(value)
    if (parsed) {
      message = parsed
      break
    }
  }

  return {
    message,
    fields: extractValidationFields(payload),
  }
}

const detectSuccessfulResponseIssue = (payload: unknown): string | null => {
  if (payload === undefined || payload === null) {
    return 'respuesta vacia'
  }
  if (isApiEnvelope<unknown>(payload) && (payload.data === undefined || payload.data === null)) {
    return 'envelope sin data'
  }
  return null
}

const isLoginRequest = (url: unknown): boolean => {
  if (typeof url !== 'string') return false
  const normalized = url.toLowerCase()
  return normalized.includes('/auth/login')
}

const parsePositiveSucursal = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed)
  }
  return null
}

const shouldAutoAttachSucursal = (url: unknown): boolean => {
  if (typeof url !== 'string') return false
  const normalized = url.toLowerCase()
  return normalized.startsWith('/catalogos') || normalized.startsWith('/ot')
}

const isDetalleMaterialesRequest = (url: unknown): boolean => {
  if (typeof url !== 'string') return false
  return url.toLowerCase().includes('/ot/detalle-materiales')
}

export const unwrapApiData = <T>(payload: ApiEnvelope<T> | T): T => {
  return isApiEnvelope<T>(payload) ? payload.data : payload
}

export const getApiErrorMessage = (error: unknown, fallback = 'Ocurrio un error al procesar la solicitud.'): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data
    if (isRecord(responseData) && typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export const isAuthError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 401 || status === 403
}

export const isMaintenanceError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  const payload = error.response?.data
  if (!isRecord(payload)) return false
  return payload.code === 'MAINTENANCE_ACTIVE'
}

export const notifyMaintenanceActive = (message?: string): void => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MAINTENANCE_EVENT, { detail: { message } }))
}

export const listenMaintenanceActive = (handler: (message?: string) => void): (() => void) => {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<{ message?: string }>
    handler(customEvent.detail?.message)
  }
  window.addEventListener(MAINTENANCE_EVENT, listener)
  return () => window.removeEventListener(MAINTENANCE_EVENT, listener)
}

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler
}

const httpClient = axios.create({
  baseURL,
})

httpClient.interceptors.request.use((config) => {
  const session = getSessionStorage()
  if (session?.sessionToken) {
    config.headers = config.headers ?? {}
    config.headers['X-Session-Token'] = session.sessionToken
  }
  if (shouldAutoAttachSucursal(config.url)) {
    const idSucursal = parsePositiveSucursal(session?.idSucursal)
    if (idSucursal !== null) {
      const currentParams = isRecord(config.params) ? { ...config.params } : {}
      const hasSucursal =
        Object.prototype.hasOwnProperty.call(currentParams, 'idSucursal') &&
        currentParams.idSucursal !== undefined &&
        currentParams.idSucursal !== null &&
        String(currentParams.idSucursal).trim() !== ''
      if (!hasSucursal) {
        currentParams.idSucursal = idSucursal
      }
      config.params = currentParams
    }
  }
  assertNoSqlInjectionPayload(config.params, 'request.params')
  assertNoSqlInjectionPayload(config.data, 'request.body')
  if (apiVerboseEnabled) {
    const method = (config.method ?? 'get').toUpperCase()
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`
    console.info('[API ->]', method, url, {
      params: config.params ?? null,
      body: sanitizePayload(config.data),
      headers: sanitizeHeaders(config.headers),
    })
  }
  if (isDetalleMaterialesRequest(config.url)) {
    console.warn('[OT][DETALLE][HTTP-REQUEST]', {
      url: `${config.baseURL ?? ''}${config.url ?? ''}`,
      method: (config.method ?? 'post').toUpperCase(),
      params: config.params ?? {},
      data: config.data ?? null,
      sessionSucursal: session?.idSucursal ?? null,
    })
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => {
    const method = (response.config.method ?? 'get').toUpperCase()
    const url = `${response.config.baseURL ?? ''}${response.config.url ?? ''}`
    if (apiVerboseEnabled) {
      const summary = buildApiDebugSnapshot(response.data)
      // Debug resumido: una sola linea por respuesta.
      console.info('[API <-]', response.status, method, url, summary)
    } else if (apiIssueLogsEnabled) {
      const issue = detectSuccessfulResponseIssue(response.data)
      if (issue) {
        console.warn('[API !]', response.status, method, url, issue)
      }
    }
    return response
  },
  (error: AxiosError) => {
    const status = error.response?.status
    const isLogin401 = status === 401 && isLoginRequest(error.config?.url)
    const requestPath = typeof error.config?.url === 'string' ? error.config.url : ''
    if (apiIssueLogsEnabled) {
      const method = (error.config?.method ?? 'get').toUpperCase()
      const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`
      const payloadSummary = summarizeErrorPayload(error.response?.data)
      const message = payloadSummary.message ?? error.message ?? 'Error de API'
      if (payloadSummary.fields.length > 0) {
        console.warn('[API xx VALIDATION]', status ?? 'NO_STATUS', method, url, {
          message,
          fields: payloadSummary.fields,
        })
      } else {
        if (isLogin401) {
          console.warn('[API xx LOGIN]', status ?? 'NO_STATUS', method, url, { message })
        } else {
          console.error('[API xx]', status ?? 'NO_STATUS', method, url, { message })
        }
      }
      if (apiVerboseEnabled) {
        console.error('[API xx DETAIL]', status ?? 'NO_STATUS', method, url, {
          params: error.config?.params ?? null,
          body: error.config?.data ?? null,
          headers: sanitizeHeaders(error.config?.headers),
          response: error.response?.data ?? null,
        })
      }
    }
    if (isDetalleMaterialesRequest(error.config?.url)) {
      console.warn('[OT][DETALLE][HTTP-ERROR]', {
        url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
        method: (error.config?.method ?? 'post').toUpperCase(),
        params: error.config?.params ?? {},
        data: error.config?.data ?? null,
        status: error.response?.status ?? null,
        response: error.response?.data ?? null,
      })
    }
    const maintenanceActive = isMaintenanceError(error)
    if (maintenanceActive) {
      const payload = isRecord(error.response?.data) ? error.response?.data : null
      notifyMaintenanceActive(typeof payload?.message === 'string' ? payload.message : undefined)
    }
    if (status === 401 && !isLogin401) {
      clearSessionStorage()
      useSessionStore.getState().clearSession()
      unauthorizedHandler?.()
      if (window.location.pathname !== '/login') {
        window.setTimeout(() => window.location.assign('/login'), maintenanceActive ? 900 : 0)
      }
    } else if (status === 403 && apiIssueLogsEnabled) {
      console.warn('[API 403]', requestPath || '(ruta desconocida)', 'Se mantiene la sesion local.')
    }
    return Promise.reject(error)
  }
)

export default httpClient
