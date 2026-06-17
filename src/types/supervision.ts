export type SupervisionTecnico = {
  idTecnico: string
  tecnico: string
  codigo?: string
  codEmpleado?: string
  cuentaSf?: string
  habilidad?: string
  vehiculo?: string
  grupo?: string
  idRuta?: string
}

export type SupervisionCatalogoItem = {
  id: string
  nombre: string
}

export type SupervisionRegistro = {
  idSupervision: string
  fechaRegistro?: string
  idSupervisor?: string
  supervisor?: string
  idTecnicoPrincipal?: string
  tecnicoPrincipal?: string
  idTecnicoAuxiliar?: string
  tecnicoAuxiliar?: string
  idTipoSupervision?: string
  tipoSupervision?: string
  idTipoTrabajo?: string
  tipoTrabajo?: string
  idTipoPenalizacion?: string
  tipoPenalizacion?: string
  supervisionPor?: string
  tecnologia?: string
  codigo?: string
  ordenTrabajo?: string
  tipoRevision?: string
  observacion?: string
  descripcionAdicionalObservacion?: string
  ubicacion?: string
  fotoBoletaSupervision?: string
  fotoCanalesPilos?: string
  fotoNivelesDocsis?: string
  fotoMedicionRuido?: string
  fotoBarridoCanales?: string
  fotoObservacion1?: string
  fotoObservacion2?: string
  fotoObservacion3?: string
  fotoObservacion4?: string
  estadoSup?: 'pendiente' | 'completado' | string
}

export type SupervisionListParams = {
  fechaDesde?: string
  fechaHasta?: string
  limite?: number
}

export type SupervisionTecnicosParams = {
  q?: string
  limit?: number
  sucursal?: string
}

export type SupervisionCreatePayload = {
  idTecnicoPrincipal: string
  idTecnicoAuxiliar: string
  idTipoSupervision: string
  idTipoTrabajo: string
  idTipoPenalizacion: string
  supervisionPor: string
  tecnologia: string
  codigo: string
  ordenTrabajo: string
  tipoRevision: string
  ubicacion: string
  observacion?: string
  descripcionAdicionalObservacion?: string
  fotoBoletaSupervision?: string
  fotoCanalesPilos?: string
  fotoNivelesDocsis?: string
  fotoMedicionRuido?: string
  fotoBarridoCanales?: string
  fotoObservacion1?: string
  fotoObservacion2?: string
  fotoObservacion3?: string
  fotoObservacion4?: string
}

export type SupervisionCreateResult = {
  idSupervision: string
  idUsuarioSesion?: number
}

export type SupervisionInicioPendiente = {
  idInicio: string
  idTecnico?: string
  tecnicoNombre?: string
  idAuxiliar?: string
  auxiliarNombre?: string
  idSupervisor?: string
  supervisorNombre?: string
  fechaRegistro?: string
  fechaCierre?: string
  imagen?: string
  estado?: string
  capacitado?: string
  charla?: string
  botiquin?: string
  extintor?: string
  fechaVencimiento?: string
  equipoEpp?: string
  estadoEpp?: string
  apr?: string
  escalera?: string
  anclaje?: string
  ubicacionGeoref?: string
  codigoClienteCierre?: string
  danoMaterial?: string
  observacionMaterial?: string
  danoPersona?: string
  observacionPersona?: string
  novedadesTrabajo?: string
  observacionNovedades?: string
  ubicacionCierreGeoref?: string
}
