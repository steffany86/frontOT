export interface OtSummary {
  id: number
  codigo: string
  fecha: string
  cliente: string
  tecnico: string
  estado: string
  direccion?: string
  ruta?: string
  idUsuario?: number
  idTecnico?: number
  usuario?: string
  nombreUsuario?: string
  fechaEjecucion?: string
  ordenTrabajo?: string
  pendiente?: boolean | string
  [key: string]: unknown
}

export interface OtHeader {
  id: number
  codigo: string
  fecha: string
  cliente: string
  direccion: string
  tecnico: string
  estado: string
  observaciones?: string
}

export interface OtDetail {
  header: OtHeader
}

export interface OtMaterial {
  id: number
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  [key: string]: unknown
}

export interface OtListParams {
  fecha?: string
  inicio?: string
  fin?: string
  usuario?: number
  idSucursal?: number
  rol?: string
  pendiente?: boolean
}

export interface ListaOtParams {
  fecha: string
  estado?: string
  estados?: string[]
  tecnico?: string
  idUsuario?: number
  idSucursal?: number
  rol?: string
}

export interface OtRealizadaPayload {
  observacion: string
  idEstado: number
  numeroOrden: string
  fechaAgenda?: string
}

export interface OtUpdatePayload {
  observacion: string
  idEstado: number
  numeroOrden?: string
}

export interface OtFechaPayload {
  fechaVieja: string
  fechaNueva: string
  idRuta: number
  idUsuario: number
}

export interface OtCreatePayload {
  idUsuario: number
  idRuta: number
  idTipoServicio: number
  codigoCliente?: number
  idEstado?: number
  observacion?: string
  tieneObservacion?: boolean
  idSucursal?: number
  nombreCliente?: string
}

export interface OtCreateResult {
  idVenta?: number | null
  ordenTrabajo?: number | null
}

export interface OtCreateResponseEnvelope {
  data?: {
    idVenta?: number | string | null
    Id_Venta?: number | string | null
    ordenTrabajo?: number | string | null
    OrdenTrabajo?: number | string | null
  }
}
