import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type CatalogItem = Record<string, unknown>

type ApiRecord = Record<string, unknown>

export const fetchTecnicos = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tecnicos')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchRutas = async (tecnicoId?: number): Promise<CatalogItem[]> => {
  const params = tecnicoId ? { tecnicoId } : undefined
  const { data } = await api.get('/catalogos/rutas', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchTiposServicio = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tipo-servicio')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchEstados = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/estados')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchCatalogSucursales = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/sucursales')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchTipoMaterial = async (tipoServicioId: number): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tipo-material', { params: { tipoServicioId } })
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchProductos = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/productos')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchProductosMascara = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/productos/mascara')
  return normalizeArrayResponse<CatalogItem>(data)
}

type SerieSaldoValidationParams = {
  serie: string
  idProducto: number
  idTipoMaterial: number
  idRuta?: number | null
}

type SerieSaldoValidationResult = {
  sePuede: boolean
  observacion?: string
  chipId?: string
  idProducto?: number
}

const pickValue = (row: CatalogItem, keys: string[]): unknown => {
  if (!row) return undefined
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  return undefined
}

const toStringValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim() || null
  return null
}

const toNumberValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const isRecord = (value: unknown): value is ApiRecord => {
  return typeof value === 'object' && value !== null
}

const parseSeriesAllowedFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').toLowerCase()
    if (['sepuede', 's', 'si', 'true', '1', 'sepuederegistrar'].includes(normalized)) return true
    if (['nosepuede', 'false', '0', 'no'].includes(normalized)) return false
  }
  return null
}

const buildSerieSaldoResult = (row: CatalogItem): SerieSaldoValidationResult => {
  const sePuede = parseSeriesAllowedFlag(
    pickValue(row, ['SePuede', 'Se Puede', 'SePuedeRegistrar', 'SePuedeRegistrado', 'Se Puede Registrar'])
  )
  const observacion = pickValue(row, ['Observacion', 'Observación', 'Mensaje', 'Message'])
  const chipId = pickValue(row, ['ChipID', 'ChipId', 'chipId', 'chipid'])
  const productoId = pickValue(row, ['Id_Producto', 'id_producto', 'IdProducto', 'idProducto', 'ProductoId'])
  return {
    sePuede: sePuede ?? false,
    observacion: toStringValue(observacion) ?? undefined,
    chipId: toStringValue(chipId) ?? undefined,
    idProducto: toNumberValue(productoId) ?? undefined,
  }
}

export const validarSerieSaldo = async (params: SerieSaldoValidationParams): Promise<SerieSaldoValidationResult> => {
  const { data } = await api.get('/catalogos/spx_TraerDatoSerieChipIdCU_OT', {
    params: {
      serie: params.serie,
      idProducto: params.idProducto,
      tipoMaterial: params.idTipoMaterial,
      idRuta: params.idRuta ?? undefined,
    },
  })
  const rows = normalizeArrayResponse<CatalogItem>(data)
  if (rows.length === 0) {
    return {
      sePuede: false,
      observacion: 'No se pudo validar la serie.',
    }
  }
  return buildSerieSaldoResult(rows[0])
}

type SerieChipUniqueValidationParams = {
  serie: string
  chipId: string
}

type SerieChipUniqueValidationResult = {
  sePuede: boolean
  observacion?: string
  serieExiste?: boolean
  chipExiste?: boolean
  mismoRegistro?: boolean
}

const buildSerieChipUniqueResult = (payload: unknown): SerieChipUniqueValidationResult => {
  const row = isRecord(payload) ? payload : {}
  const data = isRecord(row.data) ? row.data : row
  return {
    sePuede: Boolean(data.sePuede),
    observacion: toStringValue(data.observacion) ?? undefined,
    serieExiste: typeof data.serieExiste === 'boolean' ? data.serieExiste : undefined,
    chipExiste: typeof data.chipExiste === 'boolean' ? data.chipExiste : undefined,
    mismoRegistro: typeof data.mismoRegistro === 'boolean' ? data.mismoRegistro : undefined,
  }
}

export const validarSerieChipUnico = async (
  params: SerieChipUniqueValidationParams
): Promise<SerieChipUniqueValidationResult> => {
  const { data } = await api.get('/catalogos/validar-serie-chip', {
    params: {
      serie: params.serie,
      chipId: params.chipId,
    },
  })
  return buildSerieChipUniqueResult(data)
}

export const fetchChipIdBySerie = async (serie: string): Promise<{ chipId?: string; idProducto?: number }> => {
  if (!serie.trim()) return {}
  const { data } = await api.get('/catalogos/chip-id/spx_TraerChipID2', {
    params: { serie: serie.trim() },
  })
  const rows = normalizeArrayResponse<CatalogItem>(data)
  if (rows.length === 0) return {}
  const row = rows[0]
  return {
    chipId: toStringValue(pickValue(row, ['ChipID', 'ChipId', 'chipId', 'chipid'])) ?? undefined,
    idProducto: toNumberValue(pickValue(row, ['Id_Producto', 'id_producto', 'IdProducto', 'idProducto', 'ProductoId'])) ?? undefined,
  }
}

export const fetchUsuarios = async (rolId?: number | string): Promise<CatalogItem[]> => {
  const params = rolId ? { rolId } : undefined
  const { data } = await api.get('/catalogos/usuarios', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}
