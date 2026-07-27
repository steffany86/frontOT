import api from './http'

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
