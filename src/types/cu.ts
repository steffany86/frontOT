export interface CuNoRealizadoSummary {
  id: number
  fecha: string
  tecnico: string
  motivo: string
  estado: string
}

export interface CuNoRealizadoDetail extends CuNoRealizadoSummary {
  cliente: string
  direccion: string
  descripcion: string
}

export interface CuNoRealizadoCreatePayload {
  fecha: string
  tecnico: string
  motivo: string
  cliente: string
  direccion: string
  descripcion: string
}
