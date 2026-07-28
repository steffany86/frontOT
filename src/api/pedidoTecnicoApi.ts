import api from './http'

export type PedidoTecnicoItem = {
  idProducto?: number | null
  material: string
  cantidad: number
}

export type PedidoTecnico = {
  idPedido: number | null
  fecha?: string | null
  idUsuario?: number | null
  idTecnico?: number | null
  idRuta?: number | null
  tecnico?: string
  estado?: string
  observacion?: string
  items: PedidoTecnicoItem[]
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  const normalize = (value: string) => value.replace(/[_\-\s]/g, '').toLowerCase()
  const targets = keys.map(normalize)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [key, value] of Object.entries(row)) {
    if (targets.includes(normalize(key)) && value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toStringValue = (value: unknown): string => (value === undefined || value === null ? '' : String(value))

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const mapItem = (row: Record<string, unknown>): PedidoTecnicoItem => ({
  idProducto: toNumber(readValue(row, ['idProducto', 'IdProducto', 'id_producto', 'Id_Producto', 'productoPedidoAlias', 'ProductoPedidoAlias'])),
  material: toStringValue(readValue(row, [
    'material',
    'materialPedidoAlias',
    'MaterialPedidoAlias',
    'Material',
    'nombreMaterial',
    'NombreMaterial',
    'materialPedido',
    'MaterialPedido',
    'producto',
    'Producto',
    'nombreProducto',
    'NombreProducto',
    'descripcionMaterial',
    'DescripcionMaterial',
    'descripcion',
    'Descripcion',
    'item',
    'Item',
    'articulo',
    'Articulo',
  ])),
  cantidad: toNumber(readValue(row, ['cantidadPedidoAlias', 'CantidadPedidoAlias', 'cantidad', 'Cantidad', 'cant', 'Cant'])) ?? 0,
})

const mapPedido = (row: Record<string, unknown>): PedidoTecnico => {
  const rawItems = readValue(row, ['items', 'detalle'])
  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => mapItem((item ?? {}) as Record<string, unknown>)).filter((item) => item.material || item.cantidad > 0)
    : []
  return {
    idPedido: toNumber(readValue(row, ['pedidoIdAlias', 'PedidoIdAlias', 'idPedido', 'IdPedido', 'id_pedido', 'Id_PedidoTecnico', 'IdPedidoTecnico'])),
    fecha: toStringValue(readValue(row, ['fecha', 'pedidoFechaAlias', 'PedidoFechaAlias', 'Fecha_Registro', 'fecha_registro', 'Fecha', 'fechaRegistro', 'FechaRegistro'])) || null,
    idUsuario: toNumber(readValue(row, ['idUsuario', 'IdUsuario', 'id_usuario', 'Id_Usuario'])),
    idTecnico: toNumber(readValue(row, ['idTecnico', 'IdTecnico', 'id_tecnico', 'Id_Tecnico'])),
    idRuta: toNumber(readValue(row, ['idRuta', 'IdRuta', 'id_ruta', 'Id_Ruta', 'ruta', 'Ruta'])),
    tecnico: toStringValue(readValue(row, ['tecnico', 'Tecnico', 'usuario', 'Usuario', 'nombreUsuario', 'NombreUsuario', 'nombreTecnico', 'NombreTecnico'])),
    estado: toStringValue(readValue(row, ['estado', 'Estado'])) || 'PENDIENTE',
    observacion: toStringValue(readValue(row, ['observacion', 'Observacion'])),
    items,
  }
}

export const fetchPedidosTecnico = async (): Promise<PedidoTecnico[]> => {
  const { data } = await api.get('/pedidos-tecnico')
  const rows = unwrap<Record<string, unknown>[]>(data)
  return (rows ?? []).map(mapPedido)
}

export const crearPedidoTecnico = async (payload: { observacion?: string; items: PedidoTecnicoItem[] }): Promise<Record<string, unknown>> => {
  const { data } = await api.post('/pedidos-tecnico', payload)
  return unwrap<Record<string, unknown>>(data)
}
