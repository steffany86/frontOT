export type LlamadaAtencionTecnico = {
  idTecnico: string
  tecnico: string
  codEmpleado?: string
  cuentaSf?: string
  salesforce?: string
  habilidad?: string
  vehiculo?: string
}

export type LlamadaAtencionTipoComunicacion = {
  idTipoComunicacion: string
  tipoComunicacion: string
}

export type LlamadaAtencionRegistro = {
  idLlamadaAtencion: string
  idTecnico?: string
  tecnico?: string
  codEmpleado?: string
  idUsuarioSupervisor?: number
  idTipoComunicacion?: string
  tipoComunicacion?: string
  fechaRegistro?: string
  motivo?: string
  descripcion?: string
  comentarioColaborador?: string
  acuerdos?: string
  testigo?: string
  fechaSeguimiento?: string
  firmaTecnico?: string
  firmaTestigo?: string
}

export type LlamadaAtencionListParams = {
  idTecnico?: string
  fechaDesde?: string
  fechaHasta?: string
  limite?: number
}

export type LlamadaAtencionTecnicosParams = {
  q?: string
  limit?: number
  sucursal?: string
}

export type LlamadaAtencionCreatePayload = {
  idTecnico: string
  codEmpleado: string
  idTipoComunicacion: string
  motivo: string
  descripcion?: string
  comentarioColaborador?: string
  acuerdos?: string
  testigo: string
  fechaSeguimiento?: string
  firmaTecnico?: string
  firmaTestigo?: string
}

export type LlamadaAtencionCreateResult = {
  idLlamadaAtencion: string
  idUsuarioSesion?: number
}
