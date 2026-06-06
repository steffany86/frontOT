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

export const fetchNomencladores = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/nomencladores')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchKitsDecodificadores = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/kits-decodificadores')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchEstados = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/estados')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchRamales = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/ramales')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchTiposTecnologia = async (idRuta: number): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tipo-tecnologia', { params: { idRuta } })
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

export const fetchProductos = async (rutaId: number): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/productos/TraerTodosLosProductos_x_IdRutaWeb', {
    params: { rutaId },
  })
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchProductosSinFungible = async (rutaId?: number): Promise<CatalogItem[]> => {
  const params = typeof rutaId === 'number' && Number.isFinite(rutaId) && rutaId > 0 ? { rutaId } : undefined
  const { data } = await api.get('/catalogos/productos/TraerTodosLosProductos_SinFungibleWeb', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchProductosCargoUsuario = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/productos/TraerTodosLosProductosPCargoUsuarioWeb')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const buscarSerialCargoUsuario = async (params: {
  serial?: string
  chipId?: string
  tipoCodigo: number
}): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/cargo-usuario/buscar', {
    params,
  })
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

const collectErrorFragments = (error: unknown): string[] => {
  const fragments: string[] = []
  const pushValue = (value: unknown): void => {
    if (typeof value === 'string' && value.trim()) {
      fragments.push(value.trim().toLowerCase())
    }
  }

  if (isRecord(error)) {
    pushValue(error.message)
    const response = isRecord(error.response) ? error.response : null
    const payload = response && isRecord(response.data) ? response.data : null
    if (payload) {
      pushValue(payload.message)
      pushValue(payload.error)
      pushValue(payload.rootCause)
      const details = isRecord(payload.details) ? payload.details : null
      if (details) {
        pushValue(details.rootCause)
        pushValue(details.exception)
      }
    }
  }

  return fragments
}

const isNoResultSetError = (error: unknown): boolean => {
  const fragments = collectErrorFragments(error)
  if (fragments.length === 0) return false
  const joined = fragments.join(' | ')
  return (
    joined.includes('did not return a result set') ||
    joined.includes('did not return any results') ||
    joined.includes('no devolvio un conjunto de resultados') ||
    joined.includes('no resultset')
  )
}

const parseSeriesAllowedFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').toLowerCase()
    if (['sepuede', 's', 'si', 'true', '1', 'sepuederegistrar'].includes(normalized)) return true
    if (['nosepuede', 'nosepuederegistrar', 'false', '0', 'no'].includes(normalized)) return false
  }
  return null
}

const parseExistsFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').toLowerCase()
    if (['existe', 'si', 's', 'true', '1'].includes(normalized)) return true
    if (['noexiste', 'no', 'n', 'false', '0'].includes(normalized)) return false
  }
  return null
}

const buildSerieSaldoResult = (row: CatalogItem): SerieSaldoValidationResult => {
  const sePuede = parseSeriesAllowedFlag(
    pickValue(row, ['SePuede', 'Se Puede', 'SePuedeRegistrar', 'SePuedeRegistrado', 'Se Puede Registrar'])
  )
  const observacion = pickValue(row, ['Observacion', 'Observacion', 'Mensaje', 'Message'])
  const chipId = pickValue(row, ['ChipID', 'ChipId', 'chipId', 'chipid'])
  const productoId = pickValue(row, ['Id_Producto', 'id_producto', 'IdProducto', 'idProducto', 'ProductoId'])
  return {
    sePuede: sePuede ?? false,
    observacion: toStringValue(observacion) ?? undefined,
    chipId: toStringValue(chipId) ?? undefined,
    idProducto: toNumberValue(productoId) ?? undefined,
  }
}

type CargoUsuarioProcValidationResult = {
  existe: boolean
  sePuede: boolean
  observacion?: string
  chipId?: string
  serial?: string
  idProducto?: number
  endpointMissing?: boolean
}

let cargoUsuarioProcEndpointMissing = false
let cargoUsuarioProcCunr2EndpointMissing = false

type VerificarEstadoSerieParams = {
  serie: string
  chipId?: string
  idProducto: number
  idTipoMaterial: number
  idRuta?: number | null
}

type VerificarEstadoSerieResult = {
  sePuede: boolean
  observacion?: string
  endpointMissing?: boolean
}

export const validarEstadoSerieRegistroOt = async (
  params: VerificarEstadoSerieParams
): Promise<VerificarEstadoSerieResult> => {
  const serieTrim = params.serie.trim()
  if (!serieTrim) return { sePuede: true }

  try {
    const { data } = await api.get('/catalogos/spx_TraerDatoSerieChipIdCU_OT', {
      params: {
        serie: serieTrim,
        idProducto: params.idProducto,
        tipoMaterial: params.idTipoMaterial,
        idRuta: params.idRuta ?? undefined,
      },
    })
    const rows = normalizeArrayResponse<CatalogItem>(data)
    if (rows.length === 0) return { sePuede: true }

    const row = rows[0]
    const values = Object.values(row)
    const estadoRaw =
      toStringValue(pickValue(row, ['Resultado', 'resultado', 'Estado', 'estado', 'SePuede', 'sePuede'])) ??
      toStringValue(values[0]) ??
      ''
    const estadoNorm = estadoRaw.trim().toLowerCase()
    const sePuede = !(estadoNorm.includes('nosepuede') || estadoNorm.includes('no se puede'))
    const observacion =
      toStringValue(pickValue(row, ['Observacion', 'observacion', 'Mensaje', 'mensaje', 'Detalle', 'detalle'])) ??
      toStringValue(values[1]) ??
      undefined
    return {
      sePuede,
      observacion,
    }
  } catch (error: unknown) {
    throw error
  }
}

const buildCargoUsuarioProcResult = (rows: CatalogItem[]): CargoUsuarioProcValidationResult => {
  if (rows.length === 0) {
    return {
      existe: false,
      sePuede: true,
    }
  }

  const row = rows[0]
  const existe = parseExistsFlag(pickValue(row, ['Existe', 'existe'])) ?? true
  const sePuede = parseSeriesAllowedFlag(
    pickValue(row, ['SePuede', 'sePuede', 'Se Puede', 'SePuedeRegistrar', 'resultado', 'Resultado'])
  )
  const observacion = toStringValue(pickValue(row, ['Observacion', 'observacion', 'Mensaje', 'mensaje', 'Detalle', 'detalle']))
  const chipId = toStringValue(pickValue(row, ['ChipID', 'ChipId', 'chipId', 'chipid']))
  const serial = toStringValue(pickValue(row, ['Serial', 'serial']))
  const idProducto = toNumberValue(pickValue(row, ['Id_Producto', 'id_producto', 'IdProducto', 'idProducto', 'ProductoId']))

  return {
    existe,
    sePuede: existe ? sePuede ?? true : true,
    observacion: observacion ?? undefined,
    chipId: chipId ?? undefined,
    serial: serial ?? undefined,
    idProducto: idProducto ?? undefined,
  }
}

export const validarCargoUsuarioConProc = async (codigo: string): Promise<CargoUsuarioProcValidationResult> => {
  const codigoTrim = codigo.trim()
  if (!codigoTrim) {
    return {
      existe: false,
      sePuede: true,
    }
  }

  if (cargoUsuarioProcEndpointMissing) {
    return {
      existe: false,
      sePuede: true,
      endpointMissing: true,
    }
  }
  try {
    const { data } = await api.get('/catalogos/spx_TraerDatoSerieChipIdCU', {
      params: { serie: codigoTrim },
    })
    const rows = normalizeArrayResponse<CatalogItem>(data)
    return buildCargoUsuarioProcResult(rows)
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      cargoUsuarioProcEndpointMissing = true
      return {
        existe: false,
        sePuede: true,
        endpointMissing: true,
      }
    }
    throw error
  }
}

export const validarCargoUsuarioConProcCunr2 = async (
  serie: string,
  chipId: string
): Promise<CargoUsuarioProcValidationResult> => {
  const serieTrim = serie.trim()
  const chipTrim = chipId.trim()
  if (!serieTrim || !chipTrim) {
    return {
      existe: false,
      sePuede: true,
    }
  }

  if (cargoUsuarioProcCunr2EndpointMissing) {
    return {
      existe: false,
      sePuede: true,
      endpointMissing: true,
    }
  }
  try {
    const { data } = await api.get('/catalogos/spx_TraerDatoSerieChipIdCU_CUNR2', {
      params: { serie: serieTrim, chipId: chipTrim },
    })
    const rows = normalizeArrayResponse<CatalogItem>(data)
    return buildCargoUsuarioProcResult(rows)
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      cargoUsuarioProcCunr2EndpointMissing = true
      return {
        existe: false,
        sePuede: true,
        endpointMissing: true,
      }
    }
    throw error
  }
}

export const validarSerieSaldo = async (params: SerieSaldoValidationParams): Promise<SerieSaldoValidationResult> => {
  try {
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
        observacion: 'La serie no existe en saldo.',
      }
    }
    return buildSerieSaldoResult(rows[0])
  } catch (error: unknown) {
    if (isNoResultSetError(error)) {
      return {
        sePuede: false,
        observacion: 'La serie no existe en saldo.',
      }
    }
    throw error
  }
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

export type SerieSuggestion = {
  serial: string
  chipId?: string
  idProducto?: number
}

export const fetchSeriesSuggestions = async (q: string, limite = 10): Promise<SerieSuggestion[]> => {
  const term = q.trim()
  if (term.length < 1) return []
  const { data } = await api.get('/catalogos/series/sugerencias', {
    params: { q: term, limite },
  })
  const rows = normalizeArrayResponse<CatalogItem>(data)
  return rows
    .map((row) => ({
      serial: toStringValue(pickValue(row, ['serial', 'Serial'])) ?? '',
      chipId: toStringValue(pickValue(row, ['chipId', 'ChipID', 'ChipId'])) ?? undefined,
      idProducto: toNumberValue(pickValue(row, ['idProducto', 'Id_Producto', 'id_producto'])) ?? undefined,
    }))
    .filter((item) => item.serial)
}

export const fetchUsuarios = async (rolId?: number | string): Promise<CatalogItem[]> => {
  const params = rolId ? { rolId } : undefined
  const { data } = await api.get('/catalogos/usuarios', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}
