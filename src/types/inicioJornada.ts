export type InicioJornadaEstado = {
  idTecnico: number
  pendiente: boolean
  fechaServidor?: string
  idEncargado?: string
  encargado?: string
  idAuxiliar?: number
  auxiliar?: string
  auxiliarNombre?: string
  tieneAuxiliar?: boolean
  requiereCierreAyer?: boolean
  idInicioPendienteCierre?: number
  fechaInicioPendienteCierre?: string
  supervisorPendienteCierre?: string
  inicioRechazadoHoy?: boolean
  idInicioRechazado?: number
  fechaInicioRechazado?: string
  observacionRechazado?: string
}

export type CierreJornadaEstado = {
  idTecnico: number
  tieneInicioHoy: boolean
  cerradoHoy: boolean
  requiereCierre: boolean
  noMarcoCount: number
  requiereCierreAyer?: boolean
  idInicioPendienteCierre?: number
  fechaInicioPendienteCierre?: string
  supervisorPendienteCierre?: string
}

export type InicioJornadaEncargado = {
  idEncargado: string
  encargado: string
}

export type InicioJornadaCreatePayload = {
  idAuxiliar?: number | null
  idEncargado?: number
  estoyTrabajandoSolo?: boolean
  capacitado: 'SI' | 'NO'
  charla: 'SI' | 'NO'
  botiquin: 'SI' | 'NO'
  extintor: 'SI' | 'NO'
  fechaVencimiento: string
  equipoEpp: 'SI' | 'NO'
  estadoEpp: 'SI' | 'NO'
  apr: 'SI' | 'NO'
  escalera: 'SI' | 'NO'
  anclaje: 'SI' | 'NO'
  imagen: string
  imagenAuxiliar?: string
  firmaInicio?: string
  ubicacionGeoRef?: string
  aceptoInicioJornada?: 'SI' | 'NO'
  sucursal?: string
}

export type CierreJornadaPayload = {
  idInicio?: number
  codigoCliente: string
  danoMaterial: 'SI' | 'NO'
  observacionMaterial?: string
  danoPersona: 'SI' | 'NO'
  observacionPersona?: string
  novedadesTrabajo: 'SI' | 'NO'
  observacionNovedades?: string
  ubicacionGeoRef: string
  firmaCierre?: string
  aceptoCierreJornada?: 'SI' | 'NO'
}
