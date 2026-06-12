export type CentralTecnicoAsignado = {
  idUsuarioTecnico: string
  idVendedor?: string
  tecnico: string
}

export type CentralGrupo = {
  idGrupo: string
  nombre: string
  supervisor?: string
  supervisorAusente?: boolean
  tecnicoTemporalBackup?: string
  idTecnicoTemporalBackup?: string
  fechaRegistro?: string
  cantidadSupervisores?: number
  cantidadTecnicos?: number
  tecnicos: CentralTecnicoAsignado[]
}

export type CentralSupervisor = {
  idUsuarioSupervisor: string
  supervisorACargo: string
}

export type CentralTecnico = {
  idTecnico: string
  tecnico: string
}
