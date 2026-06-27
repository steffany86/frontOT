type ApiErrorPayload = {
  code?: string
  message?: string
  details?: unknown
  timestamp?: string
  path?: string
}

const compactJson = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

const buildApiErrorMessage = (payload: ApiErrorPayload, fallback: string): string => {
  const code = typeof payload.code === 'string' ? payload.code.trim() : ''
  const message = typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : fallback
  const details = compactJson(payload.details)
  if (code && details) return `[${code}] ${message} | details: ${details}`
  if (code) return `[${code}] ${message}`
  if (details) return `${message} | details: ${details}`
  return message
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const normalizeArrayResponse = <T>(payload: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (isRecord(payload)) {
    const data = payload.data
    if (Array.isArray(data)) {
      return data as T[]
    }

    const message = typeof payload.message === 'string' ? payload.message : ''
    const hasErrorShape = Boolean(
      (payload as ApiErrorPayload).code || (payload as ApiErrorPayload).path || (payload as ApiErrorPayload).details
    )

    if (hasErrorShape) {
      throw new Error(buildApiErrorMessage(payload as ApiErrorPayload, message || 'Ocurrio un error al cargar los datos.'))
    }
  }

  if (import.meta.env.DEV) {
    console.warn('Respuesta sin formato esperado:', payload)
  }

  return fallback
}
