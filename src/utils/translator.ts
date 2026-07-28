/**
 * Nomenclature translator - Convierte códigos de base de datos en etiquetas legibles
 * Traduce nombres de campos, estados, y otras nomenclaturas técnicas a español amigable
 */

export type NomenclatureMap = Record<string, string>

// Traducciones de campos comunes
export const fieldNomenclature: NomenclatureMap = {
  // Campos de identidad
  id: 'ID',
  Id: 'ID',
  ID: 'ID',
  idVenta: 'ID Venta',
  id_venta: 'ID Venta',
  Id_Venta: 'ID Venta',
  idRuta: 'ID Ruta',
  id_ruta: 'ID Ruta',
  Id_Ruta: 'ID Ruta',
  idGrupo: 'ID Grupo',
  id_grupo: 'ID Grupo',
  Id_Grupo: 'ID Grupo',
  idUsuario: 'ID Usuario',
  id_usuario: 'ID Usuario',
  Id_Usuario: 'ID Usuario',
  idSucursal: 'ID Sucursal',
  id_sucursal: 'ID Sucursal',
  Id_Sucursal: 'ID Sucursal',
  idTipoServicio: 'ID Tipo Servicio',
  id_tiposervicio: 'ID Tipo Servicio',
  Id_TipoServicio: 'ID Tipo Servicio',
  id_tipo_servicio: 'ID Tipo Servicio',
  idProducto: 'ID Producto',
  id_producto: 'ID Producto',
  Id_Producto: 'ID Producto',
  idTipoMaterial: 'ID Tipo Material',
  id_tipo_material: 'ID Tipo Material',
  Id_Tipo_Material: 'ID Tipo Material',
  idEstado: 'ID Estado',
  id_estado: 'ID Estado',
  Id_Estado: 'ID Estado',

  // Campos de orden de trabajo
  ot: 'OT',
  OT: 'OT',
  numeroOrden: 'Número Orden',
  numero_orden: 'Número Orden',
  Numero_Orden: 'Número Orden',
  ordenTrabajo: 'Orden Trabajo',
  orden_trabajo: 'Orden Trabajo',
  Orden_Trabajo: 'Orden Trabajo',
  woExternalId: 'ID Externo',
  wo_external_id: 'ID Externo',
  WO_EXTERNAL_ID: 'ID Externo',
  nroOT: 'Nro. OT',
  NroOT: 'Nro. OT',

  // Campos de cliente
  cliente: 'Cliente',
  Cliente: 'Cliente',
  clienteNro: 'Nro. Cliente',
  cliente_nro: 'Nro. Cliente',
  Cliente_Nro: 'Nro. Cliente',
  codigoCliente: 'Código Cliente',
  codigo_cliente: 'Código Cliente',
  Codigo_Cliente: 'Código Cliente',
  nroCliente: 'Nro. Cliente',
  NroCliente: 'Nro. Cliente',
  nombreCliente: 'Nombre Cliente',
  nombre_cliente: 'Nombre Cliente',
  Nombre_Cliente: 'Nombre Cliente',
  NombreCliente: 'Nombre Cliente',

  // Campos de estado
  estado: 'Estado',
  Estado: 'Estado',
  status: 'Estado',
  Status: 'Estado',
  estadoCierre: 'Estado Cierre',
  estado_cierre: 'Estado Cierre',
  Estado_Cierre: 'Estado Cierre',
  nombreEstado: 'Nombre Estado',
  nombre_estado: 'Nombre Estado',
  Nombre_Estado: 'Nombre Estado',
  NombreEstado: 'Nombre Estado',
  estadoNombre: 'Nombre Estado',
  EstadoNombre: 'Nombre Estado',

  // Campos de fecha
  fecha: 'Fecha',
  Fecha: 'Fecha',
  fechaEjecucion: 'Fecha Ejecución',
  fecha_ejecucion: 'Fecha Ejecución',
  Fecha_Ejecucion: 'Fecha Ejecución',
  FechaEjecucion: 'Fecha Ejecución',
  inicioAgendado: 'Inicio Agendado',
  inicio_agendado: 'Inicio Agendado',
  Inicio_Agendado: 'Inicio Agendado',
  InicioAgendado: 'Inicio Agendado',
  hora: 'Hora',
  Hora: 'Hora',
  fechaCreacion: 'Fecha Creación',
  fecha_creacion: 'Fecha Creación',
  Fecha_Creacion: 'Fecha Creación',
  FechaCreacion: 'Fecha Creación',

  // Campos de técnico/usuario
  tecnico: 'Técnico',
  Tecnico: 'Técnico',
  nombreTecnico: 'Nombre Técnico',
  nombre_tecnico: 'Nombre Técnico',
  Nombre_Tecnico: 'Nombre Técnico',
  NombreTecnico: 'Nombre Técnico',
  usuario: 'Usuario',
  Usuario: 'Usuario',
  nombreUsuario: 'Nombre Usuario',
  nombre_usuario: 'Nombre Usuario',
  Nombre_Usuario: 'Nombre Usuario',
  NombreUsuario: 'Nombre Usuario',
  vendedor: 'Vendedor',
  Vendedor: 'Vendedor',
  nombreVendedor: 'Nombre Vendedor',
  nombre_vendedor: 'Nombre Vendedor',
  Nombre_Vendedor: 'Nombre Vendedor',
  NombreVendedor: 'Nombre Vendedor',

  // Campos de ruta/grupo
  ruta: 'Ruta',
  Ruta: 'Ruta',
  grupo: 'Grupo',
  Grupo: 'Grupo',
  nombreRuta: 'Nombre Ruta',
  nombre_ruta: 'Nombre Ruta',
  Nombre_Ruta: 'Nombre Ruta',
  NombreRuta: 'Nombre Ruta',
  nombreGrupo: 'Nombre Grupo',
  nombre_grupo: 'Nombre Grupo',
  Nombre_Grupo: 'Nombre Grupo',
  NombreGrupo: 'Nombre Grupo',

  // Campos de servicio
  tipoServicio: 'Tipo Servicio',
  tipo_servicio: 'Tipo Servicio',
  Tipo_Servicio: 'Tipo Servicio',
  TipoServicio: 'Tipo Servicio',
  nombreTipoServicio: 'Nombre Tipo Servicio',
  nombre_tipo_servicio: 'Nombre Tipo Servicio',
  Nombre_Tipo_Servicio: 'Nombre Tipo Servicio',
  NombreTipoServicio: 'Nombre Tipo Servicio',

  // Campos de material
  material: 'Material',
  Material: 'Material',
  producto: 'Producto',
  Producto: 'Producto',
  nombreProducto: 'Nombre Producto',
  nombre_producto: 'Nombre Producto',
  Nombre_Producto: 'Nombre Producto',
  NombreProducto: 'Nombre Producto',
  cantidad: 'Cantidad',
  Cantidad: 'Cantidad',
  serie: 'Serie',
  Serie: 'Serie',
  chipId: 'Chip ID',
  chip_id: 'Chip ID',
  Chip_ID: 'Chip ID',
  ChipId: 'Chip ID',
  entregado: 'Entregado',
  Entregado: 'Entregado',
  tipoMaterial: 'Tipo Material',
  tipo_material: 'Tipo Material',
  Tipo_Material: 'Tipo Material',
  TipoMaterial: 'Tipo Material',

  // Campos de validación y detalle
  existeVenta: 'Existe Venta',
  ExisteVenta: 'Existe Venta',
  ventaExiste: 'Existe Venta',
  VentaExiste: 'Existe Venta',
  registrado: 'Registrado',
  Registrado: 'Registrado',
  tieneDetalle: 'Tiene Detalle',
  TieneDetalle: 'Tiene Detalle',
  tiene_detalle: 'Tiene Detalle',
  Tiene_Detalle: 'Tiene Detalle',
  tieneDetalleEnCodigoVenta: 'Tiene Detalle en Código Venta',
  TieneDetalleEnCodigoVenta: 'Tiene Detalle en Código Venta',
  existeDetalle: 'Existe Detalle',
  ExisteDetalle: 'Existe Detalle',
  cantidadDetalles: 'Cantidad Detalles',
  CantidadDetalles: 'Cantidad Detalles',
  countDetalles: 'Cantidad Detalles',
  CountDetalles: 'Cantidad Detalles',
  cantidadVentas: 'Cantidad Ventas',
  CantidadVentas: 'Cantidad Ventas',
  countVentas: 'Cantidad Ventas',
  CountVentas: 'Cantidad Ventas',
  addMaterialOCargoUsuario: 'Agregar Material o Cargo Usuario',
  AddMaterialOCargoUsuario: 'Agregar Material o Cargo Usuario',
  addMaterial_o_CargoUsuario: 'Agregar Material o Cargo Usuario',
  AddMaterial_o_CargoUsuario: 'Agregar Material o Cargo Usuario',
  addmaterial_o_cargousuario: 'Agregar Material o Cargo Usuario',
  habilitarCargarMaterial: 'Habilitar Cargar Material',
  HabilitarCargarMaterial: 'Habilitar Cargar Material',
  puedeCargarMaterial: 'Puede Cargar Material',
  PuedeCargarMaterial: 'Puede Cargar Material',

  // Campos de TOR
  tor: 'TOR',
  TOR: 'TOR',
  Tor: 'TOR',

  // Campos de origen
  origen: 'Origen',
  Origen: 'Origen',

  // Campos de observación
  observacion: 'Observación',
  Observacion: 'Observación',
  observaciones: 'Observaciones',
  Observaciones: 'Observaciones',
  nota: 'Nota',
  Nota: 'Nota',
  notas: 'Notas',
  Notas: 'Notas',

  // Campos adicionales
  nombre: 'Nombre',
  Nombre: 'Nombre',
  codigo: 'Código',
  Codigo: 'Código',
  codigo_sistema: 'Código Sistema',
  Codigo_Sistema: 'Código Sistema',
  descripcion: 'Descripción',
  Descripcion: 'Descripción',
  descripción: 'Descripción',
  activo: 'Activo',
  Activo: 'Activo',
  createdAt: 'Creado en',
  created_at: 'Creado en',
  Created_At: 'Creado en',
  CreatedAt: 'Creado en',
  updatedAt: 'Actualizado en',
  updated_at: 'Actualizado en',
  Updated_At: 'Actualizado en',
  UpdatedAt: 'Actualizado en',
}

// Traducciones de estados
export const statusNomenclature: NomenclatureMap = {
  pendiente: 'Pendiente',
  Pendiente: 'Pendiente',
  PENDIENTE: 'Pendiente',
  finalizado: 'Finalizado',
  Finalizado: 'Finalizado',
  FINALIZADO: 'Finalizado',
  finalizada: 'Finalizada',
  Finalizada: 'Finalizada',
  FINALIZADA: 'Finalizada',
  fallida: 'Fallida',
  Fallida: 'Fallida',
  FALLIDA: 'Fallida',
  anulada: 'Anulada',
  Anulada: 'Anulada',
  ANULADA: 'Anulada',
  cancelada: 'Cancelada',
  Cancelada: 'Cancelada',
  CANCELADA: 'Cancelada',
  en_progreso: 'En Progreso',
  En_Progreso: 'En Progreso',
  enProgreso: 'En Progreso',
  EnProgreso: 'En Progreso',
  EN_PROGRESO: 'En Progreso',
  activo: 'Activo',
  Activo: 'Activo',
  ACTIVO: 'Activo',
  inactivo: 'Inactivo',
  Inactivo: 'Inactivo',
  INACTIVO: 'Inactivo',
  bloqueado: 'Bloqueado',
  Bloqueado: 'Bloqueado',
  BLOQUEADO: 'Bloqueado',
  desbloqueado: 'Desbloqueado',
  Desbloqueado: 'Desbloqueado',
  DESBLOQUEADO: 'Desbloqueado',
  manual: 'Manual',
  Manual: 'Manual',
  MANUAL: 'Manual',
  automatico: 'Automático',
  Automatico: 'Automático',
  AUTOMATICO: 'Automático',
  automático: 'Automático',
  Automático: 'Automático',
  si: 'Sí',
  Si: 'Sí',
  SI: 'Sí',
  sí: 'Sí',
  Sí: 'Sí',
  no: 'No',
  No: 'No',
  NO: 'No',
}

// Traducciones de módulos/páginas
export const moduleNomenclature: NomenclatureMap = {
  RegistrarOrdenAgenda_Detalle: 'Registrar Detalle OT',
  OTPrincipal: 'Módulo OT',
  BoleDigital: 'Boleta Digital',
  CuadrillasConformacion: 'Conformación Cuadrillas',
  DigitadorGeoref: 'Digitador Georeferencia',
  LlamadaAtencion: 'Llamada a Atención',
  NpsDashboard: 'Dashboard NPS',
  Supervision: 'Supervisión',
  TOR: 'TOR',
}

/**
 * Traduce un código a su nomenclatura legible en español
 * @param code - El código a traducir
 * @param type - El tipo de nomenclatura ('field', 'status', 'module', 'auto')
 * @returns El código traducido o el código original si no existe traducción
 */
export const translateCode = (code: string, type: 'field' | 'status' | 'module' | 'auto' = 'auto'): string => {
  if (!code || typeof code !== 'string') return String(code)

  const trimmed = code.trim()
  if (!trimmed) return trimmed

  // Si es auto, intentar en todos los mapas
  if (type === 'auto') {
    return fieldNomenclature[trimmed] || statusNomenclature[trimmed] || moduleNomenclature[trimmed] || trimmed
  }

  // Buscar en el mapa específico
  if (type === 'field') {
    return fieldNomenclature[trimmed] || trimmed
  }
  if (type === 'status') {
    return statusNomenclature[trimmed] || trimmed
  }
  if (type === 'module') {
    return moduleNomenclature[trimmed] || trimmed
  }

  return trimmed
}

/**
 * Hook para obtener la traducción de un código
 * Uso: const translated = useTranslate(code)
 */
export const useTranslate = (code: string, type?: 'field' | 'status' | 'module' | 'auto'): string => {
  return translateCode(code, type)
}

export default {
  translateCode,
  useTranslate,
  fieldNomenclature,
  statusNomenclature,
  moduleNomenclature,
}
