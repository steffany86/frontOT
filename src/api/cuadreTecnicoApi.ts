import api from './http'
import { apiBaseURL } from '../services/httpClient'

export type CuadreDetalle = {
  idProducto: number | null
  producto: string
  saldo: number
  vendido: number
  retirado: number
  sobrante: number
  precio: number
  totalVendido: number
}

export type CuadreRetiro = {
  idProducto: number | null
  producto: string
  cantidad: number
}

export type CuadreRuta = {
  idRuta: number
  ruta: string
  idVendedor?: number | null
  cuadreRegistrado: boolean
  registroDisponible: boolean
  bloqueoRegistro?: string | null
  cantidadOt: number
  resumen: Record<string, number>
  detalle: CuadreDetalle[]
  retiros: CuadreRetiro[]
}

export type CuadreTecnicoActual = {
  fecha: string
  idTecnico: number
  tecnico: string
  idSucursal?: number | null
  rutas: CuadreRuta[]
  resumen: Record<string, number>
}

export type CuadreAutomaticoResultado = {
  idRuta: number | null
  ruta: string
  idVendedor?: number | null
  vendedor?: string | null
  fecha: string
  estado: string
  mensaje: string
  idCuadre?: number | null
  cantidadOt?: number
  resumen?: Record<string, number>
}

export type CuadreAutomaticoResponse = {
  fecha: string
  idSucursal: number
  idUsuarioRegistro?: number
  rutas: CuadreAutomaticoResultado[]
  resumen: Record<string, number>
}

export type CuadreAutomaticoJobStart = {
  jobId: string
  estado: string
  fecha?: string
  idSucursal?: number | null
}

export type CuadreAutomaticoProgressEvent = {
  type: 'progress' | 'route' | 'complete' | 'error' | string
  status: 'pending' | 'running' | 'success' | 'warning' | 'error' | string
  step: string
  message: string
  timestamp?: string
  rutaIndex?: number | null
  totalRutas?: number | null
  idRuta?: number | null
  ruta?: string | null
  codigo?: string | null
  resultadoRuta?: CuadreAutomaticoResultado
  resultado?: CuadreAutomaticoResponse
  error?: string
}

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export const fetchCuadreTecnicoActual = async (fecha?: string): Promise<CuadreTecnicoActual> => {
  const response = await api.get('/cuadre/tecnico/actual', { params: fecha ? { fecha } : undefined })
  return unwrap<CuadreTecnicoActual>(response.data)
}

export const registrarCuadreTecnico = async (params: {
  idRuta: number
  cantidadOt: number
  fecha?: string
  observacion?: string
}): Promise<Record<string, unknown>> => {
  const response = await api.post('/cuadre/tecnico/registrar', null, { params })
  return unwrap<Record<string, unknown>>(response.data)
}

export const fetchCuadreAutomaticoPreview = async (params: {
  fecha?: string
  idSucursal: number
}): Promise<CuadreAutomaticoResponse> => {
  const response = await api.get('/cuadre/sistemas/automatico/preview', { params })
  return unwrap<CuadreAutomaticoResponse>(response.data)
}

export const ejecutarCuadreAutomatico = async (params: {
  fecha?: string
  idSucursal: number
}): Promise<CuadreAutomaticoResponse> => {
  const response = await api.post('/cuadre/sistemas/automatico/ejecutar', null, { params })
  return unwrap<CuadreAutomaticoResponse>(response.data)
}

export const iniciarCuadreAutomatico = async (params: {
  fecha?: string
  idSucursal: number
}): Promise<CuadreAutomaticoJobStart> => {
  const response = await api.post('/cuadre/sistemas/automatico/iniciar', null, { params })
  return unwrap<CuadreAutomaticoJobStart>(response.data)
}

export const buildCuadreAutomaticoProgressUrl = (jobId: string): string => {
  const base = apiBaseURL.replace(/\/+$/, '')
  const path = `/cuadre/sistemas/automatico/progreso/${encodeURIComponent(jobId)}`
  return `${base}${path}`
}
