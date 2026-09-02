export interface ConformacionCuadrillaInput {
  fecha: string
  estado: string
  actividad: string
  idTecnico?: number | null
  cuentaSf?: string
  salesforce?: string
  habilidad?: string
  vehiculo?: string
  grupo?: string
  almacen?: string
  grupoDigitacion?: string
  idUsuarioDigitador?: number | null
  digitador?: string
  tecnico?: string
  idTecnicoAuxiliar?: number | null
  auxiliar?: string
  idUsuarioSupervisor?: number | null
  supervisorACargo?: string
  sucursal?: string
  observacion?: string
  idUsuarioRegistra?: number | null
  supervisorConfirmo?: string | null
}

export interface ConformacionCuadrillaRecord extends Omit<ConformacionCuadrillaInput, 'fecha' | 'estado' | 'actividad'> {
  [key: string]: unknown
  fecha?: string | null
  estado?: string | null
  actividad?: string | null
  id?: number
  Id?: number | string | null
  idRegistro?: number | null
  detalleApiDisponible?: boolean
  idRuta?: number | null
  IdRuta?: number | string | null
  id_ruta?: number | string | null
  Id_Ruta?: number | string | null
  id_tecnico?: number | null
  id_vendedor?: number | string | null
  idVendedor?: number | string | null
  IdVendedor?: number | string | null
  Id_Vendedor?: number | string | null
  id_tecnico_auxiliar?: number | string | null
  id_usuario_digitador?: number | string | null
  id_usuario_supervisor?: number | string | null
  ruta?: string | null
  tipo?: string | null
  visible?: boolean | null
  bodegaTigo?: string | null
  almacenTigo?: string | null
  fechaRegistro?: string | null
  supervisorConfirmo?: string | null
  fechaCreacion?: string | null
  fechaActualizacion?: string | null
  fechaModificacion?: string | null
  e_eliminado?: boolean | number
  eEliminado?: boolean | number | string | null
  eliminado?: boolean | number | string | null
  Confirmada?: boolean | number | string | null
  confirmada?: boolean
}

export interface ConformacionCuadrillaPayload {
  filas: ConformacionCuadrillaInput[]
}

export interface ConformacionCuadrillaRelacionPayload {
  idRuta: number
  idTecnicoAuxiliar: number | null
  auxiliar: string | null
  idUsuarioDigitador: number | null
  digitador: string | null
  sucursal: string | null
  activo: boolean
}
