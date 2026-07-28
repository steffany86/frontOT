import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import Tabs from '../components/common/Tabs'
import Table, { type Column } from '../components/common/Table'
import {
  buscarSerialCargoUsuario,
  fetchChipIdBySerie,
  fetchSeriesSuggestions,
  fetchEstados,
  fetchKitsDecodificadores,
  fetchMaterialesAutocarga,
  fetchNomencladores,
  fetchRutas,
  fetchProductosCargoUsuario,
  fetchProductos,
  fetchProductosSinFungible,
  fetchProductosMascara,
  fetchTipoMaterial,
  fetchTiposServicio,
  validarCargoUsuarioConProc,
  validarCargoUsuarioConProcCunr2,
  validarEstadoSerieRegistroOt,
  validarSerieSaldo,
  validarSerieChipUnico,
  type CatalogItem,
} from '../api/catalogApi'
import {
  createOtCargoUsuario,
  createOtDetalle,
  createOtRealizada,
  fetchOtByNumero,
  fetchOtRegistroCompleto,
  fetchSaldoRuta,
  validateCuadreRuta,
  validateExisteCierreAlmacen,
} from '../api/otApi'
import { useAuth } from '../context/AuthContext'
import { getSessionRemainingMs, getSessionStorage } from '../utils/storage'
import { todayISO } from '../utils/dates'

type UnknownRecord = Record<string, unknown>

type DetailNavState = {
  numeroOrden?: string
  clienteNro?: string
  fecha?: string
  tor?: string
  grupo?: string
  tecnicoNombre?: string
  idRuta?: string
  idSucursal?: string
  idTipoServicio?: string
  idVenta?: string
  origenPendienteMaterial?: string
  rowData?: UnknownRecord
}

type MaterialRow = {
  id: string
  idProducto: number
  producto: string
  serie: string
  chipId: string
  cantidad: number
  idTipoMaterial: number
  tipoMaterialLabel: string
  entregado: boolean
  requiresChip: boolean
}

type SerieSuggestionOption = {
  serial: string
  chipId?: string
}

type CargoUsuarioRow = {
  id: string
  idProducto: number
  producto: string
  serie: string
  chipId: string
  cantidad: number
  existe: string
}

type SaldoPreviewRow = {
  idProducto: number
  producto: string
  disponible: number
  registrado: number
  saldo: number
}

type ProductMeta = {
  id: string
  label: string
  digitosImei: number
  digitosChipId: number
  mascaraSerie: string
  mascaraChipId: string
  esSerializado: boolean
  seriePermiteEspacios: boolean
  chipPermiteEspacios: boolean
  permiteDecimales: boolean
}

const RETIRED_MATERIAL_IDS = new Set([2, 5])
const CONTROL_REMOTO_PRODUCT_ID = 11
const PILAS_PRODUCT_ID = 12

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const readValue = (row: UnknownRecord, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of Object.entries(row)) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readString = (row: UnknownRecord, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const isTorSipValue = (value: string): boolean => value.trim().toUpperCase() === 'SIP'

const readNumber = (row: UnknownRecord, keys: string[]): number | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const readRutaId = (row: UnknownRecord | null): number | null => {
  if (!row) return null
  return readNumber(row, ['idRuta', 'IdRuta', 'Id_Ruta', 'id_ruta', 'idruta', 'Idruta', 'idGrupo', 'IdGrupo', 'Id_Grupo', 'id_grupo'])
}

const readBoolean = (row: UnknownRecord, keys: string[]): boolean | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 'sí', 's', 'yes'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return null
}

const mapOptions = (
  items: CatalogItem[],
  idKeys: string[],
  labelKeys: string[]
): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const toIsoDateParam = (value?: string): string => {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  const year = String(parsed.getFullYear())
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const splitSerialLastFour = (value: string): { prefix: string; suffix: string } => {
  const text = String(value ?? '')
  if (text.length <= 4) return { prefix: '', suffix: text }
  return { prefix: text.slice(0, -4), suffix: text.slice(-4) }
}
const isRetiredMaterialRow = (row: Pick<MaterialRow, 'idTipoMaterial' | 'tipoMaterialLabel'>): boolean => {
  if (RETIRED_MATERIAL_IDS.has(row.idTipoMaterial)) return true
  const normalizedLabel = String(row.tipoMaterialLabel ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalizedLabel.includes('retirad')
}

const normalizeTipoMaterialForKit = (idTipoMaterial: number): number => {
  return idTipoMaterial === 5 ? 2 : idTipoMaterial
}

const matchesTipoMaterialForKit = (rowTipoMaterialId: number, targetTipoMaterialId: number): boolean => {
  if (targetTipoMaterialId === 2 || targetTipoMaterialId === 5) {
    return rowTipoMaterialId === 2 || rowTipoMaterialId === 5
  }
  return rowTipoMaterialId === targetTipoMaterialId
}

const buildFallbackMask = (digits: number): string => {
  if (!Number.isFinite(digits) || digits <= 0) return ''
  return '0'.repeat(digits)
}

const isMaskToken = (char: string): boolean => ['0', '9', '#', 'A', 'a', 'L', '?', '&', 'C'].includes(char)

const isValidMaskChar = (maskChar: string, valueChar: string): boolean => {
  if (['0', '9', '#'].includes(maskChar)) return /\d/.test(valueChar)
  if (['A', 'a', 'L', '?'].includes(maskChar)) return /[a-z]/i.test(valueChar)
  if (['&', 'C'].includes(maskChar)) return /[a-z0-9]/i.test(valueChar)
  return true
}

const normalizeMaskChar = (maskChar: string, valueChar: string): string => {
  if (['A', 'a', 'L', '?', '&', 'C'].includes(maskChar)) return valueChar.toUpperCase()
  return valueChar
}

const applyMask = (rawValue: string, mask: string): string => {
  if (!mask) return rawValue

  const source = rawValue.replace(/\s+/g, '').toUpperCase()
  let masked = ''
  let sourceIndex = 0

  for (let i = 0; i < mask.length; i += 1) {
    const maskChar = mask[i]
    if (!isMaskToken(maskChar)) {
      if (sourceIndex >= source.length) break
      masked += maskChar
      continue
    }

    while (sourceIndex < source.length) {
      const candidate = source[sourceIndex]
      sourceIndex += 1
      if (!isValidMaskChar(maskChar, candidate)) continue
      masked += normalizeMaskChar(maskChar, candidate)
      break
    }

    if (masked.length < i + 1) break
  }

  return masked
}

const countMaskTokens = (mask: string): number => Array.from(mask).filter((char) => isMaskToken(char)).length

const countFilledMaskChars = (value: string): number => value.replace(/[^a-z0-9]/gi, '').length

const isMaskComplete = (value: string, mask: string): boolean => {
  const normalizedValue = value.trim().toUpperCase()
  if (!mask) return false
  const formatted = applyMask(normalizedValue, mask)
  return formatted === normalizedValue && formatted.length === mask.length
}

const isNumericMask = (mask: string): boolean => {
  if (!mask) return false
  const chars = Array.from(mask)
  return chars.some((char) => isMaskToken(char)) && chars.every((char) => !isMaskToken(char) || ['0', '9', '#'].includes(char))
}

const parseSaldoValue = (row: UnknownRecord): number | null => {
  const keys = ['SaldoDia', 'SaldoDiaHoy', 'Sobrante', 'Cantidad', 'Saldo', 'Existencia', 'Disponible', 'saldo', 'cantidad']
  return readNumber(row, keys)
}

const parseSaldoProductoId = (row: UnknownRecord): number | null => {
  const keys = ['Id_Producto', 'idProducto', 'id_producto', 'productoId', 'ProductoId', 'id', 'Id']
  return readNumber(row, keys)
}

const readBackendErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback
  const status = error.response?.status
  const payload = error.response?.data
  if (!payload || typeof payload !== 'object') {
    if (typeof payload === 'string' && payload.trim()) {
      return status ? `HTTP ${status}: ${payload.trim()}` : payload.trim()
    }
    return fallback
  }

  const record = payload as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code.trim() : ''
  const message = typeof record.message === 'string' && record.message.trim()
    ? String(record.message).trim()
    : fallback

  const detailsRaw = record.details
  const details = detailsRaw && typeof detailsRaw === 'object' ? (detailsRaw as Record<string, unknown>) : null

  const detailPieces: string[] = []
  if (details) {
    const keysPriority = [
      'rootCause',
      'primaryCause',
      'fallbackCause',
      'exception',
      'storedProcedure',
      'fecha',
      'nroOT',
      'numeroCliente',
      'idRuta',
      'idVenta',
    ]
    for (const key of keysPriority) {
      const rawValue = details[key]
      if (rawValue === undefined || rawValue === null) continue
      const text = String(rawValue).trim()
      if (!text) continue
      detailPieces.push(`${key}: ${text}`)
    }

    if (detailPieces.length === 0) {
      for (const [key, rawValue] of Object.entries(details)) {
        if (rawValue === undefined || rawValue === null) continue
        const text = String(rawValue).trim()
        if (!text) continue
        detailPieces.push(`${key}: ${text}`)
        if (detailPieces.length >= 5) break
      }
    }
  }

  const headerParts: string[] = []
  if (status) headerParts.push(`HTTP ${status}`)
  if (code) headerParts.push(code)
  const header = headerParts.length > 0 ? `[${headerParts.join(' | ')}] ` : ''

  if (detailPieces.length === 0) {
    return `${header}${message}`.trim()
  }
  return `${header}${message}\n${detailPieces.join('\n')}`.trim()
}

const normalizeObservacion = (value?: string): string => {
  if (typeof value !== 'string') return 'SIN OBSERVACION'
  const trimmed = value.trim()
  if (!trimmed || trimmed === '""' || trimmed === "''") return 'SIN OBSERVACION'
  return trimmed
}

const formatSaldoAmount = (value: number): string => {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

const buildMaterialSaveSummary = (rows: MaterialRow[]): { total: number; lines: string[] } => {
  const summaryByKey = new Map<string, { producto: string; tipo: string; cantidad: number }>()
  let total = 0
  for (const row of rows) {
    const qty = Number.isFinite(row.cantidad) ? row.cantidad : 0
    total += qty
    const key = `${row.producto}__${row.tipoMaterialLabel}`
    const current = summaryByKey.get(key)
    if (current) {
      current.cantidad += qty
    } else {
      summaryByKey.set(key, {
        producto: row.producto || `Producto ${row.idProducto}`,
        tipo: row.tipoMaterialLabel || 'Sin tipo',
        cantidad: qty,
      })
    }
  }

  const normalizeTipo = (tipo: string): 'instalado' | 'retirado' | 'otro' => {
    const normalized = (tipo || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
    if (normalized.includes('instalad')) return 'instalado'
    if (normalized.includes('retirad')) return 'retirado'
    return 'otro'
  }

  const items = Array.from(summaryByKey.values())
  const installedItems = items.filter((item) => normalizeTipo(item.tipo) === 'instalado')
  const retiredItems = items.filter((item) => normalizeTipo(item.tipo) === 'retirado')
  const otherItems = items.filter((item) => normalizeTipo(item.tipo) === 'otro')

  const totalInstalled = installedItems.reduce((acc, item) => acc + item.cantidad, 0)
  const totalRetired = retiredItems.reduce((acc, item) => acc + item.cantidad, 0)
  const totalOther = otherItems.reduce((acc, item) => acc + item.cantidad, 0)

  const lines: string[] = []
  if (installedItems.length > 0) {
    lines.push(`Total Instalados: ${formatSaldoAmount(totalInstalled)}`)
    lines.push(...installedItems.map((item) => `${item.producto} - ${formatSaldoAmount(item.cantidad)}`))
  }
  if (retiredItems.length > 0) {
    lines.push(`Total Retirado: ${formatSaldoAmount(totalRetired)}`)
    lines.push(...retiredItems.map((item) => `${item.producto} - ${formatSaldoAmount(item.cantidad)}`))
  }
  if (otherItems.length > 0) {
    lines.push(`Total Otros: ${formatSaldoAmount(totalOther)}`)
    lines.push(...otherItems.map((item) => `${item.producto} - ${formatSaldoAmount(item.cantidad)} (${item.tipo})`))
  }

  return { total, lines }
}

const productMaskIdKeys = ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id', 'productoId']
const productMaskSerieKeys = ['mascaraSerie', 'MascaraSerie', 'maskSerie', 'MaskSerie', 'mascara', 'Mascara', 'formatoSerie', 'FormatoSerie', 'formato', 'Formato']
const productMaskChipKeys = [
  'mascaraChipId',
  'MascaraChipId',
  'mascaraChipID',
  'MascaraChipID',
  'maskChipId',
  'MaskChipId',
  'chipMascara',
  'ChipMascara',
  'formatoChip',
  'FormatoChip',
  'chipFormato',
  'ChipFormato',
]
const productMaskImeiDigitKeys = [
  'digitosImei',
  'DigitosImei',
  'DigitosIMEI',
  'digitos_imei',
  'cantidadDigitosImei',
  'cantidad_digitos_imei',
  'CantDigitosSerial',
  'cantDigitosSerial',
  'CantidadDigitosSerial',
  'cantidadDigitosSerial',
  'DigitosSerial',
  'digitosSerial',
  'serieLength',
  'SerieLength',
  'longitudSerie',
  'LongitudSerie',
  'cantidadCaracteresSerie',
]
const productMaskChipDigitKeys = [
  'digitosChipId',
  'DigitosChipId',
  'DigitosChipID',
  'DigitosChipid',
  'digitos_chipid',
  'cantidadDigitosChipId',
  'cantidad_digitos_chipid',
  'CantDigitosChipId',
  'CantDigitosChipID',
  'cantDigitosChipId',
  'cantDigitosChipID',
  'cantidadDigitosChipID',
  'chipLength',
  'ChipLength',
  'longitudChip',
  'LongitudChip',
]
const productSerieSpaceKeys = ['serieTieneEspacio', 'SerieTieneEspacio', 'TieneEspacioSerial', 'tieneEspacioSerial']
const productChipSpaceKeys = [
  'chipIdTieneEspacio',
  'ChipIdTieneEspacio',
  'ChipIDTieneEspacio',
  'TieneEspacioChipId',
  'TieneEspacioChipID',
  'tieneEspacioChipId',
]
const productAllowsDecimalKeys = ['permiteDecimales', 'PermiteDecimales', 'PermiteDecimal', 'permiteDecimal', 'PermiteDecimale']
const OT_DASHBOARD_FORCE_REFRESH_KEY = 'ot-dashboard-force-refresh'

const normalizeValidationMessage = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const shouldAllowRetiredValidationFailure = (observacion?: string): boolean => {
  const normalized = normalizeValidationMessage(observacion ?? '')
  if (!normalized) return false
  return (
    normalized.includes('no existen en saldo') ||
    normalized.includes('no existe en saldo') ||
    normalized.includes('no existe') ||
    normalized.includes('verificar chipid') ||
    normalized.includes('registrado mas de 1 vez')
  )
}

const readValidationMessageFromError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return ''
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const direct = (data as { message?: unknown; Message?: unknown }).message ?? (data as { Message?: unknown }).Message
    if (typeof direct === 'string') return direct
    const details = (data as { details?: unknown }).details
    if (typeof details === 'string') return details
    if (details && typeof details === 'object') {
      const description = (details as { description?: unknown }).description
      if (typeof description === 'string') return description
    }
  }
  return ''
}

const extractSerieFromMessage = (message: string): string | undefined => {
  const trimmed = message.trim()
  if (!trimmed) return undefined
  const matchBeforeDash = trimmed.match(/^([A-Za-z0-9-]{4,})\s*-/)
  if (matchBeforeDash?.[1]) return matchBeforeDash[1]
  const matchNamedSerie = trimmed.match(/serie\s*:?\s*([A-Za-z0-9-]{4,})/i)
  if (matchNamedSerie?.[1]) return matchNamedSerie[1]
  return undefined
}

const extractChipFromMessage = (message: string): string | undefined => {
  const trimmed = message.trim()
  if (!trimmed) return undefined
  const matchNamedChip = trimmed.match(/chip\s*id\s*:?\s*([A-Za-z0-9-]{4,})/i)
  if (matchNamedChip?.[1]) return matchNamedChip[1]
  return undefined
}

const tipoMaterialLabelByIdFallback: Record<number, string> = {
  1: 'Instalado',
  2: 'Retirado',
  3: 'Excedente',
  5: 'No entregado',
}

const tipoServicioIdKeys = ['idTipoServicio', 'Id_TipoServicio', 'id_tiposervicio', 'IdTipoServicio', 'id_tipo_servicio', 'id', 'Id']
const tipoServicioNomencladoresKeys = [
  'nomencladores',
  'Nomencladores',
  'usaNomencladores',
  'UsaNomencladores',
  'usarNomencladores',
  'UsarNomencladores',
]
const nomencladorSuffixKeys = ['SufijoNomenclador', 'sufijoNomenclador', 'sufijo_nomenclador', 'sufijo', 'Sufijo']
const nomencladorProductoIdKeys = ['Id_Producto', 'idProducto', 'id_producto', 'IdProducto', 'id', 'Id']
const nomencladorProductoLabelKeys = ['Nombre', 'nombre', 'Producto', 'producto', 'Descripcion', 'descripcion']
const reglaTipoKeys = ['tipoRegla', 'TipoRegla']
const reglaTipoServicioIdKeys = ['idTipoServicio', 'Id_TipoServicio', 'id_tiposervicio', 'IdTipoServicio']
const reglaTipoTecnologiaKeys = ['tipoTecnologia', 'TipoTecnologia']
const reglaSufijoKeys = ['sufijoNomenclador', 'SufijoNomenclador', 'sufijo', 'Sufijo']
const reglaProductoIdKeys = ['idProducto', 'Id_Producto', 'id_producto', 'IdProducto', 'id', 'Id']
const reglaCantidadKeys = ['cantidad', 'Cantidad']
const reglaTipoMaterialIdKeys = ['idTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'IdTipoMaterial']
const productoIdKeys = ['idProducto', 'Id_Producto', 'Id_Productos', 'id_producto', 'id_productos', 'IdProducto', 'id', 'Id']
const normalizeCatalogLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s]+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
const normalizeRuleType = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

const formatDurationMmSs = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const OtRealizadaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()
  const navState = (location.state as DetailNavState | null) ?? null
  const rowData = navState?.rowData ?? null
  const numeroOrden = (navState?.numeroOrden ?? '').trim()
  const isOrdenPasadaMaterial = (navState?.origenPendienteMaterial ?? '').trim().toUpperCase() === 'ORDEN_PASADA'
  const bootstrapIdSucursal = useMemo(() => {
    const parseSucursal = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
      if (typeof value === 'string') {
        const parsed = Number(value.trim())
        if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed)
      }
      return null
    }
    const rowSucursal = rowData ? readNumber(rowData, ['idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal']) : null
    const navSucursal = parseSucursal(navState?.idSucursal)
    const session = getSessionStorage()
    const candidates = [rowSucursal, navSucursal, parseSucursal(usuario?.idSucursal), parseSucursal(session?.idSucursal)]
    for (const value of candidates) {
      const parsed = parseSucursal(value)
      if (parsed !== null) return parsed
    }
    return null
  }, [navState?.idSucursal, rowData, usuario?.idSucursal])

  const [idEstado, setIdEstado] = useState('')
  const [activeTab, setActiveTab] = useState<'materiales' | 'cargo-usuario'>('materiales')
  const observacion = ''
  const [tipoMaterialId, setTipoMaterialId] = useState('')
  const [tipoMaterialEditEnabled, setTipoMaterialEditEnabled] = useState(false)
  const [productoId, setProductoId] = useState('')
  const [productoSearch, setProductoSearch] = useState('')
  const [productoSelectorOpen, setProductoSelectorOpen] = useState(false)
  const [serie, setSerie] = useState('')
  const [serieSuggestions, setSerieSuggestions] = useState<SerieSuggestionOption[]>([])
  const [serieSelectorOpen, setSerieSelectorOpen] = useState(false)
  const [serieSelectorSearch, setSerieSelectorSearch] = useState('')
  const [serieSelectorLoading, setSerieSelectorLoading] = useState(false)
  const [chipId, setChipId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [entregado, setEntregado] = useState(true)
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [successModalMessage, setSuccessModalMessage] = useState('')
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')
  const [serieValidationError, setSerieValidationError] = useState<string | null>(null)
  const [chipValidationError, setChipValidationError] = useState<string | null>(null)
  const [productoBloqueado, setProductoBloqueado] = useState(false)
  const [serieCamposBloqueados, setSerieCamposBloqueados] = useState(false)
  const [chipCamposBloqueados, setChipCamposBloqueados] = useState(false)
  const [allowManualChipId, setAllowManualChipId] = useState(false)
  const [chipFromDatabase, setChipFromDatabase] = useState(false)
  const [chipLockedAfterManualRetired, setChipLockedAfterManualRetired] = useState(false)
  const [chipUniquenessState, setChipUniquenessState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [cantidadBlurConfirmada, setCantidadBlurConfirmada] = useState(false)
  const [isPrevalidating, setIsPrevalidating] = useState(false)
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)
  const [isAddingCargoUsuario, setIsAddingCargoUsuario] = useState(false)
  const [detalleGuardado, setDetalleGuardado] = useState(false)
  const [cargoUsuarioRows, setCargoUsuarioRows] = useState<CargoUsuarioRow[]>([])
  const [cargoUsuarioProductoId, setCargoUsuarioProductoId] = useState('')
  const [cargoUsuarioProductoSearch, setCargoUsuarioProductoSearch] = useState('')
  const [cargoUsuarioProductoSelectorOpen, setCargoUsuarioProductoSelectorOpen] = useState(false)
  const [cargoUsuarioSerie, setCargoUsuarioSerie] = useState('')
  const [cargoUsuarioSerieSuggestions, setCargoUsuarioSerieSuggestions] = useState<string[]>([])
  const [cargoUsuarioChipId, setCargoUsuarioChipId] = useState('')
  const [cargoUsuarioCantidad, setCargoUsuarioCantidad] = useState('1')
  const [cargoUsuarioTieneSerie, setCargoUsuarioTieneSerie] = useState(true)
  const [cargoUsuarioTieneChipId, setCargoUsuarioTieneChipId] = useState(true)
  const [cargoUsuarioProductoBloqueado, setCargoUsuarioProductoBloqueado] = useState(false)
  const [cargoUsuarioSerieBloqueada, setCargoUsuarioSerieBloqueada] = useState(false)
  const [cargoUsuarioChipBloqueado, setCargoUsuarioChipBloqueado] = useState(false)
  const [cargoUsuarioGuardado, setCargoUsuarioGuardado] = useState(false)
  const formLocked = detalleGuardado || cargoUsuarioGuardado
  const [cargoUsuarioError, setCargoUsuarioError] = useState<string | null>(null)
  const [cargoUsuarioSuccess, setCargoUsuarioSuccess] = useState<string | null>(null)
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number | null>(() => getSessionRemainingMs())
  const [cargoUsuarioSerieError, setCargoUsuarioSerieError] = useState<string | null>(null)
  const [cargoUsuarioChipError, setCargoUsuarioChipError] = useState<string | null>(null)
  const [saldoPopup, setSaldoPopup] = useState<{
    kind: 'success' | 'warning' | 'error'
    title: string
    message: string
  } | null>(null)
  const tipoMaterialSelectRef = useRef<HTMLSelectElement | null>(null)
  const productoSelectRef = useRef<HTMLButtonElement | null>(null)
  const serieInputRef = useRef<HTMLInputElement | null>(null)
  const chipIdInputRef = useRef<HTMLInputElement | null>(null)
  const cantidadInputRef = useRef<HTMLInputElement | null>(null)
  const serieSelectorSearchRef = useRef<HTMLInputElement | null>(null)
  const cargoUsuarioProductoRef = useRef<HTMLButtonElement | null>(null)
  const cargoUsuarioSerieRef = useRef<HTMLInputElement | null>(null)
  const cargoUsuarioChipRef = useRef<HTMLInputElement | null>(null)
  const cargoUsuarioCantidadRef = useRef<HTMLInputElement | null>(null)
  const cargoUsuarioChipAutoRef = useRef(false)
  const cargoUsuarioAddingRef = useRef(false)
  const skipMaterialBlurValidationRef = useRef(false)
  const retiredRowsWithoutSaldoPairRef = useRef<Set<string>>(new Set())
  const lastValidatedSerieRef = useRef<{ key: string; sePuede: boolean } | null>(null)
  const autoAdvanceToChipRef = useRef(false)
  const saldoPopupTimeoutRef = useRef<number | null>(null)
  const nomencladoresAutocargaRef = useRef(false)
  const navIdVenta = useMemo(() => {
    const raw = (navState?.idVenta ?? '').trim()
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return Math.trunc(parsed)
  }, [navState?.idVenta])
  const navIdRuta = useMemo(() => {
    const raw = (navState?.idRuta ?? '').trim()
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return Math.trunc(parsed)
  }, [navState?.idRuta])

  const ventaQuery = useQuery({
    queryKey: ['ot-detalle-venta', numeroOrden, navIdVenta ?? 0, bootstrapIdSucursal ?? 0],
    enabled: Boolean(numeroOrden),
    queryFn: async () => {
      if (navIdVenta && navIdVenta > 0) {
        try {
          const registro = await fetchOtRegistroCompleto(navIdVenta, bootstrapIdSucursal ?? undefined)
          if (registro.cabecera) {
            return registro.cabecera
          }
        } catch {
          // Fallback: si falla por id_venta, continuar por numero OT.
        }
      }
      return fetchOtByNumero(numeroOrden, bootstrapIdSucursal ?? undefined)
    },
  })

  const venta = ventaQuery.data ?? null
  const idRuta = useMemo(
    () =>
      navIdRuta ??
      readRutaId(venta) ??
      readRutaId(rowData),
    [navIdRuta, rowData, venta]
  )
  const idVendedor = useMemo(
    () =>
      (venta ? readNumber(venta, ['idVendedor', 'Id_Vendedor', 'id_vendedor', 'idTecnico', 'Id_Tecnico']) : null) ??
      (rowData ? readNumber(rowData, ['idVendedor', 'Id_Vendedor', 'id_vendedor', 'idTecnico', 'Id_Tecnico']) : null) ??
      null,
    [rowData, venta]
  )
  const idRutaValidacion = useMemo(() => {
    if (idRuta && idRuta > 0) return idRuta
    return null
  }, [idRuta])
  const rutasQuery = useQuery({
    queryKey: ['catalogos-rutas-ot-detalle', idVendedor ?? null, usuario?.idUsuario ?? null],
    queryFn: () => fetchRutas((idVendedor ?? (usuario?.idUsuario ?? undefined)) as number | undefined),
    enabled: Boolean((idVendedor && idVendedor > 0) || (usuario?.idUsuario && usuario.idUsuario > 0)),
  })
  const idRutaProductos = useMemo(() => {
    if (idRutaValidacion && idRutaValidacion > 0) return idRutaValidacion
    for (const row of rutasQuery.data ?? []) {
      const rutaId = readNumber(row, ['idRuta', 'Id_Ruta', 'id_ruta', 'id', 'Id'])
      if (rutaId && rutaId > 0) return rutaId
    }
    return null
  }, [idRutaValidacion, rutasQuery.data])
  const routeCandidatesForProducts = useMemo(() => {
    const seen = new Set<number>()
    const list: number[] = []
    const push = (value: number | null) => {
      if (!value || !Number.isFinite(value) || value <= 0) return
      const normalized = Math.trunc(value)
      if (seen.has(normalized)) return
      seen.add(normalized)
      list.push(normalized)
    }
    push(idRutaProductos)
    for (const row of rutasQuery.data ?? []) {
      push(readNumber(row, ['idRuta', 'Id_Ruta', 'id_ruta', 'id', 'Id']))
    }
    return list
  }, [idRutaProductos, rutasQuery.data])
  const installedRouteCandidates = useMemo(() => {
    const seen = new Set<number>()
    const list: number[] = []
    const push = (value: number | null) => {
      if (!value || !Number.isFinite(value) || value <= 0) return
      const normalized = Math.trunc(value)
      if (seen.has(normalized)) return
      seen.add(normalized)
      list.push(normalized)
    }
    push(navIdRuta)
    push(readRutaId(venta))
    push(readRutaId(rowData))
    push(idRutaValidacion)
    if (list.length === 0) {
      const rutasDisponibles = (rutasQuery.data ?? [])
        .map((row) => readNumber(row, ['idRuta', 'Id_Ruta', 'id_ruta', 'idruta', 'id', 'Id']))
        .filter((value): value is number => Boolean(value && Number.isFinite(value) && value > 0))
      const rutasUnicas = Array.from(new Set(rutasDisponibles.map((value) => Math.trunc(value))))
      if (rutasUnicas.length === 1) {
        push(rutasUnicas[0])
      }
    }
    return list
  }, [idRutaValidacion, navIdRuta, rowData, rutasQuery.data, venta])
  const fechaTrabajo = useMemo(() => {
    const fromState = navState?.fecha ?? ''
    const fromVenta = venta ? readString(venta, ['fechaEjecucion', 'Fecha_Ejecucion', 'fecha_ejecucion', 'FechaEjecucion']) : ''
    // Priorizar la fecha enviada desde la tarjeta seleccionada (OT del dia).
    return toIsoDateParam(fromState || fromVenta)
  }, [navState?.fecha, venta])
  const fechaAgenda = useMemo(() => {
    const rows = [venta, rowData].filter(Boolean) as UnknownRecord[]
    for (const row of rows) {
      const value = readString(row, [
        'inicio_agendado',
        'Inicio_Agendado',
        'InicioAgendado',
        'fechaAgenda',
        'FechaAgenda',
        'Fecha_Agenda',
        'fecha_agenda',
        'fecha',
        'Fecha',
        'Fecha_Ejecucion',
        'fecha_ejecucion',
      ]).trim()
      if (value) return value
    }
    return ''
  }, [rowData, venta])
  const fechaHoy = useMemo(() => todayISO(), [])
  const registroFechaBloqueado = useMemo(() => {
    if (isOrdenPasadaMaterial) return false
    if (!fechaTrabajo) return true
    return fechaTrabajo !== fechaHoy
  }, [fechaHoy, fechaTrabajo, isOrdenPasadaMaterial])
  useEffect(() => {
    const refresh = () => setSessionRemainingMs(getSessionRemainingMs())
    refresh()
    const intervalId = window.setInterval(refresh, 1000)
    return () => window.clearInterval(intervalId)
  }, [])
  const sessionIdSucursal = useMemo(() => {
    const session = getSessionStorage()
    const parseSucursal = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.trunc(value)
      }
      if (typeof value === 'string') {
        const parsed = Number(value.trim())
        if (Number.isFinite(parsed) && parsed > 0) {
          return Math.trunc(parsed)
        }
      }
      return null
    }
    const ventaSucursal = venta ? readNumber(venta, ['idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal']) : null
    const rowSucursal = rowData ? readNumber(rowData, ['idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal']) : null
    const navSucursal = parseSucursal(navState?.idSucursal)
    // Priorizar la sucursal real de la OT cargada para evitar usar una sesion previa
    // de otra sucursal (caso observado: request saliendo con idSucursal incorrecto).
    const candidates = [ventaSucursal, rowSucursal, navSucursal, parseSucursal(usuario?.idSucursal), parseSucursal(session?.idSucursal)]
    for (const value of candidates) {
      const parsed = parseSucursal(value)
      if (parsed !== null) return parsed
    }
    return null
  }, [navState?.idSucursal, rowData, usuario?.idSucursal, venta])
  const resolvedIdSucursal = useMemo(() => {
    const candidates = [sessionIdSucursal, bootstrapIdSucursal]
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
    }
    return null
  }, [bootstrapIdSucursal, sessionIdSucursal])
  const clienteVisible = useMemo(() => {
    if (venta) {
      const value = readNumber(venta, ['codigoCliente', 'CodigoCliente', 'clienteNro', 'Cliente_Nro'])
      if (value !== null) return String(value)
    }
    return (navState?.clienteNro ?? '').trim()
  }, [navState?.clienteNro, venta])
  const idVentaActual = useMemo(() => {
    if (venta) {
      const fromVenta = readNumber(venta, ['idVenta', 'IdVenta', 'Id_Venta', 'id_venta', 'id', 'Id'])
      if (fromVenta && Number.isFinite(fromVenta) && fromVenta > 0) {
        return Math.trunc(fromVenta)
      }
    }
    if (navIdVenta && Number.isFinite(navIdVenta) && navIdVenta > 0) {
      return Math.trunc(navIdVenta)
    }
    return undefined
  }, [navIdVenta, venta])
  const tipoServicioId = useMemo(() => {
    const fromRow = rowData ? readNumber(rowData, ['idTipoServicio', 'Id_TipoServicio', 'id_tiposervicio', 'id_tipo_servicio']) : null
    if (fromRow !== null && fromRow > 0) return fromRow
    const fromVenta = venta ? readNumber(venta, ['idTipoServicio', 'Id_TipoServicio', 'id_tiposervicio']) : null
    if (fromVenta !== null && fromVenta > 0) return fromVenta
    const fromNavRaw = (navState?.idTipoServicio ?? '').trim()
    if (fromNavRaw) {
      const fromNav = Number(fromNavRaw)
      if (Number.isFinite(fromNav) && fromNav > 0) return fromNav
    }
    return null
  }, [navState?.idTipoServicio, rowData, venta])
  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio-ot-detalle'],
    queryFn: fetchTiposServicio,
  })
  const effectiveTor = useMemo(() => {
    const directValues = [
      navState?.tor ?? '',
      rowData ? readString(rowData, ['tor', 'TOR', 'prefijo', 'Prefijo']) : '',
      venta ? readString(venta, ['tor', 'TOR', 'prefijo', 'Prefijo']) : '',
    ]
    const direct = directValues.map((value) => value.trim().toUpperCase()).find(Boolean)
    if (direct) return direct
    if (!tipoServicioId || tipoServicioId <= 0) return ''
    const selected = (tiposServicioQuery.data ?? []).find((item) => {
      const id = readNumber(item, tipoServicioIdKeys)
      return id !== null && id === tipoServicioId
    })
    return readString(selected ?? {}, ['prefijo', 'Prefijo', 'tor', 'TOR', 'codigo', 'Codigo']).trim().toUpperCase()
  }, [navState?.tor, rowData, tipoServicioId, tiposServicioQuery.data, venta])
  const isTorSip = isTorSipValue(effectiveTor)
  const tipoServicioUsaNomencladores = useMemo(() => {
    if (isTorSip) return false
    if (!tipoServicioId || tipoServicioId <= 0) return false
    const row = (tiposServicioQuery.data ?? []).find((item) => {
      const id = readNumber(item, tipoServicioIdKeys)
      return id !== null && id === tipoServicioId
    })
    if (!row) return false
    return readBoolean(row, tipoServicioNomencladoresKeys) === true
  }, [isTorSip, tipoServicioId, tiposServicioQuery.data])
  const tipoTecnologiaActual = useMemo(() => {
    const fromVenta = venta ? readString(venta, ['tipoTecnologia', 'TipoTecnologia']).trim() : ''
    if (fromVenta) return fromVenta
    const fromRow = rowData ? readString(rowData, ['tipoTecnologia', 'TipoTecnologia']).trim() : ''
    return fromRow
  }, [rowData, venta])
  const nomencladoresQuery = useQuery({
    queryKey: ['catalogos-nomencladores-ot-detalle'],
    queryFn: fetchNomencladores,
    enabled: tipoServicioUsaNomencladores,
  })
  const materialesAutocargaQuery = useQuery({
    queryKey: ['catalogos-materiales-autocarga-ot-detalle'],
    queryFn: fetchMaterialesAutocarga,
    enabled: tipoServicioUsaNomencladores,
  })
  const kitsDecodificadoresQuery = useQuery({
    queryKey: ['catalogos-kits-decodificadores-ot-detalle'],
    queryFn: fetchKitsDecodificadores,
  })

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-ot-detalle'],
    queryFn: fetchEstados,
  })
  const tipoMaterialParam = useMemo(() => {
    if (!tipoServicioId || tipoServicioId <= 0) return null
    return tipoServicioId
  }, [tipoServicioId])
  const tipoMaterialQuery = useQuery({
    queryKey: ['catalogos-tipo-material-ot-detalle', tipoMaterialParam],
    queryFn: () => fetchTipoMaterial(tipoMaterialParam as number),
    enabled: Boolean(tipoMaterialParam && tipoMaterialParam > 0),
  })
  const tipoMaterialOptions = useMemo(() => {
    return mapOptions(
      tipoMaterialQuery.data ?? [],
      ['idTipoMaterial', 'IdTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'id', 'Id'],
      ['tipoMaterial', 'TipoMaterial', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
    )
  }, [tipoMaterialQuery.data])
  const defaultTipoMaterialValue = useMemo(() => {
    if (tipoMaterialOptions.length === 0) return ''
    if (tipoMaterialOptions.length === 1) return tipoMaterialOptions[0]?.value ?? ''
    const installed = tipoMaterialOptions.find((option) =>
      option.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes('instalad')
    )
    return installed?.value ?? tipoMaterialOptions[0]?.value ?? ''
  }, [tipoMaterialOptions])
  const tipoMaterialEditAvailable = tipoMaterialOptions.length > 0

  useEffect(() => {
    if (!defaultTipoMaterialValue) return
    if (tipoMaterialOptions.length === 1) {
      if (tipoMaterialId !== defaultTipoMaterialValue) {
        setTipoMaterialId(defaultTipoMaterialValue)
      }
      return
    }
    if (tipoMaterialId) return
    setTipoMaterialId(defaultTipoMaterialValue)
  }, [defaultTipoMaterialValue, tipoMaterialId, tipoMaterialOptions.length])
  useEffect(() => {
    if (!tipoMaterialParam || tipoMaterialParam <= 0) return
    if (tipoMaterialQuery.isLoading) return
    if (tipoMaterialQuery.isError) return
    if ((tipoMaterialQuery.data ?? []).length > 0) return
    setError(`No se encontro Tipo Material para tipomaterial=${tipoMaterialParam}.`)
  }, [tipoMaterialParam, tipoMaterialQuery.data, tipoMaterialQuery.isError, tipoMaterialQuery.isLoading])
  useEffect(() => {
    if (defaultTipoMaterialValue) return
    if (tipoMaterialQuery.isLoading) return
    if ((tipoMaterialQuery.data ?? []).length > 0) return
    if (tipoMaterialId) return
    const fromRows = materialRows.find((row) => Number.isFinite(row.idTipoMaterial) && row.idTipoMaterial > 0)
    if (!fromRows) return
    setTipoMaterialId(String(fromRows.idTipoMaterial))
  }, [defaultTipoMaterialValue, materialRows, tipoMaterialId, tipoMaterialQuery.data, tipoMaterialQuery.isLoading])
  useEffect(() => {
    if (nomencladoresAutocargaRef.current) return
    if (!ventaQuery.isFetched || ventaQuery.isLoading) return
    if (tiposServicioQuery.isLoading) return
    if (!tipoServicioUsaNomencladores) {
      nomencladoresAutocargaRef.current = true
      return
    }
    if (nomencladoresQuery.isLoading) return
    if (materialesAutocargaQuery.isLoading) return

    const codigoCliente = clienteVisible.replace(/\D/g, '')
    if (!codigoCliente) {
      nomencladoresAutocargaRef.current = true
      return
    }
    if (!idRutaValidacion || idRutaValidacion <= 0) return
    if (!fechaTrabajo) return

    const tipoMaterialAutoValue = tipoMaterialId || defaultTipoMaterialValue
    const tipoMaterialAutoId = Number(tipoMaterialAutoValue)
    if (!Number.isFinite(tipoMaterialAutoId) || tipoMaterialAutoId <= 0) {
      setError('No se pudo resolver el Tipo Material para autocargar materiales. Selecciona el tipo manualmente.')
      nomencladoresAutocargaRef.current = true
      return
    }
    const tipoMaterialAutoLabel = tipoMaterialOptions.find((option) => option.value === tipoMaterialAutoValue)?.label ?? tipoMaterialAutoValue

    const nomencladoresRows = nomencladoresQuery.data ?? []

    const counts = new Map<string, number>()
    for (const char of codigoCliente) {
      counts.set(char, (counts.get(char) ?? 0) + 1)
    }

    const productBySuffix = new Map<string, { idProducto: number; producto: string }>()
    const productLabelById = new Map<number, string>()
    for (const row of nomencladoresRows) {
      const suffix = readString(row, nomencladorSuffixKeys).trim()
      const idProducto = readNumber(row, nomencladorProductoIdKeys)
      if (idProducto === null || idProducto <= 0) continue
      const producto = readString(row, nomencladorProductoLabelKeys).trim() || String(idProducto)
      if (!productLabelById.has(idProducto)) {
        productLabelById.set(idProducto, producto)
      }
      if (suffix && !productBySuffix.has(suffix)) {
        productBySuffix.set(suffix, { idProducto, producto })
      }
    }

    const generatedRows: MaterialRow[] = []
    const reglasAutocargaRows = (materialesAutocargaQuery.data ?? []) as UnknownRecord[]
    const tipoTecnologiaNormalizada = normalizeCatalogLabel(tipoTecnologiaActual)
    let hasNomencladorRuleConfigured = false

    for (const row of reglasAutocargaRows) {
      const idProducto = readNumber(row, reglaProductoIdKeys)
      if (idProducto === null || idProducto <= 0) continue

      const idTipoServicioRegla = readNumber(row, reglaTipoServicioIdKeys)
      if (idTipoServicioRegla !== null && idTipoServicioRegla > 0 && idTipoServicioRegla !== tipoServicioId) continue

      const tipoTecnologiaRegla = readString(row, reglaTipoTecnologiaKeys).trim()
      if (tipoTecnologiaRegla) {
        const reglaTecnologiaNormalizada = normalizeCatalogLabel(tipoTecnologiaRegla)
        if (tipoTecnologiaNormalizada && reglaTecnologiaNormalizada !== tipoTecnologiaNormalizada) continue
      }

      const tipoRegla = normalizeRuleType(readString(row, reglaTipoKeys))
      const cantidadBase = readNumber(row, reglaCantidadKeys) ?? 1
      if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) continue

      let cantidadGenerada = 0
      if (tipoRegla.includes('NOMEN')) {
        const sufijo = readString(row, reglaSufijoKeys).trim()
        if (!sufijo) continue
        hasNomencladorRuleConfigured = true
        const count = counts.get(sufijo) ?? 0
        cantidadGenerada = count * cantidadBase
      } else if (tipoRegla.includes('FIJO')) {
        cantidadGenerada = cantidadBase
      } else {
        continue
      }
      if (cantidadGenerada <= 0) continue

      const labelRegla = readString(row, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
      const producto = labelRegla || productLabelById.get(idProducto) || String(idProducto)
      const idTipoMaterialRegla = readNumber(row, reglaTipoMaterialIdKeys)
      const idTipoMaterialResuelto =
        idTipoMaterialRegla !== null && idTipoMaterialRegla > 0 ? idTipoMaterialRegla : tipoMaterialAutoId
      const tipoMaterialResueltoValue = String(idTipoMaterialResuelto)
      const tipoMaterialResueltoLabel =
        tipoMaterialOptions.find((option) => option.value === tipoMaterialResueltoValue)?.label ??
        tipoMaterialLabelByIdFallback[idTipoMaterialResuelto] ??
        tipoMaterialAutoLabel
      const esRetiradoAutocarga = RETIRED_MATERIAL_IDS.has(idTipoMaterialResuelto)

      generatedRows.push({
        id: `auto-${idProducto}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        idProducto,
        producto,
        serie: '',
        chipId: '',
        cantidad: cantidadGenerada,
        idTipoMaterial: idTipoMaterialResuelto,
        tipoMaterialLabel: tipoMaterialResueltoLabel,
        entregado: !esRetiradoAutocarga,
        requiresChip: false,
      })
    }

    // Compatibilidad: si no hay reglas NOMENCLADOR configuradas, usa nomencladores del SP legado.
    if (!hasNomencladorRuleConfigured) {
      for (const [suffix, cantidadGenerada] of counts.entries()) {
        const product = productBySuffix.get(suffix)
        if (!product || cantidadGenerada <= 0) continue
        generatedRows.push({
          id: `nomen-${suffix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          idProducto: product.idProducto,
          producto: product.producto,
          serie: '',
          chipId: '',
          cantidad: cantidadGenerada,
          idTipoMaterial: tipoMaterialAutoId,
          tipoMaterialLabel: tipoMaterialAutoLabel,
          entregado: !RETIRED_MATERIAL_IDS.has(tipoMaterialAutoId),
          requiresChip: false,
        })
      }
    }

    const generatedRowsFinal = Array.from(
      generatedRows.reduce<Map<string, MaterialRow>>((acc, row) => {
        const key = `${row.idProducto}|${row.idTipoMaterial}`
        const current = acc.get(key)
        if (current) {
          current.cantidad += row.cantidad
          return acc
        }
        acc.set(key, { ...row })
        return acc
      }, new Map())
        .values()
    )

    if (generatedRowsFinal.length > 0) {
      void (async () => {
        try {
          const productoNombrePorId = new Map<number, string>()
          try {
            const productosRuta = await fetchProductos(idRutaValidacion)
            ;(productosRuta as UnknownRecord[]).forEach((row) => {
              const id = readNumber(row, ['idProducto', 'Id_Producto', 'id_producto', 'IdProducto', 'id', 'Id'])
              const nombre = readString(row, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
              if (id !== null && id > 0 && nombre) {
                productoNombrePorId.set(id, nombre)
              }
            })
          } catch {
            // Si falla catalogo por ruta, continuar con etiquetas actuales.
          }

          const generatedRowsResolved = generatedRowsFinal.map((row) => {
            const etiquetaActual = String(row.producto ?? '').trim()
            const esCodigo = /^\d+$/.test(etiquetaActual)
            if (etiquetaActual && !esCodigo) {
              return row
            }
            const nombreCatalogo = productoNombrePorId.get(row.idProducto)
            if (!nombreCatalogo) {
              return row
            }
            return {
              ...row,
              producto: nombreCatalogo,
            }
          })

          const saldoRows = await fetchSaldoRuta({
            idRuta: idRutaValidacion,
            fecha: fechaTrabajo,
            idSucursal: resolvedIdSucursal ?? undefined,
          })
          const saldoMap = new Map<number, number>()
          saldoRows.forEach((row) => {
            const idProducto = parseSaldoProductoId(row)
            const saldoDisponible = parseSaldoValue(row)
            if (idProducto === null || saldoDisponible === null) return
            const current = saldoMap.get(idProducto) ?? 0
            saldoMap.set(idProducto, current + saldoDisponible)
          })

          const requestedByProduct = new Map<number, { producto: string; cantidad: number }>()
          generatedRowsResolved.forEach((row) => {
            const current = requestedByProduct.get(row.idProducto)
            if (current) {
              current.cantidad += row.cantidad
              return
            }
            requestedByProduct.set(row.idProducto, {
              producto: row.producto,
              cantidad: row.cantidad,
            })
          })

          const saldoEvaluado = Array.from(requestedByProduct.entries()).map(([idProducto, value]) => {
            const disponible = saldoMap.get(idProducto) ?? 0
            const saldo = disponible - value.cantidad
            return {
              idProducto,
              producto: value.producto,
              disponible,
              registrado: value.cantidad,
              saldo,
            }
          })
          const deficits = saldoEvaluado.filter((item) => item.saldo < 0)
          const permitidos = new Set(saldoEvaluado.filter((item) => item.saldo >= 0).map((item) => item.idProducto))
          const generatedRowsConSaldo = generatedRowsResolved.filter((row) => permitidos.has(row.idProducto))

          if (generatedRowsConSaldo.length === 0) {
            const detalle = deficits
              .map((item) => {
                const nombre = item.producto || 'Producto'
                return `${nombre}: disponible ${formatSaldoAmount(item.disponible)}, registrado ${formatSaldoAmount(item.registrado)}`
              })
              .join(' | ')
            setError(`No se agregaron nomencladores por saldo insuficiente. ${detalle}.`)
            return
          }

          if (deficits.length > 0) {
            const detalle = deficits
              .map((item) => {
                const nombre = item.producto || 'Producto'
                return `${nombre}: disponible ${formatSaldoAmount(item.disponible)}, registrado ${formatSaldoAmount(item.registrado)}`
              })
              .join(' | ')
            setError(`Se agregaron nomencladores con saldo disponible. Se omitieron: ${detalle}.`)
          } else {
            setError(null)
          }

          setMaterialRows((current) => (current.length > 0 ? current : generatedRowsConSaldo))
          if (!tipoMaterialId) {
            setTipoMaterialId(tipoMaterialAutoValue)
          }
        } catch (err) {
          setError(readBackendErrorMessage(err, 'No se pudo validar el saldo de la ruta antes de agregar nomencladores.'))
        } finally {
          nomencladoresAutocargaRef.current = true
        }
      })()
      return
    }
    nomencladoresAutocargaRef.current = true
  }, [
    clienteVisible,
    fechaTrabajo,
    idRutaValidacion,
    tipoMaterialId,
    tipoMaterialOptions,
    tipoServicioUsaNomencladores,
    tiposServicioQuery.isLoading,
    ventaQuery.isFetched,
    ventaQuery.isLoading,
    tipoServicioId,
    tipoTecnologiaActual,
    nomencladoresQuery.data,
    nomencladoresQuery.isLoading,
    materialesAutocargaQuery.data,
    materialesAutocargaQuery.isLoading,
    sessionIdSucursal,
  ])
  const selectedTipoMaterialLabel =
    tipoMaterialOptions.find((option) => option.value === tipoMaterialId)?.label?.toLowerCase() ?? ''
  const isInstalledType =
    selectedTipoMaterialLabel.includes('instalado') ||
    selectedTipoMaterialLabel.includes('instalada') ||
    selectedTipoMaterialLabel.includes('installed')
  const isRetiredType =
    selectedTipoMaterialLabel.includes('retirado') ||
    selectedTipoMaterialLabel.includes('no entregado') ||
    selectedTipoMaterialLabel.includes('noentregado')
  const shouldLoadProducts = Boolean(tipoMaterialId) && (isRetiredType || installedRouteCandidates.length > 0)
  const installedWithoutRoute = Boolean(tipoMaterialId) && !isRetiredType && installedRouteCandidates.length === 0
  const productosQuery = useQuery({
    queryKey: [
      'catalogos-productos-ot-detalle',
      idRutaProductos,
      tipoMaterialId,
      routeCandidatesForProducts.join(','),
      installedRouteCandidates.join(','),
    ],
    queryFn: async () => {
      if (isRetiredType) {
        const sinFungible = await fetchProductosSinFungible(idRutaProductos ?? undefined)
        if (sinFungible.length > 0) return sinFungible
        const cargoUsuario = await fetchProductosCargoUsuario()
        if (cargoUsuario.length > 0) return cargoUsuario
        return fetchProductos(idRutaProductos ?? 0)
      }
      // Regla funcional: Instalado debe cargarse solo desde TraerTodosLosProductos_x_IdRutaWeb.
      for (const rutaId of installedRouteCandidates) {
        const rows = await fetchProductos(rutaId)
        if (rows.length > 0) return rows
      }
      return []
    },
    enabled: shouldLoadProducts,
  })
  useEffect(() => {
    if (!installedWithoutRoute) return
    setError('No se pudo resolver la ruta de la OT para cargar productos instalados (TraerTodosLosProductos_x_IdRutaWeb).')
  }, [installedWithoutRoute])
  const cargoUsuarioProductosQuery = useQuery({
    queryKey: ['catalogos-productos-cargo-usuario'],
    queryFn: fetchProductosCargoUsuario,
  })
  const productosMascaraQuery = useQuery({
    queryKey: ['catalogos-productos-mascara'],
    queryFn: fetchProductosMascara,
  })

  const estadoOptions = useMemo(
    () =>
      mapOptions(
        estadosQuery.data ?? [],
        ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'],
        ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [estadosQuery.data]
  )
  const productoOptions = useMemo(
    () =>
      mapOptions(
        productosQuery.data ?? [],
        productoIdKeys,
        ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [productosQuery.data]
  )
  const filteredProductoOptions = useMemo(() => {
    const search = normalizeSearchText(productoSearch)
    if (!search) return productoOptions
    return productoOptions.filter((option) => normalizeSearchText(option.label).includes(search))
  }, [productoOptions, productoSearch])
  const kitDecodificadorProductoIds = useMemo(() => {
    const set = new Set<number>()
    for (const item of kitsDecodificadoresQuery.data ?? []) {
      const id = readNumber(item, productoIdKeys)
      if (id !== null && id > 0) {
        set.add(id)
      }
    }
    return set
  }, [kitsDecodificadoresQuery.data])
  const productoLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of productosQuery.data ?? []) {
      const id = readNumber(item, productoIdKeys)
      const label = readString(item, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
      if (id !== null && id > 0 && label) {
        map.set(id, label)
      }
    }
    for (const option of productoOptions) {
      const id = Number(option.value)
      if (Number.isFinite(id) && id > 0 && option.label.trim()) {
        map.set(id, option.label.trim())
      }
    }
    if (!map.has(CONTROL_REMOTO_PRODUCT_ID)) {
      map.set(CONTROL_REMOTO_PRODUCT_ID, 'CONTROL_REMOTO')
    }
    if (!map.has(PILAS_PRODUCT_ID)) {
      map.set(PILAS_PRODUCT_ID, 'PILAS')
    }
    return map
  }, [productoOptions, productosQuery.data])
  const cargoUsuarioProductoOptions = useMemo(
    () =>
      mapOptions(
        cargoUsuarioProductosQuery.data ?? [],
        ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'],
        ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [cargoUsuarioProductosQuery.data]
  )
  const filteredCargoUsuarioProductoOptions = useMemo(() => {
    const search = normalizeSearchText(cargoUsuarioProductoSearch)
    if (!search) return cargoUsuarioProductoOptions
    return cargoUsuarioProductoOptions.filter((option) => normalizeSearchText(option.label).includes(search))
  }, [cargoUsuarioProductoOptions, cargoUsuarioProductoSearch])
  const productoMascaraMap = useMemo(() => {
    const map = new Map<string, CatalogItem>()
    for (const item of productosMascaraQuery.data ?? []) {
      const idValue = readValue(item, productMaskIdKeys)
      if (idValue === undefined || idValue === null || idValue === '') continue
      map.set(String(idValue), item)
    }
    return map
  }, [productosMascaraQuery.data])
  const productMetas = useMemo<ProductMeta[]>(() => {
    return (productosQuery.data ?? [])
      .map((item) => {
        const id = readValue(item, ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'])
        if (id === undefined || id === null || id === '') return null

        const maskEntry = productoMascaraMap.get(String(id))
        const digitosImeiProduct = readNumber(item, productMaskImeiDigitKeys) ?? 0
        const digitosChipProduct = readNumber(item, productMaskChipDigitKeys) ?? 0
        const digitosImeiMask = maskEntry ? readNumber(maskEntry, productMaskImeiDigitKeys) : null
        const digitosChipMask = maskEntry ? readNumber(maskEntry, productMaskChipDigitKeys) : null
        const digitosImei = digitosImeiMask ?? digitosImeiProduct
        const digitosChipId = digitosChipMask ?? digitosChipProduct
        const mascaraSerieFromProduct = readString(item, productMaskSerieKeys)
        const mascaraSerieFromMask = maskEntry ? readString(maskEntry, productMaskSerieKeys) : ''
        const mascaraChipFromProduct = readString(item, productMaskChipKeys)
        const mascaraChipFromMask = maskEntry ? readString(maskEntry, productMaskChipKeys) : ''
        const mascaraSerie = mascaraSerieFromMask || mascaraSerieFromProduct || buildFallbackMask(digitosImei)
        const mascaraChipId = mascaraChipFromMask || mascaraChipFromProduct || buildFallbackMask(digitosChipId)
        const esSerializado =
          digitosImei > 0 ||
          readBoolean(item, ['esSerializado', 'EsSerializado', 'serializado', 'Serializado', 'tieneSerial', 'TieneSerial']) === true
        const seriePermiteEspacios = readBoolean(item, productSerieSpaceKeys) ?? false
        const chipPermiteEspacios = readBoolean(item, productChipSpaceKeys) ?? false
        const permiteDecimales = readBoolean(item, productAllowsDecimalKeys) ?? true

        return {
          id: String(id),
          label: readString(item, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']) || String(id),
          digitosImei,
          digitosChipId,
          mascaraSerie,
          mascaraChipId,
          esSerializado,
          seriePermiteEspacios,
          chipPermiteEspacios,
          permiteDecimales,
        }
      })
      .filter((item): item is ProductMeta => Boolean(item))
  }, [productosQuery.data, productoMascaraMap])
  const selectedProductMeta = useMemo(
    () => productMetas.find((item) => item.id === productoId) ?? null,
    [productMetas, productoId]
  )
  const cargoUsuarioProductoMetas = useMemo<ProductMeta[]>(() => {
    return (cargoUsuarioProductosQuery.data ?? [])
      .map((item) => {
        const id = readValue(item, ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'])
        if (id === undefined || id === null || id === '') return null

        const maskEntry = productoMascaraMap.get(String(id))
        const digitosImeiProduct = readNumber(item, productMaskImeiDigitKeys) ?? 0
        const digitosChipProduct = readNumber(item, productMaskChipDigitKeys) ?? 0
        const digitosImeiMask = maskEntry ? readNumber(maskEntry, productMaskImeiDigitKeys) : null
        const digitosChipMask = maskEntry ? readNumber(maskEntry, productMaskChipDigitKeys) : null
        const digitosImei = digitosImeiMask ?? digitosImeiProduct
        const digitosChipId = digitosChipMask ?? digitosChipProduct
        const mascaraSerieFromProduct = readString(item, productMaskSerieKeys)
        const mascaraSerieFromMask = maskEntry ? readString(maskEntry, productMaskSerieKeys) : ''
        const mascaraChipFromProduct = readString(item, productMaskChipKeys)
        const mascaraChipFromMask = maskEntry ? readString(maskEntry, productMaskChipKeys) : ''
        const mascaraSerie = mascaraSerieFromMask || mascaraSerieFromProduct || buildFallbackMask(digitosImei)
        const mascaraChipId = mascaraChipFromMask || mascaraChipFromProduct || buildFallbackMask(digitosChipId)
        const esSerializado =
          digitosImei > 0 ||
          readBoolean(item, ['esSerializado', 'EsSerializado', 'serializado', 'Serializado', 'tieneSerial', 'TieneSerial']) === true
        const seriePermiteEspacios = readBoolean(item, productSerieSpaceKeys) ?? false
        const chipPermiteEspacios = readBoolean(item, productChipSpaceKeys) ?? false
        const permiteDecimales = readBoolean(item, productAllowsDecimalKeys) ?? true

        return {
          id: String(id),
          label: readString(item, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']) || String(id),
          digitosImei,
          digitosChipId,
          mascaraSerie,
          mascaraChipId,
          esSerializado,
          seriePermiteEspacios,
          chipPermiteEspacios,
          permiteDecimales,
        }
      })
      .filter((item): item is ProductMeta => Boolean(item))
  }, [cargoUsuarioProductosQuery.data, productoMascaraMap])
  const cargoUsuarioSelectedMeta = useMemo(
    () => cargoUsuarioProductoMetas.find((item) => item.id === cargoUsuarioProductoId) ?? null,
    [cargoUsuarioProductoId, cargoUsuarioProductoMetas]
  )
  const cargoUsuarioMetaByProductoId = useMemo(() => {
    const map = new Map<number, ProductMeta>()
    cargoUsuarioProductoMetas.forEach((meta) => {
      const parsedId = Number(meta.id)
      if (Number.isFinite(parsedId) && parsedId > 0) {
        map.set(parsedId, meta)
      }
    })
    return map
  }, [cargoUsuarioProductoMetas])
  const cargoUsuarioNeedsSerie = (cargoUsuarioSelectedMeta?.digitosImei ?? 0) > 0
  const cargoUsuarioNeedsChip = (cargoUsuarioSelectedMeta?.digitosChipId ?? 0) > 0
  const cargoUsuarioSerieMask = cargoUsuarioSelectedMeta?.mascaraSerie ?? ''
  const cargoUsuarioChipMask = cargoUsuarioSelectedMeta?.mascaraChipId ?? ''
  const cargoUsuarioSerieInputMode = isNumericMask(cargoUsuarioSerieMask) ? 'numeric' : undefined
  const cargoUsuarioChipInputMode = isNumericMask(cargoUsuarioChipMask) ? 'numeric' : undefined
  const cargoUsuarioSerieDigitsNeeded =
    (cargoUsuarioSelectedMeta?.digitosImei ?? 0) > 0
      ? (cargoUsuarioSelectedMeta?.digitosImei ?? 0)
      : countMaskTokens(cargoUsuarioSerieMask)
  const cargoUsuarioChipDigitsNeeded =
    (cargoUsuarioSelectedMeta?.digitosChipId ?? 0) > 0
      ? (cargoUsuarioSelectedMeta?.digitosChipId ?? 0)
      : countMaskTokens(cargoUsuarioChipMask)
  const cargoUsuarioSerieDigitsComplete =
    !cargoUsuarioNeedsSerie ||
    (cargoUsuarioSerieMask
      ? isMaskComplete(cargoUsuarioSerie.trim(), cargoUsuarioSerieMask)
      : countFilledMaskChars(cargoUsuarioSerie.trim()) === cargoUsuarioSerieDigitsNeeded)
  const cargoUsuarioChipDigitsComplete =
    !cargoUsuarioNeedsChip ||
    (cargoUsuarioChipMask
      ? isMaskComplete(cargoUsuarioChipId.trim(), cargoUsuarioChipMask)
      : countFilledMaskChars(cargoUsuarioChipId.trim()) === cargoUsuarioChipDigitsNeeded)
  const cargoUsuarioCantidadValid = cargoUsuarioNeedsSerie
    ? Number(cargoUsuarioCantidad) === 1
    : Number.isFinite(Number(cargoUsuarioCantidad)) && Number(cargoUsuarioCantidad) > 0
  const cargoUsuarioActiveSerie = cargoUsuarioNeedsSerie && cargoUsuarioTieneSerie
  const cargoUsuarioActiveChip = cargoUsuarioNeedsChip && cargoUsuarioTieneChipId
  const cargoUsuarioSerieLista = cargoUsuarioActiveSerie && Boolean(cargoUsuarioSerie.trim()) && cargoUsuarioSerieDigitsComplete
  const cargoUsuarioChipLista = cargoUsuarioActiveChip && Boolean(cargoUsuarioChipId.trim()) && cargoUsuarioChipDigitsComplete
  const cargoUsuarioSerieFlujoOk = !cargoUsuarioActiveSerie || (cargoUsuarioSerieLista && cargoUsuarioSerieBloqueada)
  const cargoUsuarioChipFlujoOk = !cargoUsuarioActiveChip || (cargoUsuarioChipLista && cargoUsuarioChipBloqueado)
  const cargoUsuarioChipGateBySerie =
    !cargoUsuarioNeedsChip ||
    !cargoUsuarioNeedsSerie ||
    (cargoUsuarioTieneSerie && cargoUsuarioSerieBloqueada && !cargoUsuarioSerieError)
  const cargoUsuarioSerializadoTieneAlMenosUnDato =
    !cargoUsuarioNeedsSerie ||
    cargoUsuarioSerieLista ||
    cargoUsuarioChipLista
  const cargoUsuarioCanAdd =
    Boolean(cargoUsuarioProductoId) &&
    cargoUsuarioCantidadValid &&
    cargoUsuarioSerializadoTieneAlMenosUnDato &&
    cargoUsuarioSerieFlujoOk &&
    cargoUsuarioChipFlujoOk

  useEffect(() => {
    if (!cargoUsuarioProductoId) {
      setCargoUsuarioTieneSerie(true)
      setCargoUsuarioTieneChipId(false)
      setCargoUsuarioSerieBloqueada(false)
      setCargoUsuarioChipBloqueado(false)
      return
    }

    if (!cargoUsuarioNeedsSerie) {
      setCargoUsuarioTieneSerie(false)
      setCargoUsuarioTieneChipId(false)
      setCargoUsuarioSerieBloqueada(false)
      setCargoUsuarioChipBloqueado(false)
      return
    }

    if (cargoUsuarioNeedsSerie && !cargoUsuarioNeedsChip) {
      setCargoUsuarioTieneSerie(true)
      setCargoUsuarioTieneChipId(false)
      setCargoUsuarioSerieBloqueada(false)
      setCargoUsuarioChipBloqueado(false)
      return
    }

    setCargoUsuarioTieneSerie(true)
    setCargoUsuarioTieneChipId(false)
    setCargoUsuarioSerieBloqueada(false)
    setCargoUsuarioChipBloqueado(false)
  }, [cargoUsuarioNeedsChip, cargoUsuarioNeedsSerie, cargoUsuarioProductoId])
  const lockProducto = () => {
    if (productoId && !productoBloqueado) {
      setProductoBloqueado(true)
    }
  }

  const selectProducto = (value: string) => {
    setProductoId(value)
    setProductoSelectorOpen(false)
    setProductoSearch('')
  }

  const selectCargoUsuarioProducto = (value: string) => {
    setCargoUsuarioGuardado(false)
    setCargoUsuarioProductoId(value)
    setCargoUsuarioProductoBloqueado(Boolean(value))
    setCargoUsuarioProductoSelectorOpen(false)
    setCargoUsuarioProductoSearch('')
  }

  const handleSerieFocus = () => {
    lockProducto()
    if (isInstalledType && needsSerie && productoId && !serieCamposBloqueados) {
      setSerieSelectorOpen(true)
    }
  }

  const handleCantidadFocus = () => {
    lockProducto()
  }

  const handleBackToDashboard = () => {
    const refreshToken = Date.now()
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(OT_DASHBOARD_FORCE_REFRESH_KEY, String(refreshToken))
    }
    navigate('/GestionOTs', { state: { refreshToken } })
  }

  const handleSuccessModalAccept = () => {
    setSuccessModalOpen(false)
    handleBackToDashboard()
  }

  const handleErrorModalClose = () => {
    setErrorModalOpen(false)
  }

  useEffect(() => {
    const message = error || cargoUsuarioError
    if (!message) return
    setErrorModalMessage(message)
    setErrorModalOpen(true)
  }, [cargoUsuarioError, error])

  const handleCantidadBlur = () => {
    if (skipMaterialBlurValidationRef.current) {
      skipMaterialBlurValidationRef.current = false
      return
    }
    setCantidadBlurConfirmada(true)
  }

  const handleCantidadKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    // Evita submit accidental del formulario desde el teclado numerico movil.
    event.preventDefault()
    setCantidadBlurConfirmada(true)
    event.currentTarget.blur()
  }

  const handleChipFocus = () => {
    lockProducto()
  }

  const enterManualChipMode = () => {
    if (chipDigitsRequired <= 0) {
      setAllowManualChipId(false)
      setChipCamposBloqueados(true)
      focusCantidadField()
      return
    }
    setChipId('')
    setSerieCamposBloqueados(true)
    setChipCamposBloqueados(false)
    setAllowManualChipId(true)
    setChipFromDatabase(false)
    setChipLockedAfterManualRetired(false)
    setChipUniquenessState('idle')
    requestAnimationFrame(() => {
      chipIdInputRef.current?.focus()
    })
  }
  const serieMask = selectedProductMeta?.mascaraSerie ?? ''
  const chipIdMask = selectedProductMeta?.mascaraChipId ?? ''
  const serieInputMode = isNumericMask(serieMask) ? 'numeric' : undefined
  const chipInputMode = isNumericMask(chipIdMask) ? 'numeric' : undefined
  const serieDigitsRequired = selectedProductMeta?.digitosImei ?? 0
  const chipDigitsRequired = selectedProductMeta?.digitosChipId ?? 0
  const isNonSerializedProduct = serieDigitsRequired === 0 && chipDigitsRequired === 0
  const seriePermiteEspacios = selectedProductMeta?.seriePermiteEspacios ?? false
  const chipPermiteEspacios = selectedProductMeta?.chipPermiteEspacios ?? false
  const cantidadPermiteDecimales = selectedProductMeta?.permiteDecimales ?? true
  const serieDigitsNeeded = isNonSerializedProduct ? 0 : serieDigitsRequired > 0 ? serieDigitsRequired : countMaskTokens(serieMask)
  const chipDigitsNeeded = isNonSerializedProduct ? 0 : chipDigitsRequired > 0 ? chipDigitsRequired : 0
  const needsSerie = serieDigitsNeeded > 0
  const needsChip = chipDigitsRequired > 0
  const tipoMaterialNumero = Number(tipoMaterialId)
  const isRetiredE18Type = Number.isFinite(tipoMaterialNumero) && tipoMaterialNumero === 5
  const requiresChipByTipo = needsChip && !isRetiredE18Type
  const canUseChipId = requiresChipByTipo || allowManualChipId
  const isRetiredMaterial = isRetiredType
  const requiresChipUniqueness = !isRetiredMaterial && needsSerie && requiresChipByTipo
  const shouldSkipChipField = isInstalledType || isRetiredE18Type || (isRetiredMaterial && chipFromDatabase && !allowManualChipId)
  const serieFilledDigits = countFilledMaskChars(serie.trim())
  const chipFilledDigits = countFilledMaskChars(chipId.trim())
  const serieDigitsComplete = !needsSerie || (serieMask ? isMaskComplete(serie.trim(), serieMask) : serieFilledDigits === serieDigitsNeeded)
  const chipDigitsComplete =
    !requiresChipByTipo ||
    shouldSkipChipField ||
    (chipIdMask ? isMaskComplete(chipId.trim(), chipIdMask) : chipFilledDigits === chipDigitsNeeded)
  const serieDisabled = !needsSerie || serieCamposBloqueados
  const materialFormCleared = !tipoMaterialId && !productoId
  const chipDisabled =
    materialFormCleared ||
    shouldSkipChipField ||
    (isRetiredMaterial && chipFromDatabase && !allowManualChipId) ||
    (isRetiredMaterial && !chipFromDatabase && chipLockedAfterManualRetired) ||
    ((!requiresChipByTipo && !allowManualChipId) || chipCamposBloqueados)
  const canAddMaterialCore =
    !isAddingMaterial &&
    Boolean(tipoMaterialId) &&
    Boolean(productoId) &&
    Number.isFinite(Number(cantidad)) &&
    (needsSerie ? Number(cantidad) === 1 : Number(cantidad) > 0) &&
    (!needsSerie || serieCamposBloqueados) &&
    serieDigitsComplete &&
    chipDigitsComplete &&
    (!requiresChipUniqueness || shouldSkipChipField || chipUniquenessState === 'valid') &&
    (!needsSerie || Boolean(serie.trim())) &&
    (!requiresChipByTipo || shouldSkipChipField || Boolean(chipId.trim()))
  const canAddMaterial = canAddMaterialCore && (!needsSerie || cantidadBlurConfirmada)

  useEffect(() => {
    const serieTerm = serie.trim()
    if (isInstalledType || !needsSerie || serieCamposBloqueados || !productoId || serieTerm.length < 1) {
      setSerieSuggestions([])
      return
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const rows = await fetchSeriesSuggestions(serieTerm, 8, {
          idProducto: productoId,
          idRuta: idRutaValidacion ?? undefined,
          tipoMaterial: tipoMaterialId,
          tipoMaterialNombre: selectedTipoMaterialLabel || undefined,
        })
        const unique = new Map<string, SerieSuggestionOption>()
        rows.forEach((item) => {
          if (item.serial && !unique.has(item.serial)) {
            unique.set(item.serial, { serial: item.serial, chipId: item.chipId })
          }
        })
        setSerieSuggestions(Array.from(unique.values()))
      } catch {
        setSerieSuggestions([])
      }
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [idRutaValidacion, needsSerie, productoId, selectedTipoMaterialLabel, serie, serieCamposBloqueados, tipoMaterialId])

  useEffect(() => {
    if (!serieSelectorOpen || !isInstalledType || !needsSerie || !productoId) {
      return
    }
    let cancelled = false
    setSerieSelectorLoading(true)
    fetchSeriesSuggestions('', 50, {
      idProducto: productoId,
      idRuta: idRutaValidacion ?? undefined,
      tipoMaterial: tipoMaterialId,
      tipoMaterialNombre: selectedTipoMaterialLabel || undefined,
    })
      .then((rows) => {
        if (cancelled) return
        const unique = new Map<string, SerieSuggestionOption>()
        rows.forEach((item) => {
          if (item.serial && !unique.has(item.serial)) {
            unique.set(item.serial, { serial: item.serial, chipId: item.chipId })
          }
        })
        setSerieSuggestions(Array.from(unique.values()))
      })
      .catch(() => {
        if (!cancelled) setSerieSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setSerieSelectorLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [idRutaValidacion, isInstalledType, needsSerie, productoId, selectedTipoMaterialLabel, serieSelectorOpen, tipoMaterialId])

  useEffect(() => {
    if (!serieSelectorOpen) return
    window.setTimeout(() => {
      serieSelectorSearchRef.current?.focus()
    }, 80)
  }, [serieSelectorOpen])

  useEffect(() => {
    const serieTerm = cargoUsuarioSerie.trim()
    if (!cargoUsuarioNeedsSerie || cargoUsuarioSerieBloqueada || !cargoUsuarioProductoId || serieTerm.length < 1) {
      setCargoUsuarioSerieSuggestions([])
      return
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        const rows = await fetchSeriesSuggestions(serieTerm, 8, cargoUsuarioProductoId)
        setCargoUsuarioSerieSuggestions(Array.from(new Set(rows.map((item) => item.serial))))
      } catch {
        setCargoUsuarioSerieSuggestions([])
      }
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [cargoUsuarioNeedsSerie, cargoUsuarioProductoId, cargoUsuarioSerie, cargoUsuarioSerieBloqueada])

  const focusSerieField = () => {
    requestAnimationFrame(() => {
      serieInputRef.current?.focus()
      serieInputRef.current?.select()
    })
  }

  const focusChipField = () => {
    requestAnimationFrame(() => {
      chipIdInputRef.current?.focus()
      chipIdInputRef.current?.select()
    })
  }

  const focusCantidadField = () => {
    setCantidadBlurConfirmada(true)
    requestAnimationFrame(() => {
      cantidadInputRef.current?.focus()
      cantidadInputRef.current?.select()
    })
  }

  const validateChipUniqueness = useCallback(
    async (rawChip: string): Promise<boolean> => {
      const chipTrimmed = rawChip.trim()
      if (!chipTrimmed) {
        setChipUniquenessState('idle')
        return true
      }

      const serieTrimmed = serie.trim()
      if (!serieTrimmed) {
        setChipUniquenessState('idle')
        return true
      }

      try {
        const validation = await validarSerieChipUnico({
          serie: serieTrimmed,
          chipId: chipTrimmed,
        })

        if (validation.chipExiste && !validation.mismoRegistro) {
          setChipUniquenessState('invalid')
          setError(null)
          setChipValidationError(`Serie: ${serieTrimmed} | ChipID: ${chipTrimmed}. El ChipID pertenece a otro serial.`)
          return false
        }

        if (!validation.sePuede) {
          if (isRetiredMaterial && !validation.chipExiste) {
            // En retirados se permite continuar cuando la combinacion no existe,
            // pero no cuando el chip pertenece a otro serial.
            setChipUniquenessState('valid')
            setChipValidationError(null)
            return true
          }
          setChipUniquenessState('invalid')
          setError(null)
          setChipValidationError(
            `Serie: ${serieTrimmed} | ChipID: ${chipTrimmed}. ${validation.observacion?.trim() || 'La serie y el ChipID no existen en saldo.'}`
          )
          return false
        }

        setChipUniquenessState('valid')
        setChipValidationError(null)
        return true
      } catch (validationError) {
        console.error('No se pudo validar la unicidad del ChipID.', validationError)
        if (isRetiredMaterial) {
          setChipUniquenessState('valid')
          setChipValidationError(null)
          return true
        }
        setChipUniquenessState('invalid')
        setError(null)
        setChipValidationError('No se pudo validar la unicidad del ChipID.')
        return false
      }
    },
    [isRetiredMaterial, serie, validarSerieChipUnico]
  )

  useEffect(() => {
    const serieTrimmed = serie.trim()
    const chipTrimmed = chipId.trim()
    if (isRetiredMaterial) {
      if (chipUniquenessState !== 'idle') {
        setChipUniquenessState('idle')
      }
      return
    }
    if (!requiresChipByTipo || !chipTrimmed || !chipDigitsComplete) {
      if (chipUniquenessState !== 'idle') {
        setChipUniquenessState('idle')
      }
      return
    }

    if (!needsSerie) {
      if (chipUniquenessState !== 'valid') {
        setChipUniquenessState('valid')
      }
      return
    }

    if (!serieTrimmed || !serieDigitsComplete) {
      if (chipUniquenessState !== 'idle') {
        setChipUniquenessState('idle')
      }
      return
    }

    if (chipUniquenessState === 'valid' || chipUniquenessState === 'invalid') {
      return
    }

    const timer = window.setTimeout(() => {
      void validateChipUniqueness(chipTrimmed)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    chipDigitsComplete,
    chipId,
    chipUniquenessState,
    isRetiredMaterial,
    serie,
    serieDigitsComplete,
    requiresChipByTipo,
    needsSerie,
    validateChipUniqueness,
  ])

  const validateSerieBalance = useCallback(
    async (rawValue: string): Promise<boolean> => {
      if (!needsSerie) {
        setSerieValidationError(null)
        return true
      }

      const trimmed = rawValue.trim()
      if (!trimmed) {
        setSerieValidationError(null)
        lastValidatedSerieRef.current = null
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(true)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }

      const currentKey = `${productoId}::${trimmed}`
      if (lastValidatedSerieRef.current?.key === currentKey && lastValidatedSerieRef.current.sePuede) {
        setSerieValidationError(null)
        return true
      }

      if (serieDigitsNeeded > 0) {
        if (!(serieMask ? isMaskComplete(trimmed, serieMask) : countFilledMaskChars(trimmed) >= serieDigitsNeeded)) {
          setSerieValidationError(
            serieMask
              ? `La serie debe completar la mascara ${serieMask}.`
              : `La serie debe completar ${serieDigitsNeeded} digitos.`
          )
          setSerieCamposBloqueados(false)
          setChipCamposBloqueados(true)
          setAllowManualChipId(false)
          setChipUniquenessState('idle')
          return false
        }
      }

      const parsedProducto = Number(productoId)
      const parsedTipoMaterial = Number(tipoMaterialId)
      if (!Number.isFinite(parsedProducto) || parsedProducto <= 0 || !Number.isFinite(parsedTipoMaterial) || parsedTipoMaterial <= 0) {
        setSerieValidationError('Producto o Tipo Material invalido para validar la serie.')
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(true)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }

      try {
        const validation = await validarSerieSaldo({
          serie: trimmed,
          idProducto: parsedProducto,
          idTipoMaterial: parsedTipoMaterial,
          idRuta: idRutaValidacion ?? undefined,
        })

        if (!validation.sePuede) {
          if (isRetiredMaterial) {
            const observacion = validation.observacion?.toLowerCase() ?? ''
            if (
              observacion.includes('no se pudo validar') ||
              observacion.includes('error en base de datos') ||
              observacion.includes('no devolvio un conjunto de resultados') ||
              observacion.includes('no existe')
            ) {
              setSerieValidationError(null)
              lastValidatedSerieRef.current = { key: currentKey, sePuede: true }
              enterManualChipMode()
              setChipUniquenessState('idle')
              return true
            }
          }

          setSerieValidationError(validation.observacion ?? 'La serie no esta disponible en tu saldo.')
          lastValidatedSerieRef.current = null
          setSerieCamposBloqueados(false)
          setChipCamposBloqueados(true)
          setAllowManualChipId(false)
          setChipUniquenessState('idle')
          return false
        }

        lastValidatedSerieRef.current = { key: currentKey, sePuede: true }

        if (canUseChipId && !chipId) {
          let resolvedChip = validation.chipId
          if (!resolvedChip) {
            try {
              const chipResponse = await fetchChipIdBySerie(trimmed)
              resolvedChip = chipResponse.chipId
            } catch (chipError) {
              console.warn('No se pudo obtener chipId adicional', chipError)
            }
          }
          if (resolvedChip) {
            const formattedChip = chipIdMask ? applyMask(resolvedChip, chipIdMask) : resolvedChip
            setChipId(formattedChip)
            if (isRetiredMaterial) {
              setChipFromDatabase(true)
              setChipCamposBloqueados(true)
              setChipLockedAfterManualRetired(false)
            }
          }
        }

        setChipCamposBloqueados(shouldSkipChipField || !requiresChipByTipo ? true : false)
        setAllowManualChipId(false)
        setChipUniquenessState('valid')
        return true
      } catch (validationError) {
        console.error('No se pudo validar la serie contra el saldo.', validationError)
        if (isRetiredMaterial) {
          setSerieValidationError(null)
          lastValidatedSerieRef.current = { key: currentKey, sePuede: true }
          if (requiresChipByTipo && !shouldSkipChipField) {
            enterManualChipMode()
          } else {
            setChipCamposBloqueados(true)
            focusCantidadField()
          }
          setChipUniquenessState('idle')
          return true
        }
        setSerieValidationError('No se pudo validar la serie con el saldo.')
        lastValidatedSerieRef.current = null
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(true)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }
    },
    [
      canUseChipId,
      chipId,
      chipIdMask,
      fetchChipIdBySerie,
      idRutaValidacion,
      requiresChipByTipo,
      needsSerie,
      isRetiredMaterial,
      shouldSkipChipField,
      chipFromDatabase,
      productoId,
      serieMask,
      serieDigitsNeeded,
      tipoMaterialId,
      validarSerieSaldo,
    ]
  )

  const advanceFromSerie = useCallback(async (): Promise<boolean> => {
    if (!needsSerie) {
      if (requiresChipByTipo && !shouldSkipChipField) {
        focusChipField()
        return true
      }

      focusCantidadField()
      return true
    }

    const trimmed = serie.trim()
    if (!trimmed) {
      setSerieValidationError('Debes ingresar la Serie del producto.')
      setChipCamposBloqueados(true)
      focusSerieField()
      return false
    }

    if (serieMask ? !isMaskComplete(trimmed, serieMask) : countFilledMaskChars(trimmed) < serieDigitsNeeded) {
      setSerieValidationError(
        serieMask ? `La serie debe completar la mascara ${serieMask}.` : `La serie debe completar ${serieDigitsNeeded} digitos.`
      )
      setChipCamposBloqueados(true)
      focusSerieField()
      return false
    }

    const valid = await validateSerieBalance(trimmed)
    if (!valid) {
      focusSerieField()
      return false
    }

    setSerieCamposBloqueados(true)

    if ((requiresChipByTipo || allowManualChipId) && !shouldSkipChipField) {
      focusChipField()
      return true
    }

    focusCantidadField()
    return true
  }, [
    allowManualChipId,
    requiresChipByTipo,
    needsSerie,
    shouldSkipChipField,
    serie,
    serieDigitsNeeded,
    serieMask,
    validateSerieBalance,
  ])

  const ensureSerieValidated = useCallback(async (): Promise<boolean> => {
    if (!needsSerie) return true
    const trimmed = serie.trim()
    if (!trimmed) {
      setSerieValidationError('Debes ingresar la Serie del producto.')
      return false
    }
    return validateSerieBalance(trimmed)
  }, [needsSerie, serie, validateSerieBalance])

  const handleSerieBlur = (): void => {
    if (isInstalledType || serieSelectorOpen) {
      setSerieValidationError(null)
      return
    }
    if (skipMaterialBlurValidationRef.current) {
      skipMaterialBlurValidationRef.current = false
      setSerieValidationError(null)
      return
    }
    if (!needsSerie) return
    void advanceFromSerie()
  }

  const handleSerieKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return
    event.preventDefault()
    void advanceFromSerie()
  }

  const advanceFromChip = useCallback(async (): Promise<boolean> => {
    if (shouldSkipChipField || (!requiresChipByTipo && !allowManualChipId)) return true

    const trimmed = chipId.trim()
    if (!trimmed) {
      setError(null)
      setChipValidationError('Debes ingresar el ChipID del producto retirado.')
      focusChipField()
      return false
    }

    if (
      requiresChipByTipo &&
      chipDigitsNeeded > 0 &&
      !(chipIdMask ? isMaskComplete(trimmed, chipIdMask) : countFilledMaskChars(trimmed) >= chipDigitsNeeded)
    ) {
      setError(null)
      setChipValidationError(chipIdMask ? `El ChipID debe completar la mascara ${chipIdMask}.` : `El ChipID debe completar ${chipDigitsNeeded} digitos.`)
      focusChipField()
      return false
    }

    setChipValidationError(null)

    if (!needsSerie) {
      setChipUniquenessState('valid')
      if (isRetiredMaterial && !chipFromDatabase) {
        setChipLockedAfterManualRetired(true)
      }
      focusCantidadField()
      return true
    }

    if (isRetiredMaterial) {
      const unique = await validateChipUniqueness(trimmed)
      if (!unique) {
        focusChipField()
        return false
      }
      setChipUniquenessState('idle')
      if (!chipFromDatabase) {
        setChipLockedAfterManualRetired(true)
      }
      focusCantidadField()
      return true
    }

    const unique = await validateChipUniqueness(trimmed)
    if (!unique) {
      focusChipField()
      return false
    }

    if (isRetiredMaterial && !chipFromDatabase) {
      setChipLockedAfterManualRetired(true)
    }

    focusCantidadField()
    return true
  }, [
    allowManualChipId,
    chipDigitsNeeded,
    chipId,
    chipIdMask,
    chipFromDatabase,
    isRetiredMaterial,
    needsSerie,
    requiresChipByTipo,
    shouldSkipChipField,
    validateChipUniqueness,
  ])

  const handleChipBlur = (): void => {
    if (skipMaterialBlurValidationRef.current) {
      skipMaterialBlurValidationRef.current = false
      setChipValidationError(null)
      return
    }
    void advanceFromChip()
  }

  const handleChipKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return
    event.preventDefault()
    void advanceFromChip()
  }

  useEffect(() => {
    lastValidatedSerieRef.current = null
    setAllowManualChipId(false)
    setChipUniquenessState('idle')
  }, [productoId, tipoMaterialId])

  useEffect(() => {
    setCargoUsuarioSerie('')
    setCargoUsuarioChipId('')
    setCargoUsuarioCantidad('1')
    setCargoUsuarioSerieBloqueada(false)
    setCargoUsuarioChipBloqueado(false)
    cargoUsuarioChipAutoRef.current = false
    setCargoUsuarioSerieError(null)
    setCargoUsuarioChipError(null)
    setCargoUsuarioError(null)
  }, [cargoUsuarioProductoId])

  useEffect(() => {
    setCargoUsuarioProductoBloqueado(Boolean(cargoUsuarioProductoId))
  }, [cargoUsuarioProductoId])

  useEffect(() => {
    if (
      (cargoUsuarioChipAutoRef.current || cargoUsuarioChipBloqueado) &&
      cargoUsuarioChipId.trim() &&
      cargoUsuarioChipError === 'Debes ingresar el ChipID.'
    ) {
      setCargoUsuarioChipError(null)
    }
  }, [cargoUsuarioChipBloqueado, cargoUsuarioChipError, cargoUsuarioChipId])

  useEffect(() => {
    if (serieValidationError) {
      setSerieValidationError(null)
    }
  }, [serie])

  useEffect(() => {
    if (chipValidationError) {
      setChipValidationError(null)
    }
  }, [chipId, serie])

  useEffect(() => {
    setProductoId('')
    setProductoSearch('')
    setSerie('')
    setChipId('')
    setCantidad('1')
    setProductoBloqueado(false)
    setSerieCamposBloqueados(false)
    setChipCamposBloqueados(true)
    setAllowManualChipId(false)
    setChipFromDatabase(false)
    setChipLockedAfterManualRetired(false)
    setChipUniquenessState('idle')
    setCantidadBlurConfirmada(false)
    setSerieValidationError(null)
    setChipValidationError(null)
    lastValidatedSerieRef.current = null
    autoAdvanceToChipRef.current = false
  }, [tipoMaterialId])

  useEffect(() => {
    if (!idEstado && estadoOptions.length > 0) {
      setIdEstado(estadoOptions[0].value)
    }
  }, [estadoOptions, idEstado])

  useEffect(() => {
    setDetalleGuardado(false)
    setCargoUsuarioGuardado(false)
    nomencladoresAutocargaRef.current = false
  }, [numeroOrden])

  useEffect(() => {
    if (!tipoMaterialId || productoId) return

    requestAnimationFrame(() => {
      productoSelectRef.current?.focus()
    })
  }, [tipoMaterialId, productoId])

  useEffect(() => {
    if (!productoId) {
      setSerie('')
      setChipId('')
      setCantidad('1')
      setAllowManualChipId(false)
      setChipCamposBloqueados(true)
      setCantidadBlurConfirmada(false)
      autoAdvanceToChipRef.current = false
      return
    }

    setSerie('')
    setChipId('')
    setSerieCamposBloqueados(false)
    setChipCamposBloqueados(!needsSerie && requiresChipByTipo ? false : true)
    setAllowManualChipId(false)
    setChipFromDatabase(false)
    setChipLockedAfterManualRetired(false)
    setChipUniquenessState('idle')
    setCantidadBlurConfirmada(false)
    setCantidad('1')
    autoAdvanceToChipRef.current = false
  }, [productoId, requiresChipByTipo, needsSerie])

  useEffect(() => {
    if (!productoId && productoBloqueado) {
      setProductoBloqueado(false)
    }
  }, [productoId, productoBloqueado])

  useEffect(() => {
    if (!tipoMaterialId || !productoId) return

    requestAnimationFrame(() => {
      if (needsSerie) {
        serieInputRef.current?.focus()
        return
      }

      if (requiresChipByTipo && !shouldSkipChipField) {
        chipIdInputRef.current?.focus()
        chipIdInputRef.current?.select()
        return
      }

      cantidadInputRef.current?.focus()
      cantidadInputRef.current?.select()
    })
  }, [requiresChipByTipo, needsSerie, productoId, shouldSkipChipField, tipoMaterialId])

  useEffect(() => {
    if (!isRetiredMaterial || !needsSerie || !requiresChipByTipo) {
      autoAdvanceToChipRef.current = false
      return
    }

    if (!serie.trim() || !serieDigitsComplete || !serieCamposBloqueados) {
      autoAdvanceToChipRef.current = false
      setChipCamposBloqueados(true)
      return
    }

    if (shouldSkipChipField) {
      setChipCamposBloqueados(true)
      if (!autoAdvanceToChipRef.current) {
        autoAdvanceToChipRef.current = true
        focusCantidadField()
      }
      return
    }

    if (!chipCamposBloqueados) {
      if (!autoAdvanceToChipRef.current) {
        autoAdvanceToChipRef.current = true
        focusChipField()
      }
      return
    }

    setChipCamposBloqueados(false)
    if (!autoAdvanceToChipRef.current) {
      autoAdvanceToChipRef.current = true
      focusChipField()
    }
  }, [chipCamposBloqueados, isRetiredMaterial, requiresChipByTipo, needsSerie, serie, serieDigitsComplete, serieCamposBloqueados, shouldSkipChipField])

  useEffect(() => {
    const selected = tipoMaterialOptions.find((option) => option.value === tipoMaterialId)
    const label = selected?.label?.toLowerCase() ?? ''
    if (label.includes('instalado')) {
      setEntregado(true)
      return
    }
    if (label.includes('retirado') || label.includes('no entregado') || label.includes('noentregado')) {
      setEntregado(false)
      return
    }
    setEntregado(true)
  }, [tipoMaterialId, tipoMaterialOptions])

  useEffect(() => {
    if (isInstalledType) {
      setChipCamposBloqueados(true)
      setAllowManualChipId(false)
      setChipFromDatabase(false)
      setChipLockedAfterManualRetired(false)
      setChipUniquenessState('idle')
    }
  }, [isInstalledType])

  const columns = useMemo<Column<MaterialRow>[]>(
    () => [
      { key: 'producto', header: 'Nombre', render: (row) => row.producto },
      { key: 'cantidad', header: 'Cantidad', render: (row) => row.cantidad.toFixed(2) },
      { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
      { key: 'chipId', header: 'Chip ID', render: (row) => row.chipId || '-' },
      {
        key: 'tipoMaterial',
        header: 'Tipo',
        render: (row) =>
          isRetiredMaterialRow(row) ? (
            <span className="font-medium text-slate-500">Retirado</span>
          ) : (
            row.tipoMaterialLabel
          ),
      },
      { key: 'entregado', header: 'Entregado', render: (row) => (row.entregado ? 'Si' : 'No') },
      {
        key: 'acciones',
        header: 'Accion',
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            className="!rounded-xl !px-3 !py-1.5 !text-base md:!text-sm"
            disabled={formLocked}
            onClick={() =>
              setMaterialRows((prev) => {
                const next = prev.filter((item) => item.id !== row.id)
                return syncKitDecodificadorRows(next, {
                  idProductoRecienAgregado: row.idProducto,
                  idTipoMaterial: row.idTipoMaterial,
                  tipoMaterialLabel: row.tipoMaterialLabel,
                  entregado: row.entregado,
                })
              })
            }
          >
            Quitar
          </Button>
        ),
      },
    ],
    [formLocked, kitDecodificadorProductoIds, productoLabelById]
  )

  const cargoUsuarioColumns = useMemo<Column<CargoUsuarioRow>[]>(
    () => [
      { key: 'producto', header: 'Producto', render: (row) => row.producto },
      { key: 'cantidad', header: 'Cantidad', render: (row) => row.cantidad.toFixed(2) },
      { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
      { key: 'chipId', header: 'ChipID', render: (row) => row.chipId || '-' },
      {
        key: 'acciones',
        header: 'Accion',
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            className="!rounded-xl !px-3 !py-1.5 !text-base md:!text-sm"
            disabled={formLocked}
            onClick={() => {
              setCargoUsuarioRows((prev) => prev.filter((item) => item.id !== row.id))
              setCargoUsuarioGuardado(false)
            }}
          >
            Quitar
          </Button>
        ),
      },
    ],
    [formLocked]
  )

  const resetMaterialForm = () => {
    setProductoId('')
    setProductoSearch('')
    setSerie('')
    setChipId('')
    setCantidad('1')
    setEntregado(true)
    setError(null)
    setSuccess(null)
    setProductoBloqueado(false)
    setSerieCamposBloqueados(true)
    setChipCamposBloqueados(true)
    setChipFromDatabase(false)
    setChipLockedAfterManualRetired(false)
    setChipUniquenessState('idle')
    setCantidadBlurConfirmada(false)
    setSerieValidationError(null)
    setChipValidationError(null)
    skipMaterialBlurValidationRef.current = false
    setTipoMaterialEditEnabled(false)
  }

  const syncKitDecodificadorRows = (
    rows: MaterialRow[],
    context: {
      idProductoRecienAgregado: number
      idTipoMaterial: number
      tipoMaterialLabel: string
      entregado: boolean
    }
  ): MaterialRow[] => {
    const productoAgregado = context.idProductoRecienAgregado
    const isKitProducto =
      kitDecodificadorProductoIds.has(productoAgregado) &&
      productoAgregado !== CONTROL_REMOTO_PRODUCT_ID &&
      productoAgregado !== PILAS_PRODUCT_ID
    if (!isKitProducto) {
      return rows
    }

    const normalizedTipoMaterialId = normalizeTipoMaterialForKit(context.idTipoMaterial)
    const normalizedTipoMaterialLabel =
      normalizedTipoMaterialId === 2 ? 'Retirado' : context.tipoMaterialLabel
    const matchContext = (row: MaterialRow): boolean =>
      row.entregado === context.entregado &&
      matchesTipoMaterialForKit(row.idTipoMaterial, normalizedTipoMaterialId)
    const clearAutoProductosForContext = (current: MaterialRow[]): MaterialRow[] =>
      current.filter((row) => {
        const isAutoProducto = row.idProducto === CONTROL_REMOTO_PRODUCT_ID || row.idProducto === PILAS_PRODUCT_ID
        if (!isAutoProducto) return true
        return !matchContext(row)
      })

    const cantidadDecodificadores = rows.reduce((acc, row) => {
      if (!matchContext(row)) return acc
      if (!kitDecodificadorProductoIds.has(row.idProducto)) return acc
      if (row.idProducto === CONTROL_REMOTO_PRODUCT_ID || row.idProducto === PILAS_PRODUCT_ID) return acc
      return acc + row.cantidad
    }, 0)

    if (cantidadDecodificadores <= 0) {
      return clearAutoProductosForContext(rows)
    }

    const upsertAutoProducto = (
      current: MaterialRow[],
      idProductoAuto: number,
      cantidadAuto: number
    ): MaterialRow[] => {
      if (cantidadAuto <= 0) return current
      const index = current.findIndex(
        (row) =>
          row.idProducto === idProductoAuto &&
          matchesTipoMaterialForKit(row.idTipoMaterial, normalizedTipoMaterialId) &&
          row.entregado === context.entregado
      )

      if (index === -1) {
        return [
          ...current,
          {
            id: `kit-${idProductoAuto}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            idProducto: idProductoAuto,
            producto: productoLabelById.get(idProductoAuto) ?? String(idProductoAuto),
            serie: '',
            chipId: '',
            cantidad: cantidadAuto,
            idTipoMaterial: normalizedTipoMaterialId,
            tipoMaterialLabel: normalizedTipoMaterialLabel,
            entregado: context.entregado,
            requiresChip: false,
          },
        ]
      }

      return current.map((row, rowIndex) =>
        rowIndex !== index
          ? row
          : {
              ...row,
              cantidad: cantidadAuto,
            }
      )
    }

    let next = clearAutoProductosForContext(rows)
    next = upsertAutoProducto(next, CONTROL_REMOTO_PRODUCT_ID, cantidadDecodificadores)
    next = upsertAutoProducto(next, PILAS_PRODUCT_ID, cantidadDecodificadores * 2)
    return next
  }

  const addMaterial = async () => {
    setIsAddingMaterial(true)
    try {
      setSuccess(null)
      setError(null)
      setChipValidationError(null)
      const cantidadNum = needsSerie ? 1 : Number(cantidad)
      const parsedProducto = Number(productoId)
      const parsedTipoMaterial = Number(tipoMaterialId)
      if (!Number.isFinite(parsedProducto) || parsedProducto <= 0 || !Number.isFinite(parsedTipoMaterial) || parsedTipoMaterial <= 0) {
        setError('Producto y Tipo Material son obligatorios.')
        return
      }
      if (!needsSerie && (!Number.isFinite(cantidadNum) || cantidadNum <= 0)) {
        setError('La cantidad debe ser mayor a 0.')
        return
      }
      if (!needsSerie && !cantidadPermiteDecimales && !Number.isInteger(cantidadNum)) {
        setError('Cantidad: el producto no permite decimales.')
        return
      }
      if (needsSerie) {
        setCantidad('1')
      }
      const serieTrim = serie.trim()
      const chipTrim = chipId.trim()
      if (needsSerie && !seriePermiteEspacios && /\s/.test(serie)) {
        setError('Serie con espacios no permitidos.')
        return
      }
      if (requiresChipByTipo && !shouldSkipChipField && !chipPermiteEspacios && /\s/.test(chipId)) {
        setError(null)
        setChipValidationError('ChipID con espacios no permitidos.')
        return
      }
      if (needsSerie && serieMask && !isMaskComplete(serieTrim, serieMask)) {
        setError(`La serie debe completar la mascara ${serieMask}.`)
        return
      }
      if (requiresChipByTipo && !shouldSkipChipField && chipIdMask && !isMaskComplete(chipTrim, chipIdMask)) {
        setError(null)
        setChipValidationError(`El ChipID debe completar la mascara ${chipIdMask}.`)
        return
      }
      if (needsSerie && !serieTrim) {
        setError('Debes ingresar la Serie del producto.')
        return
      }
      if (isRetiredMaterial && requiresChipByTipo && !shouldSkipChipField && !chipTrim) {
        setError(null)
        setChipValidationError('Debes ingresar el ChipID del producto retirado.')
        return
      }
      if (!requiresChipByTipo && !allowManualChipId && chipTrim) {
        setError(null)
        setChipValidationError('Este producto no maneja ChipID.')
        return
      }
      if (serieTrim && !isRetiredMaterial) {
        try {
          const estadoSerie = await validarEstadoSerieRegistroOt({
            serie: serieTrim,
            chipId: chipTrim,
            idProducto: parsedProducto,
            idTipoMaterial: parsedTipoMaterial,
            idRuta: idRutaValidacion ?? undefined,
          })
          if (!estadoSerie.sePuede) {
            if (!isRetiredMaterial) {
              setError(`${serieTrim} - ${estadoSerie.observacion?.trim() || 'Verificar ChipID.'}`)
              return
            }
          }
        } catch (validationError) {
          console.error('No se pudo validar estado de serie/chip antes de agregar.', validationError)
          setError('No se pudo validar el estado de Serie/ChipID. Intenta nuevamente.')
          return
        }
      }
      const serieValidated = await ensureSerieValidated()
      if (!serieValidated) return
      if ((needsSerie || requiresChipByTipo || allowManualChipId) && chipTrim) {
        const chipUnique = await validateChipUniqueness(chipTrim)
        if (!chipUnique) return
      }
      const duplicate = materialRows.some(
        (row) =>
          (serieTrim && row.serie.toLowerCase() === serieTrim.toLowerCase()) ||
          (chipTrim && row.chipId.toLowerCase() === chipTrim.toLowerCase())
      )
      if (duplicate) {
        setError('La Serie o el ChipID ya fueron agregados.')
        return
      }
      const productoLabel = productoOptions.find((option) => option.value === productoId)?.label ?? productoId
      const tipoMaterialLabel =
        tipoMaterialOptions.find((option) => option.value === tipoMaterialId)?.label ??
        tipoMaterialLabelByIdFallback[parsedTipoMaterial] ??
        tipoMaterialId
      setMaterialRows((prev) => {
        const next = [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            idProducto: parsedProducto,
            producto: productoLabel,
            serie: serieTrim,
            chipId: chipTrim,
            cantidad: cantidadNum,
            idTipoMaterial: parsedTipoMaterial,
            tipoMaterialLabel,
            entregado,
            requiresChip: requiresChipByTipo && !shouldSkipChipField,
          },
        ]
        return syncKitDecodificadorRows(next, {
          idProductoRecienAgregado: parsedProducto,
          idTipoMaterial: parsedTipoMaterial,
          tipoMaterialLabel,
          entregado,
        })
      })
      resetMaterialForm()
    } finally {
      setIsAddingMaterial(false)
    }
  }

  const resetCargoUsuarioForm = () => {
    setCargoUsuarioProductoId('')
    setCargoUsuarioProductoSearch('')
    setCargoUsuarioProductoBloqueado(false)
    setCargoUsuarioSerie('')
    setCargoUsuarioChipId('')
    setCargoUsuarioCantidad('1')
    setCargoUsuarioTieneSerie(true)
    setCargoUsuarioTieneChipId(true)
    setCargoUsuarioSerieBloqueada(false)
    setCargoUsuarioChipBloqueado(false)
    cargoUsuarioChipAutoRef.current = false
    setCargoUsuarioSerieError(null)
    setCargoUsuarioChipError(null)
  }

  const validarCargoUsuarioExistencia = useCallback(
    async (serieValue: string, chipValue: string): Promise<string> => {
      const serieTrim = serieValue.trim()
      const chipTrim = chipValue.trim()
      const tipoCodigo = serieTrim ? 0 : 1
      const rows = await buscarSerialCargoUsuario({
        serial: serieTrim,
        chipId: chipTrim,
        tipoCodigo,
      })
      return rows.length > 0 ? 'Si' : 'No'
    },
    []
  )

  const validarCargoUsuarioEstadoPorProc = async (
    codigoValue: string,
    tipoCodigo: 0 | 1,
    serieForChipValue?: string
  ): Promise<{ existe: boolean; permitido: boolean; observacion?: string }> => {
      const codigoTrim = codigoValue.trim()
      if (!codigoTrim) return { existe: false, permitido: true }
      const serieForChipTrim = serieForChipValue?.trim() ?? ''

      const resolverConFallback = async () => {
        const rows = await buscarSerialCargoUsuario({
          serial: tipoCodigo === 0 ? codigoTrim : '',
          chipId: tipoCodigo === 1 ? codigoTrim : '',
          tipoCodigo,
        })
        const fallback = resolverEstadoCargoUsuarioDesdeRows(rows)
        return {
          existe: fallback.existe,
          permitido: fallback.permitido,
          observacion: fallback.observacion,
        }
      }

      let procResult: Awaited<ReturnType<typeof validarCargoUsuarioConProc>>
      try {
        if (tipoCodigo === 1) {
          // WinForms valida chip consultando el mismo proc por codigo;
          // CUNR2 queda como verificacion complementaria para evitar falsos bloqueos.
          procResult = await validarCargoUsuarioConProc(codigoTrim)
          if (serieForChipTrim) {
            try {
              const pairResult = await validarCargoUsuarioConProcCunr2(serieForChipTrim, codigoTrim)
              if (pairResult.endpointMissing !== true) {
                if (pairResult.sePuede) {
                  procResult = pairResult
                } else if (!procResult.sePuede) {
                  procResult = pairResult
                }
              }
            } catch (pairError) {
              const pairStatus = axios.isAxiosError(pairError) ? pairError.response?.status : undefined
              if (pairStatus && pairStatus !== 404 && pairStatus !== 500) {
                throw pairError
              }
            }
          }
        } else {
          procResult = await validarCargoUsuarioConProc(codigoTrim)
        }
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        if (status === 500) {
          const procName = tipoCodigo === 1 ? 'spx_TraerDatoSerieChipIdCU_CUNR2' : 'spx_TraerDatoSerieChipIdCU'
          console.warn(`Fallo validacion por ${procName}; usando fallback de busqueda cargo usuario.`, {
            codigo: codigoTrim,
            tipoCodigo,
            serie: serieForChipTrim || undefined,
          })
          return resolverConFallback()
        }
        throw error
      }

      if (procResult.endpointMissing) {
        return resolverConFallback()
      }

      const selectedProducto = Number(cargoUsuarioProductoId)
      if (
        procResult.existe &&
        procResult.idProducto &&
        Number.isFinite(selectedProducto) &&
        selectedProducto > 0 &&
        procResult.idProducto !== selectedProducto
      ) {
        return {
          existe: true,
          permitido: false,
          observacion: `El dato pertenece a otro producto (ID ${procResult.idProducto}).`,
        }
      }

      return {
        existe: procResult.existe,
        permitido: procResult.sePuede,
        observacion: procResult.observacion,
      }
  }

  const resolverEstadoCargoUsuarioDesdeRows = useCallback(
    (rows: CatalogItem[]): { existe: boolean; permitido: boolean; observacion?: string; chipId?: string } => {
      if (rows.length === 0) return { existe: false, permitido: true }

      const selectedProducto = Number(cargoUsuarioProductoId)
      const rowsCandidatas = rows.filter((item) => {
        const idProductoRow = readNumber(item, ['idProducto', 'Id_Producto', 'id_producto', 'IdProducto', 'productoId', 'ProductoId'])
        return Number.isFinite(selectedProducto) && selectedProducto > 0 ? idProductoRow === selectedProducto : true
      })
      const pool = rowsCandidatas.length > 0 ? rowsCandidatas : rows
      const matchedRow = pool[0]
      const normalizeDecision = (value: string): string =>
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')

      const parseExiste = (item: CatalogItem): boolean | null => {
        const raw = readValue(item, ['Existe', 'existe', 'ResultadoExiste', 'ExisteProducto', 'ExisteRegistro'])
        if (raw === undefined || raw === null || raw === '') return null
        if (typeof raw === 'boolean') return raw
        if (typeof raw === 'number') return raw !== 0
        if (typeof raw === 'string') {
          const normalized = normalizeDecision(raw)
          if (normalized.includes('noexiste')) return false
          if (normalized.includes('existe')) return true
          if (['0', 'false', 'no'].includes(normalized)) return false
          if (['1', 'true', 'si'].includes(normalized)) return true
        }
        return null
      }

      const parseSePuede = (item: CatalogItem): boolean | null => {
        const raw = readValue(item, [
          'SePuede',
          'sePuede',
          'Se Puede',
          'SePuedeRegistrar',
          'Resultado',
          'resultado',
          'Respuesta',
          'respuesta',
        ])
        if (raw === undefined || raw === null || raw === '') return null
        if (typeof raw === 'boolean') return raw
        if (typeof raw === 'number') return raw !== 0
        if (typeof raw === 'string') {
          const normalized = normalizeDecision(raw)
          if (!normalized) return null
          if (
            normalized.includes('nosepuede') ||
            normalized.includes('nosepuederegistrar') ||
            normalized.includes('inhabilitado') ||
            ['false', '0', 'no'].includes(normalized)
          ) {
            return false
          }
          if (
            normalized.includes('sepuede') ||
            normalized.includes('sepuederegistrar') ||
            ['true', '1', 'si', 'ok', 'habilitado'].includes(normalized)
          ) {
            return true
          }
        }
        return null
      }

      let permitido = true
      let observacion = ''

      for (const item of pool) {
        const observacionRow = readString(item, ['Observacion', 'observacion', 'Mensaje', 'mensaje', 'Detalle', 'detalle'])
        const observacionNormalized = normalizeDecision(observacionRow)

        if (
          observacionNormalized.includes('noestahabilitado') ||
          observacionNormalized.includes('productoinhabilitado') ||
          observacionNormalized.includes('nosepuederegistrar')
        ) {
          permitido = false
          observacion = observacionRow
          break
        }

        const sePuede = parseSePuede(item)
        if (sePuede === false) {
          permitido = false
          observacion = observacionRow
          break
        }
      }

      const existeMarcado = pool.map(parseExiste).find((value): value is boolean => value !== null)
      const existe = existeMarcado ?? true

      return {
        existe,
        permitido: existe ? permitido : true,
        observacion: observacion || undefined,
        chipId: readString(matchedRow, ['chipId', 'ChipId', 'ChipID', 'chipid']) || undefined,
      }
    },
    [cargoUsuarioProductoId]
  )

  const buscarCargoUsuarioPorSerie = useCallback(
    async (serieValue: string): Promise<{ existe: boolean; permitido: boolean; observacion?: string; chipId?: string }> => {
      const serieTrim = serieValue.trim()
      if (!serieTrim) return { existe: false, permitido: true }

      const rows = await buscarSerialCargoUsuario({
        serial: serieTrim,
        chipId: '',
        tipoCodigo: 0,
      })

      const resolved = resolverEstadoCargoUsuarioDesdeRows(rows)
      if (resolved.chipId) return resolved

      try {
        const chipFromSerie = await fetchChipIdBySerie(serieTrim)
        if (chipFromSerie.chipId) {
          return {
            ...resolved,
            existe: true,
            chipId: chipFromSerie.chipId,
          }
        }
      } catch (error) {
        console.warn('No se pudo obtener chipId por serie en cargo usuario.', error)
      }

      return resolved
    },
    [resolverEstadoCargoUsuarioDesdeRows]
  )

  const validarCargoUsuarioEstadoPermitido = useCallback(
    async (serieValue: string, chipValue: string): Promise<{ permitido: boolean; observacion?: string }> => {
      const serieTrim = serieValue.trim()
      const chipTrim = chipValue.trim()

      if (!serieTrim && !chipTrim) {
        return { permitido: false, observacion: 'Debes registrar Serie o ChipID.' }
      }

      let bySerieProc: { existe: boolean; permitido: boolean; observacion?: string } | null = null
      let byChipProc: { existe: boolean; permitido: boolean; observacion?: string } | null = null

      if (serieTrim) {
        bySerieProc = await validarCargoUsuarioEstadoPorProc(serieTrim, 0)
      }

      if (chipTrim) {
        byChipProc = await validarCargoUsuarioEstadoPorProc(chipTrim, 1, serieTrim)
      }

      if (chipTrim && byChipProc?.permitido) {
        return { permitido: true }
      }

      if (serieTrim && !chipTrim) {
        return {
          permitido: bySerieProc?.permitido ?? true,
          observacion: bySerieProc?.observacion,
        }
      }

      if (chipTrim && !serieTrim) {
        return {
          permitido: byChipProc?.permitido ?? true,
          observacion: byChipProc?.observacion,
        }
      }

      if ((bySerieProc?.permitido ?? false) || (byChipProc?.permitido ?? false)) {
        return { permitido: true }
      }

      return {
        permitido: false,
        observacion: byChipProc?.observacion || bySerieProc?.observacion,
      }
    },
    [validarCargoUsuarioEstadoPorProc]
  )

  useEffect(() => {
    if (!cargoUsuarioProductoId) return
    requestAnimationFrame(() => {
      if (cargoUsuarioActiveSerie && !cargoUsuarioSerieBloqueada) {
        cargoUsuarioSerieRef.current?.focus()
        cargoUsuarioSerieRef.current?.select()
        return
      }
      if (cargoUsuarioActiveChip && !cargoUsuarioChipBloqueado) {
        cargoUsuarioChipRef.current?.focus()
        cargoUsuarioChipRef.current?.select()
        return
      }
      cargoUsuarioCantidadRef.current?.focus()
      cargoUsuarioCantidadRef.current?.select()
    })
  }, [cargoUsuarioActiveChip, cargoUsuarioActiveSerie, cargoUsuarioChipBloqueado, cargoUsuarioProductoId, cargoUsuarioSerieBloqueada])

  const handleCargoUsuarioSerieToggle = (checked: boolean) => {
    setCargoUsuarioGuardado(false)
    setCargoUsuarioTieneSerie(checked)
    setCargoUsuarioSerieError(null)
    setCargoUsuarioSerieBloqueada(false)
    if (!checked) {
      setCargoUsuarioSerie('')
      if (cargoUsuarioNeedsChip) {
        setCargoUsuarioTieneChipId(false)
        setCargoUsuarioChipId('')
        setCargoUsuarioChipError(null)
        setCargoUsuarioChipBloqueado(false)
      }
    }
  }

  const handleCargoUsuarioChipToggle = (checked: boolean) => {
    if (!cargoUsuarioChipGateBySerie) {
      return
    }
    setCargoUsuarioGuardado(false)
    setCargoUsuarioTieneChipId(checked)
    setCargoUsuarioChipError(null)
    setCargoUsuarioChipBloqueado(false)
    cargoUsuarioChipAutoRef.current = false
    if (!checked) {
      setCargoUsuarioChipId('')
      if (cargoUsuarioNeedsSerie) {
        setCargoUsuarioTieneSerie(true)
      }
    }
  }

  const handleCargoUsuarioSerieChange = (rawValue: string) => {
    setCargoUsuarioGuardado(false)
    const nextValue = cargoUsuarioNeedsSerie ? applyMask(rawValue, cargoUsuarioSerieMask) : rawValue
    setCargoUsuarioSerie(nextValue)
    setCargoUsuarioSerieError(null)
    setCargoUsuarioSerieBloqueada(false)
    cargoUsuarioChipAutoRef.current = false
    if (cargoUsuarioNeedsSerie && cargoUsuarioNeedsChip) {
      setCargoUsuarioTieneChipId(false)
      setCargoUsuarioChipId('')
      setCargoUsuarioChipError(null)
      setCargoUsuarioChipBloqueado(false)
    } else if (cargoUsuarioActiveChip) {
      setCargoUsuarioChipBloqueado(false)
    }
  }

  const handleCargoUsuarioChipChange = (rawValue: string) => {
    setCargoUsuarioGuardado(false)
    const nextValue = cargoUsuarioNeedsChip ? applyMask(rawValue, cargoUsuarioChipMask) : rawValue
    setCargoUsuarioChipId(nextValue)
    setCargoUsuarioChipError(null)
    setCargoUsuarioChipBloqueado(false)
    cargoUsuarioChipAutoRef.current = false
  }

  const advanceCargoUsuarioFromSerie = useCallback(async (): Promise<boolean> => {
    if (!cargoUsuarioNeedsSerie || !cargoUsuarioTieneSerie) {
      if (cargoUsuarioActiveChip) {
        cargoUsuarioChipRef.current?.focus()
        cargoUsuarioChipRef.current?.select()
        return true
      }
      cargoUsuarioCantidadRef.current?.focus()
      cargoUsuarioCantidadRef.current?.select()
      return true
    }

    const trimmed = cargoUsuarioSerie.trim()
    if (!trimmed) {
      setCargoUsuarioSerieError('Debes ingresar la Serie.')
      setCargoUsuarioSerieBloqueada(false)
      if (cargoUsuarioNeedsChip) {
        setCargoUsuarioTieneChipId(false)
        setCargoUsuarioChipId('')
        setCargoUsuarioChipError(null)
        setCargoUsuarioChipBloqueado(false)
      }
      cargoUsuarioSerieRef.current?.focus()
      cargoUsuarioSerieRef.current?.select()
      return false
    }

    if (!cargoUsuarioSerieDigitsComplete) {
      setCargoUsuarioSerieError(
        cargoUsuarioSerieMask
          ? `La serie debe completar la mascara ${cargoUsuarioSerieMask}.`
          : `La serie debe completar ${cargoUsuarioSerieDigitsNeeded} digitos.`
      )
      setCargoUsuarioSerieBloqueada(false)
      if (cargoUsuarioNeedsChip) {
        setCargoUsuarioTieneChipId(false)
        setCargoUsuarioChipId('')
        setCargoUsuarioChipError(null)
        setCargoUsuarioChipBloqueado(false)
      }
      cargoUsuarioSerieRef.current?.focus()
      cargoUsuarioSerieRef.current?.select()
      return false
    }

    setCargoUsuarioSerieError(null)
    setCargoUsuarioSerieBloqueada(true)
    setCargoUsuarioTieneSerie(true)

    if (cargoUsuarioNeedsChip) {
      setCargoUsuarioTieneChipId(true)
      try {
        const found = await buscarCargoUsuarioPorSerie(trimmed)
        if (found.existe) {
          if (found.chipId) {
            const formattedChip = cargoUsuarioChipMask ? applyMask(found.chipId, cargoUsuarioChipMask) : found.chipId
            cargoUsuarioChipAutoRef.current = true
            setCargoUsuarioChipId(formattedChip)
            setCargoUsuarioChipError(null)
            setCargoUsuarioChipBloqueado(true)
            cargoUsuarioCantidadRef.current?.focus()
            cargoUsuarioCantidadRef.current?.select()
            return true
          }

          cargoUsuarioChipAutoRef.current = false
          setCargoUsuarioChipId('')
          setCargoUsuarioChipBloqueado(true)
          setCargoUsuarioChipError('La serie existe, pero no devolvio ChipID desde base de datos.')
          setCargoUsuarioSerieBloqueada(false)
          setCargoUsuarioSerieError('No se encontro ChipID para la serie en base de datos.')
          cargoUsuarioSerieRef.current?.focus()
          cargoUsuarioSerieRef.current?.select()
          return false
        }
      } catch (error) {
        cargoUsuarioChipAutoRef.current = false
        console.warn('No se pudo buscar chipId de cargo usuario por serie.', error)
        setCargoUsuarioSerieError('No se pudo validar la serie para cargo usuario. Intenta nuevamente.')
        setCargoUsuarioSerieBloqueada(false)
        setCargoUsuarioTieneChipId(false)
        setCargoUsuarioChipId('')
        setCargoUsuarioChipError(null)
        setCargoUsuarioChipBloqueado(false)
        cargoUsuarioSerieRef.current?.focus()
        cargoUsuarioSerieRef.current?.select()
        return false
      }

      cargoUsuarioChipAutoRef.current = false
      setCargoUsuarioChipBloqueado(false)
      cargoUsuarioChipRef.current?.focus()
      cargoUsuarioChipRef.current?.select()
      return true
    }

    try {
      const estadoSerie = await validarCargoUsuarioEstadoPermitido(trimmed, '')
      if (!estadoSerie.permitido) {
        setCargoUsuarioSerieError(estadoSerie.observacion?.trim() || 'El producto tiene un estado no permitido para cargo usuario.')
        setCargoUsuarioSerieBloqueada(false)
        if (cargoUsuarioNeedsChip) {
          setCargoUsuarioTieneChipId(false)
          setCargoUsuarioChipId('')
          setCargoUsuarioChipError(null)
          setCargoUsuarioChipBloqueado(false)
        }
        cargoUsuarioSerieRef.current?.focus()
        cargoUsuarioSerieRef.current?.select()
        return false
      }
    } catch (validationError) {
      console.warn('No se pudo validar estado permitido por proc en cargo usuario.', validationError)
      setCargoUsuarioSerieError('No se pudo validar la serie para cargo usuario. Intenta nuevamente.')
      setCargoUsuarioSerieBloqueada(false)
      if (cargoUsuarioNeedsChip) {
        setCargoUsuarioTieneChipId(false)
        setCargoUsuarioChipId('')
        setCargoUsuarioChipError(null)
        setCargoUsuarioChipBloqueado(false)
      }
      cargoUsuarioSerieRef.current?.focus()
      cargoUsuarioSerieRef.current?.select()
      return false
    }

    cargoUsuarioCantidadRef.current?.focus()
    cargoUsuarioCantidadRef.current?.select()
    return true
  }, [
    buscarCargoUsuarioPorSerie,
    cargoUsuarioChipMask,
    cargoUsuarioNeedsSerie,
    cargoUsuarioNeedsChip,
    cargoUsuarioSerie,
    cargoUsuarioSerieDigitsComplete,
    cargoUsuarioSerieDigitsNeeded,
    cargoUsuarioSerieMask,
    cargoUsuarioTieneSerie,
    validarCargoUsuarioEstadoPermitido,
  ])

  useEffect(() => {
    if (cargoUsuarioChipGateBySerie) return
    if (!cargoUsuarioTieneChipId && !cargoUsuarioChipId && !cargoUsuarioChipError && !cargoUsuarioChipBloqueado) return
    setCargoUsuarioTieneChipId(false)
    setCargoUsuarioChipId('')
    setCargoUsuarioChipError(null)
    setCargoUsuarioChipBloqueado(false)
    cargoUsuarioChipAutoRef.current = false
  }, [
    cargoUsuarioChipBloqueado,
    cargoUsuarioChipError,
    cargoUsuarioChipGateBySerie,
    cargoUsuarioChipId,
    cargoUsuarioTieneChipId,
  ])

  const advanceCargoUsuarioFromChip = useCallback(async (): Promise<boolean> => {
    if (!cargoUsuarioNeedsChip || !cargoUsuarioTieneChipId) {
      cargoUsuarioCantidadRef.current?.focus()
      cargoUsuarioCantidadRef.current?.select()
      return true
    }

    if (cargoUsuarioChipAutoRef.current) {
      setCargoUsuarioChipError(null)
      setCargoUsuarioChipBloqueado(true)
      cargoUsuarioCantidadRef.current?.focus()
      cargoUsuarioCantidadRef.current?.select()
      return true
    }

    if (cargoUsuarioChipBloqueado) {
      // Si el chip ya viene autocompletado desde BD y bloqueado, no revalidar como ingreso manual.
      setCargoUsuarioChipError(null)
      cargoUsuarioCantidadRef.current?.focus()
      cargoUsuarioCantidadRef.current?.select()
      return true
    }

    const trimmed = cargoUsuarioChipId.trim()
    if (!trimmed) {
      setCargoUsuarioChipError('Debes ingresar el ChipID.')
      cargoUsuarioChipRef.current?.focus()
      cargoUsuarioChipRef.current?.select()
      return false
    }

    if (!cargoUsuarioChipDigitsComplete) {
      setCargoUsuarioChipError(
        cargoUsuarioChipMask
          ? `El ChipID debe completar la mascara ${cargoUsuarioChipMask}.`
          : `El ChipID debe completar ${cargoUsuarioChipDigitsNeeded} digitos.`
      )
      cargoUsuarioChipRef.current?.focus()
      cargoUsuarioChipRef.current?.select()
      return false
    }

    try {
      const estado = await validarCargoUsuarioEstadoPermitido(cargoUsuarioSerie.trim(), trimmed)
      if (!estado.permitido) {
        setCargoUsuarioChipError(estado.observacion?.trim() || 'El producto tiene un estado no permitido para cargo usuario.')
        cargoUsuarioChipRef.current?.focus()
        cargoUsuarioChipRef.current?.select()
        return false
      }
    } catch (validationError) {
      console.warn('No se pudo validar estado permitido de cargo usuario.', validationError)
      setCargoUsuarioChipError('No se pudo validar el estado del ChipID. Intenta nuevamente.')
      cargoUsuarioChipRef.current?.focus()
      cargoUsuarioChipRef.current?.select()
      return false
    }

    setCargoUsuarioChipError(null)
    setCargoUsuarioChipBloqueado(true)
    cargoUsuarioCantidadRef.current?.focus()
    cargoUsuarioCantidadRef.current?.select()
    return true
  }, [
    cargoUsuarioChipDigitsComplete,
    cargoUsuarioChipId,
    cargoUsuarioChipDigitsNeeded,
    cargoUsuarioChipMask,
    cargoUsuarioNeedsChip,
    cargoUsuarioSerie,
    cargoUsuarioTieneChipId,
    cargoUsuarioChipBloqueado,
    validarCargoUsuarioEstadoPermitido,
  ])

  const handleCargoUsuarioSerieKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return
    event.preventDefault()
    void advanceCargoUsuarioFromSerie()
  }

  const handleCargoUsuarioSerieBlur = (): void => {
    void advanceCargoUsuarioFromSerie()
  }

  const handleCargoUsuarioChipKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return
    event.preventDefault()
    void advanceCargoUsuarioFromChip()
  }

  const handleCargoUsuarioChipBlur = (): void => {
    void advanceCargoUsuarioFromChip()
  }

  const handleCargoUsuarioCantidadKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Tab' && event.key !== 'Enter') return
    event.preventDefault()
    if (cargoUsuarioCanAdd) {
      void addCargoUsuario()
    }
  }

  const addCargoUsuario = async () => {
    if (cargoUsuarioAddingRef.current) return
    cargoUsuarioAddingRef.current = true
    setIsAddingCargoUsuario(true)
    try {
      setCargoUsuarioError(null)
    setCargoUsuarioSuccess(null)

    const parsedProducto = Number(cargoUsuarioProductoId)
    if (!Number.isFinite(parsedProducto) || parsedProducto <= 0) {
      setCargoUsuarioError('Producto es requerido.')
      return
    }

    const serieTrim = cargoUsuarioSerie.trim()
    const chipTrim = cargoUsuarioChipId.trim()
    const cantidadNum = Number(cargoUsuarioCantidad)
    const productoRequiereIdentificacion =
      Boolean(cargoUsuarioSelectedMeta?.esSerializado) || cargoUsuarioNeedsSerie || cargoUsuarioNeedsChip
    const existeHabilitado = productoRequiereIdentificacion
    const activeSerie = cargoUsuarioActiveSerie
    const activeChip = cargoUsuarioActiveChip
    const serieLista = activeSerie && Boolean(serieTrim) && cargoUsuarioSerieDigitsComplete
    const chipLista = activeChip && Boolean(chipTrim) && cargoUsuarioChipDigitsComplete
    const seriePayload = serieLista ? serieTrim : ''
    const chipPayload = chipLista ? chipTrim : ''

    if (!productoRequiereIdentificacion) {
      if (!cargoUsuarioCantidadValid) {
        setCargoUsuarioError('La cantidad debe ser mayor a 0.')
        return
      }
    } else {
      if (!activeSerie && !activeChip) {
        setCargoUsuarioError('Debes habilitar Serie o ChipID para un producto serializado.')
        return
      }
      if (!serieLista && !chipLista) {
        if (activeSerie && !cargoUsuarioSerieDigitsComplete) {
          setCargoUsuarioSerieError(
            cargoUsuarioSerieMask
              ? `La serie debe completar la mascara ${cargoUsuarioSerieMask}.`
              : `La serie debe completar ${cargoUsuarioSerieDigitsNeeded} digitos.`
          )
        }
        if (activeChip && !cargoUsuarioChipDigitsComplete) {
          setCargoUsuarioChipError(
            cargoUsuarioChipMask
              ? `El ChipID debe completar la mascara ${cargoUsuarioChipMask}.`
              : `El ChipID debe completar ${cargoUsuarioChipDigitsNeeded} digitos.`
          )
        }
        setCargoUsuarioError('Completa al menos Serie o ChipID para agregar.')
        return
      }
    }

    if (!cargoUsuarioCanAdd) {
      if (cargoUsuarioActiveSerie && !cargoUsuarioSerieBloqueada) {
        setCargoUsuarioError('Completa y valida la Serie antes de agregar.')
        cargoUsuarioSerieRef.current?.focus()
        cargoUsuarioSerieRef.current?.select()
        return
      }
      if (cargoUsuarioActiveChip && !cargoUsuarioChipBloqueado) {
        setCargoUsuarioError('Completa y valida el ChipID antes de agregar.')
        cargoUsuarioChipRef.current?.focus()
        cargoUsuarioChipRef.current?.select()
        return
      }
      setCargoUsuarioError('Completa los datos requeridos antes de agregar.')
      return
    }

    const duplicate = [...cargoUsuarioRows, ...materialRows].some(
      (row) =>
        (seriePayload && row.serie.toLowerCase() === seriePayload.toLowerCase()) ||
        (chipPayload && row.chipId.toLowerCase() === chipPayload.toLowerCase())
    )
    if (duplicate) {
      setCargoUsuarioError('La Serie o el ChipID ya fueron agregados.')
      return
    }

    if (seriePayload || chipPayload) {
      try {
        const estado = await validarCargoUsuarioEstadoPermitido(seriePayload, chipPayload)
        if (!estado.permitido) {
          const message = estado.observacion?.trim() || 'El producto tiene un estado no permitido para cargo usuario.'
          setCargoUsuarioError(message)
          if (seriePayload) {
            setCargoUsuarioSerieError(message)
            cargoUsuarioSerieRef.current?.focus()
            cargoUsuarioSerieRef.current?.select()
          } else if (chipPayload) {
            setCargoUsuarioChipError(message)
            cargoUsuarioChipRef.current?.focus()
            cargoUsuarioChipRef.current?.select()
          }
          return
        }
      } catch (validationError) {
        console.warn('No se pudo validar estado permitido en cargo usuario.', validationError)
        setCargoUsuarioError('No se pudo validar el estado del producto de cargo usuario. Intenta nuevamente.')
        return
      }
    }

    const productoLabel = cargoUsuarioProductoOptions.find((option) => option.value === cargoUsuarioProductoId)?.label ?? cargoUsuarioProductoId
    let existeTrim = 'No'
    if (existeHabilitado) {
      try {
        existeTrim = await validarCargoUsuarioExistencia(seriePayload, chipPayload)
      } catch (error) {
        console.warn('No se pudo validar existencia de cargo usuario.', error)
        existeTrim = 'No'
      }
    }

    setCargoUsuarioGuardado(false)
    setCargoUsuarioRows((prev) => {
      const duplicateInCurrentRows = [...prev, ...materialRows].some(
        (row) =>
          (seriePayload && row.serie.toLowerCase() === seriePayload.toLowerCase()) ||
          (chipPayload && row.chipId.toLowerCase() === chipPayload.toLowerCase())
      )
      if (duplicateInCurrentRows) {
        setCargoUsuarioError('La Serie o el ChipID ya fueron agregados.')
        return prev
      }
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          idProducto: parsedProducto,
          producto: productoLabel,
          serie: seriePayload,
          chipId: chipPayload,
          cantidad: cantidadNum,
          existe: existeTrim,
        },
      ]
    })
      resetCargoUsuarioForm()
    } finally {
      cargoUsuarioAddingRef.current = false
      setIsAddingCargoUsuario(false)
    }
  }

  const showSaldoPopup = useCallback(
    (popup: { kind: 'success' | 'warning' | 'error'; title: string; message: string }) => {
      if (saldoPopupTimeoutRef.current !== null) {
        window.clearTimeout(saldoPopupTimeoutRef.current)
      }
      setSaldoPopup(popup)
      saldoPopupTimeoutRef.current = window.setTimeout(() => {
        setSaldoPopup(null)
        saldoPopupTimeoutRef.current = null
      }, 3000)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (saldoPopupTimeoutRef.current !== null) {
        window.clearTimeout(saldoPopupTimeoutRef.current)
      }
    }
  }, [])

  const collectSaldoRutaPreview = useCallback(async (): Promise<SaldoPreviewRow[]> => {
    if (!idRutaValidacion || idRutaValidacion <= 0) {
      return []
    }
      const saldoRows = await fetchSaldoRuta({ idRuta: idRutaValidacion, fecha: fechaTrabajo, idSucursal: resolvedIdSucursal ?? undefined })
    const saldoMap = new Map<number, number>()

    saldoRows.forEach((row) => {
      const idProducto = parseSaldoProductoId(row)
      const saldoDisponible = parseSaldoValue(row)
      if (idProducto === null || saldoDisponible === null) return
      const current = saldoMap.get(idProducto) ?? 0
      saldoMap.set(idProducto, current + saldoDisponible)
    })

    const requestedByProduct = new Map<number, { producto: string; cantidad: number }>()
    materialRows.forEach((row) => {
      // En legado solo se valida saldo para materiales instalados.
      if (isRetiredMaterialRow(row)) return
      const current = requestedByProduct.get(row.idProducto)
      if (current) {
        current.cantidad += row.cantidad
        return
      }
      requestedByProduct.set(row.idProducto, {
        producto: row.producto,
        cantidad: row.cantidad,
      })
    })

    return Array.from(requestedByProduct.entries())
      .map(([idProducto, value]) => {
        const disponible = saldoMap.get(idProducto) ?? 0
        const saldo = disponible - value.cantidad
        return {
          idProducto,
          producto: value.producto,
          disponible,
          registrado: value.cantidad,
          saldo,
        }
      })
      .sort((a, b) => a.saldo - b.saldo || a.producto.localeCompare(b.producto))
  }, [fechaTrabajo, idRutaValidacion, materialRows, resolvedIdSucursal])

  const validateSaldoRutaDisponible = useCallback(async (): Promise<boolean> => {
    try {
      const previewRows = await collectSaldoRutaPreview()

      const deficits = previewRows.filter((row) => row.saldo < 0)
      if (deficits.length > 0) {
        const detalle = deficits
          .map((item) => {
            const nombre = item.producto || 'Producto'
            return `${nombre}: disponible ${formatSaldoAmount(item.disponible)}, registrado ${formatSaldoAmount(item.registrado)}`
          })
          .join(' | ')
        showSaldoPopup({
          kind: 'warning',
          title: 'Saldo insuficiente',
          message: detalle,
        })
        setError(`No se puede guardar porque el saldo quedaria negativo. ${detalle}.`)
        return false
      }

      if (previewRows.length > 0) {
        showSaldoPopup({
          kind: 'success',
          title: 'Saldo validado',
          message: `${previewRows.length} producto(s) revisado(s) antes de guardar.`,
        })
      }

      return true
    } catch (err) {
      console.error('No se pudo validar el saldo de la ruta.', err)
      showSaldoPopup({
        kind: 'error',
        title: 'Saldo no disponible',
        message: 'No se pudo validar el saldo de la ruta.',
      })
      setError(readBackendErrorMessage(err, 'No se pudo validar el saldo de la ruta antes del registro.'))
      return false
    }
  }, [collectSaldoRutaPreview, showSaldoPopup])

  const runPrevalidations = async (): Promise<boolean> => {
    if (!idRutaValidacion || idRutaValidacion <= 0) {
      setError('No se pudo resolver la ruta para validar cierre y cuadre.')
      return false
    }
    if (!resolvedIdSucursal || resolvedIdSucursal <= 0) {
      setError('Sesion vencida o sucursal no disponible. Vuelve a iniciar sesion para continuar.')
      return false
    }
    setIsPrevalidating(true)
    try {
      if (isOrdenPasadaMaterial) {
        const saldoValido = await validateSaldoRutaDisponible()
        if (!saldoValido) return false
        return true
      }
      const [cierreAgenda, hasCuadreRuta] = await Promise.all([
        validateExisteCierreAlmacen({ fecha: fechaTrabajo, idSucursal: resolvedIdSucursal }),
        validateCuadreRuta({ idRuta: idRutaValidacion, fecha: fechaTrabajo, idSucursal: resolvedIdSucursal }),
      ])
      if (cierreAgenda.bloqueado) {
        setError(cierreAgenda.mensaje || 'No se puede registrar el detalle porque existe cierre de almacen.')
        return false
      }
      if (hasCuadreRuta) {
        setError('No se puede registrar el detalle porque la ruta ya realizo cuadre.')
        return false
      }
      const saldoValido = await validateSaldoRutaDisponible()
      if (!saldoValido) return false
      return true
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(readBackendErrorMessage(err, 'No se pudo validar cierre/cuadre antes del registro.'))
      } else {
        setError('No se pudo validar cierre/cuadre antes del registro.')
      }
      return false
    } finally {
      setIsPrevalidating(false)
    }
  }

  const prevalidateMaterialRowsBeforeSubmit = useCallback(async (): Promise<boolean> => {
    if (materialRows.length === 0) return true
    retiredRowsWithoutSaldoPairRef.current.clear()

    for (let index = 0; index < materialRows.length; index += 1) {
      const row = materialRows[index]
      const serieTrim = row.serie.trim()
      const chipTrim = row.chipId.trim()
      const rowLabel = `Fila ${index + 1} (${row.producto || `Producto ${row.idProducto}`})`
      const rowIsRetired = isRetiredMaterialRow(row)

      if (rowIsRetired) {
        // En retirados mantenemos el comportamiento tolerante de WinForms:
        // no bloquear por validacion previa de estado; el backend define si requiere ajuste,
        // y ante 409 aplicamos fallback automatico en mutationFn.
        continue
      }

      if (serieTrim) {
        try {
          // Replica WinForms (frm_OrdenTrabajoRealizada.Validacion):
          // validarEstadoSerieGuadar -> spx_VerificarEstadoSerie(...)
          const estadoSerie = await validarEstadoSerieRegistroOt({
            serie: serieTrim,
            chipId: chipTrim,
            idProducto: row.idProducto,
            idTipoMaterial: row.idTipoMaterial,
            idRuta: idRutaValidacion ?? undefined,
          })
          if (!estadoSerie.sePuede) {
            setError(`${serieTrim} - ${estadoSerie.observacion?.trim() || 'Verificar ChipID.'}`)
            return false
          }
        } catch (validationError) {
          console.error('No se pudo validar estado de serie/chip de una fila antes de guardar.', validationError)
          setError(`${rowLabel}: No se pudo validar estado de Serie/ChipID.`)
          return false
        }
      }
    }

    return true
  }, [idRutaValidacion, materialRows, validarEstadoSerieRegistroOt])

  const prevalidateCargoUsuarioRowsBeforeSubmit = useCallback(async (): Promise<boolean> => {
    if (cargoUsuarioRows.length === 0) return true

    const seenSerie = new Set<string>()
    const seenChip = new Set<string>()
    for (const row of materialRows) {
      const serie = row.serie.trim().toLowerCase()
      const chip = row.chipId.trim().toLowerCase()
      if (serie) seenSerie.add(serie)
      if (chip) seenChip.add(chip)
    }

    for (let index = 0; index < cargoUsuarioRows.length; index += 1) {
      const row = cargoUsuarioRows[index]
      const serieTrim = row.serie.trim()
      const chipTrim = row.chipId.trim()
      const rowLabel = `Fila ${index + 1} (${row.producto || `Producto ${row.idProducto}`})`
      const rowMeta = cargoUsuarioMetaByProductoId.get(row.idProducto)
      const rowRequiereIdentificacion =
        Boolean(rowMeta?.esSerializado) ||
        (rowMeta?.digitosImei ?? 0) > 0 ||
        (rowMeta?.digitosChipId ?? 0) > 0

      if (rowRequiereIdentificacion && !serieTrim && !chipTrim) {
        setCargoUsuarioError(`${rowLabel}: Debes registrar Serie o ChipID.`)
        return false
      }

      const serieKey = serieTrim.toLowerCase()
      const chipKey = chipTrim.toLowerCase()
      if (serieKey) {
        if (seenSerie.has(serieKey)) {
          setCargoUsuarioError(`${rowLabel}: La Serie ya fue ingresada en el detalle.`)
          return false
        }
        seenSerie.add(serieKey)
      }
      if (chipKey) {
        if (seenChip.has(chipKey)) {
          setCargoUsuarioError(`${rowLabel}: El ChipID ya fue ingresado en el detalle.`)
          return false
        }
        seenChip.add(chipKey)
      }

      if (serieTrim || chipTrim) {
        try {
          // Validacion informativa contra backend: no bloquea si no existe.
          await validarCargoUsuarioExistencia(serieTrim, chipTrim)
        } catch (validationError) {
          console.warn('No se pudo validar una fila de cargo usuario antes de guardar.', validationError)
        }

        try {
          const estado = await validarCargoUsuarioEstadoPermitido(serieTrim, chipTrim)
          if (!estado.permitido) {
            setCargoUsuarioError(`${rowLabel}: ${estado.observacion?.trim() || 'Estado no permitido para cargo usuario.'}`)
            return false
          }
        } catch (validationError) {
          console.warn('No se pudo validar estado permitido de una fila de cargo usuario.', validationError)
          setCargoUsuarioError(`${rowLabel}: No se pudo validar el estado para cargo usuario.`)
          return false
        }
      }
    }

    return true
  }, [cargoUsuarioMetaByProductoId, cargoUsuarioRows, materialRows, validarCargoUsuarioEstadoPermitido, validarCargoUsuarioExistencia])

  const mutation = useMutation({
    mutationFn: async (payload: {
      numeroOrden: string
      idVenta?: number
      codigoCliente?: number
      fechaEjecucion?: string
      fechaAgenda?: string
      origenPendienteMaterial?: string
      idEstado: number
      observacion: string
      materiales: {
        idProducto: number
        idTipoMaterial: number
        serie: string
        chipId: string
        cantidad: number
        entregado: boolean
        requiresChip: boolean
      }[]
      cargoUsuarioItems: {
        idProducto: number
        serie: string
        chipId: string
        cantidad: number
        existe: string
      }[]
    }) => {
      let idVentaFromDetalle: number | undefined
      let numeroOrdenFromDetalle: number | undefined
      if (payload.materiales.length > 0) {
        const sanitizeMaterialesForApi = (
          rows: {
            idProducto: number
            idTipoMaterial: number
            serie: string
            chipId: string
            cantidad: number
            entregado: boolean
            requiresChip: boolean
          }[]
        ) =>
          rows.map(({ requiresChip: _requiresChip, ...apiRow }) => ({
            ...apiRow,
            entregado: RETIRED_MATERIAL_IDS.has(apiRow.idTipoMaterial) ? false : apiRow.entregado,
          }))
        const buildRetryMateriales = (
          mode: 'clear_chip' | 'clear_serie_chip',
          scope: 'targeted' | 'all',
          hintSerie?: string,
          hintChip?: string
        ) =>
          payload.materiales.map((item) => {
            const isRetiredRow = RETIRED_MATERIAL_IDS.has(item.idTipoMaterial) || item.entregado === false
            if (!isRetiredRow) return item
            const itemSerie = item.serie.trim().toLowerCase()
            const itemChip = item.chipId.trim().toLowerCase()
            const serieTarget = hintSerie?.trim().toLowerCase()
            const chipTarget = hintChip?.trim().toLowerCase()
            const isTargeted =
              scope === 'all' ||
              (serieTarget ? itemSerie === serieTarget : false) ||
              (chipTarget ? itemChip === chipTarget : false)
            if (!isTargeted) return item
            if (mode === 'clear_chip') {
              if (item.requiresChip) return item
              if (!item.serie.trim() || !item.chipId.trim()) return item
              return { ...item, chipId: '' }
            }
            if (item.requiresChip) return item
            if (!item.serie.trim() && !item.chipId.trim()) return item
            return { ...item, serie: '', chipId: '' }
          })
        const shouldRetryWithoutChip = (error: unknown) => {
          if (!axios.isAxiosError(error)) return false
          if (error.response?.status !== 409) return false
          const message = readValidationMessageFromError(error)
          return shouldAllowRetiredValidationFailure(message)
        }
        const runRetry = async (
          mode: 'clear_chip' | 'clear_serie_chip',
          scope: 'targeted' | 'all',
          sourceError: unknown
        ): Promise<{ idVenta?: number; numeroOrden?: number } | null> => {
          const message = readValidationMessageFromError(sourceError)
          const hintSerie = extractSerieFromMessage(message)
          const hintChip = extractChipFromMessage(message)
          const retryMateriales = buildRetryMateriales(mode, scope, hintSerie, hintChip)
          const shouldRetry = retryMateriales.some(
            (row, idx) => row.chipId !== payload.materiales[idx].chipId || row.serie !== payload.materiales[idx].serie
          )
          if (!shouldRetry) return null
          return createOtDetalle({
            numeroOrden: payload.numeroOrden,
            idVenta: payload.idVenta,
            codigoCliente: payload.codigoCliente,
            fechaEjecucion: payload.fechaEjecucion,
            fechaAgenda: payload.fechaAgenda,
            origenPendienteMaterial: payload.origenPendienteMaterial,
            idEstado: payload.idEstado,
            observacion: payload.observacion,
            materiales: sanitizeMaterialesForApi(retryMateriales),
          }, resolvedIdSucursal ?? undefined)
        }
        try {
          const detalleResult = await createOtDetalle({
            numeroOrden: payload.numeroOrden,
            idVenta: payload.idVenta,
            codigoCliente: payload.codigoCliente,
            fechaEjecucion: payload.fechaEjecucion,
            fechaAgenda: payload.fechaAgenda,
            origenPendienteMaterial: payload.origenPendienteMaterial,
            idEstado: payload.idEstado,
            observacion: payload.observacion,
            materiales: sanitizeMaterialesForApi(payload.materiales),
          }, resolvedIdSucursal ?? undefined)
          idVentaFromDetalle = detalleResult.idVenta
          numeroOrdenFromDetalle = detalleResult.numeroOrden
        } catch (error) {
          if (!shouldRetryWithoutChip(error)) throw error

          const retryTargets: Array<{ mode: 'clear_chip' | 'clear_serie_chip'; scope: 'targeted' | 'all' }> = [
            { mode: 'clear_chip', scope: 'targeted' },
            { mode: 'clear_serie_chip', scope: 'targeted' },
            { mode: 'clear_chip', scope: 'all' },
            { mode: 'clear_serie_chip', scope: 'all' },
          ]

          let lastError: unknown = error
          let detalleResult: { idVenta?: number; numeroOrden?: number } | null = null
          for (const retry of retryTargets) {
            try {
              const result = await runRetry(retry.mode, retry.scope, lastError)
              if (!result) continue
              detalleResult = result
              break
            } catch (retryError) {
              if (!shouldRetryWithoutChip(retryError)) throw retryError
              lastError = retryError
            }
          }

          if (!detalleResult) throw lastError

          idVentaFromDetalle = detalleResult.idVenta
          numeroOrdenFromDetalle = detalleResult.numeroOrden
        }
      } else {
        await createOtRealizada({
          numeroOrden: payload.numeroOrden,
          idEstado: payload.idEstado,
          observacion: payload.observacion,
          fechaAgenda: payload.fechaAgenda,
        }, resolvedIdSucursal ?? undefined)
      }

      if (payload.cargoUsuarioItems.length > 0) {
        await createOtCargoUsuario({
          numeroOrden: payload.numeroOrden,
          items: payload.cargoUsuarioItems,
        }, resolvedIdSucursal ?? undefined)
      }

      if (idVentaFromDetalle) {
        return {
          idVenta: idVentaFromDetalle,
          numeroOrden: numeroOrdenFromDetalle ?? Number(payload.numeroOrden),
        }
      }

      const venta = await fetchOtByNumero(payload.numeroOrden, resolvedIdSucursal ?? undefined)
      const idVenta =
        readNumber(venta, [
          'idVenta',
          'IdVenta',
          'Id_Venta',
          'id_venta',
          'idCodigoVenta',
          'IdCodigoVenta',
          'id_codigoventa',
          'Id_CodigoVenta',
          'id',
          'Id',
        ]) ?? undefined
      const numeroOrdenResolved =
        readNumber(venta, ['numeroOrden', 'NumeroOrden', 'ordenTrabajo', 'OrdenTrabajo', 'ot', 'OT']) ?? Number(payload.numeroOrden)
      return { idVenta, numeroOrden: numeroOrdenResolved }
    },
    onSuccess: (data) => {
      setError(null)
      setCargoUsuarioError(null)
      setCargoUsuarioSuccess(null)
      setDetalleGuardado(true)
      setCargoUsuarioGuardado(true)
      setMaterialRows([])
      setCargoUsuarioRows([])
      resetMaterialForm()
      resetCargoUsuarioForm()
      const message = `Registro exitoso. NroTrans.: ${data.idVenta ?? '-'} | OT: ${data.numeroOrden ?? numeroOrden}`
      setSuccess(message)
      setSuccessModalMessage(message)
      setSuccessModalOpen(true)
    },
    onError: (err, variables) => {
      setSuccess(null)
      setSuccessModalOpen(false)
      setSuccessModalMessage('')
      const backendMessage = readBackendErrorMessage(err, 'No se pudo guardar el detalle.')
      setErrorModalMessage(backendMessage)
      setErrorModalOpen(true)
      const onlyCargoUsuarioPayload = variables.materiales.length === 0 && variables.cargoUsuarioItems.length > 0
      if (onlyCargoUsuarioPayload) {
        setCargoUsuarioError(backendMessage)
        return
      }
      if (axios.isAxiosError(err)) {
        setError(backendMessage)
        return
      }
      setError(backendMessage)
    },
  })

  const formInteractionLocked = formLocked || mutation.isPending || isPrevalidating || registroFechaBloqueado || !resolvedIdSucursal

  const filteredSerieSuggestions = useMemo(() => {
    const normalizeSearch = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const term = normalizeSearch(serieSelectorSearch)
    if (!term) return serieSuggestions
    return serieSuggestions.filter((item) => {
      const serial = normalizeSearch(item.serial)
      const chip = normalizeSearch(item.chipId ?? '')
      return serial.includes(term) || chip.includes(term)
    })
  }, [serieSelectorSearch, serieSuggestions])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setError(null)
    setCargoUsuarioError(null)
    if (!resolvedIdSucursal || resolvedIdSucursal <= 0) {
      setError('Sesion vencida o sucursal no disponible. Vuelve a iniciar sesion para continuar.')
      return
    }
    if (registroFechaBloqueado) {
      setError('Registro bloqueado: la fecha de la OT (' + (fechaTrabajo || 'sin fecha') + ') no coincide con la fecha de hoy (' + fechaHoy + ').')
      return
    }
    const parsedEstado = Number(idEstado)
    if (!numeroOrden) {
      setError('No se encontro numero de OT para registrar el detalle.')
      return
    }
    if (!Number.isFinite(parsedEstado) || parsedEstado <= 0) {
      setError('Estado es requerido.')
      return
    }
    if (!isTorSip && materialRows.length === 0 && cargoUsuarioRows.length === 0) {
      setError('Debes agregar al menos un material o un producto en cargo usuario.')
      return
    }
    const canContinue = await runPrevalidations()
    if (!canContinue) return
    const rowsAreValid = await prevalidateMaterialRowsBeforeSubmit()
    if (!rowsAreValid) return
    const cargoRowsAreValid = await prevalidateCargoUsuarioRowsBeforeSubmit()
    if (!cargoRowsAreValid) return
    const materialSummary = buildMaterialSaveSummary(isTorSip ? [] : materialRows)
    const confirmLines = isTorSip
      ? [
          'DATOS A GUARDAR, ESTA SEGURO?',
          `Codigo Cliente: ${clienteVisible || '-'}`,
          'TOR SIP: se guardara la OT sin carga de material.',
        ]
      : [
          'DATOS A GUARDAR, ESTA SEGURO?',
          `Codigo Cliente: ${clienteVisible || '-'}`,
          `Total materiales: ${formatSaldoAmount(materialSummary.total)}`,
          ...materialSummary.lines,
        ]
    const confirmed = window.confirm(confirmLines.join('\n'))
    if (!confirmed) return
    const observacionPayload = normalizeObservacion(observacion)
    mutation.mutate({
      numeroOrden,
      idVenta: idVentaActual,
      codigoCliente: clienteVisible ? Number(clienteVisible.replace(/\D/g, '')) : undefined,
      fechaEjecucion: fechaTrabajo || undefined,
      fechaAgenda: toIsoDateParam(fechaAgenda || todayISO()) || todayISO(),
      origenPendienteMaterial: isOrdenPasadaMaterial ? 'ORDEN_PASADA' : undefined,
      idEstado: parsedEstado,
      observacion: observacionPayload,
      materiales: (isTorSip ? [] : materialRows).map((row) => ({
        idProducto: row.idProducto,
        idTipoMaterial: row.idTipoMaterial,
        serie: row.serie,
        chipId: retiredRowsWithoutSaldoPairRef.current.has(row.id) ? '' : row.chipId,
        cantidad: row.cantidad,
        entregado: isRetiredMaterialRow(row) ? false : row.entregado,
        requiresChip: row.requiresChip,
      })),
      cargoUsuarioItems: (isTorSip ? [] : cargoUsuarioRows).map((row) => ({
        idProducto: row.idProducto,
        serie: row.serie,
        chipId: row.chipId,
        cantidad: row.cantidad,
        existe: row.existe,
      })),
    })
  }

  const headerWarning = useMemo(() => {
    if (!numeroOrden) return 'No se recibio numero de OT desde la grilla.'
    if (ventaQuery.isError) return 'No se pudo obtener la cabecera real de la venta para esta OT.'
    if (registroFechaBloqueado) {
      return 'Registro bloqueado: solo se permite registrar OT del dia. Fecha OT: ' + (fechaTrabajo || 'sin fecha') + ' | Hoy: ' + fechaHoy + '.'
    }
    return null
  }, [fechaHoy, fechaTrabajo, numeroOrden, registroFechaBloqueado, ventaQuery.isError])
  const sessionTimeLabel = useMemo(() => {
    if (sessionRemainingMs === null) return null
    return formatDurationMmSs(sessionRemainingMs)
  }, [sessionRemainingMs])
  const sessionIsNearExpiry = useMemo(() => {
    if (sessionRemainingMs === null) return false
    return sessionRemainingMs <= 10 * 60 * 1000
  }, [sessionRemainingMs])

  return (
    <div className="bento-page ot-realizada-page">
      <div className="px-1">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">RegistrarOrdenAgenda_Detalle</h2>
        <p className="text-sm text-slate-500">Registro de OT y detalle de materiales usados.</p>
        {sessionTimeLabel ? (
          <p className={`mt-1 text-xs ${sessionIsNearExpiry ? 'text-rose-600' : 'text-slate-500'}`}>
            Sesion restante estimada: {sessionTimeLabel}
            {sessionIsNearExpiry ? ' (por vencer, guarda pronto)' : ''}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
        <FormCard title="" hideHeader>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={numeroOrden} disabled />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={clienteVisible} disabled />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Fecha</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={fechaTrabajo} disabled />
            </div>
          </div>
        </FormCard>

        {!isTorSip ? (
          <Tabs
            items={[
              { id: 'materiales', label: 'Materiales' },
              { id: 'cargo-usuario', label: 'Cargo Usuario' },
            ]}
            activeId={activeTab}
            onChange={(id) => {
              if (formInteractionLocked) return
              setActiveTab(id as 'materiales' | 'cargo-usuario')
            }}
          />
        ) : null}

        {!isTorSip && activeTab === 'materiales' ? (
          <fieldset disabled={formInteractionLocked} className="m-0 min-w-0 border-0 p-0">
            <FormCard title="" hideHeader compact>
            {error ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
            ) : null}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
              <div className="min-w-0 md:col-span-1 xl:col-span-1">
                <label className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Tipo Material</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold normal-case tracking-normal text-slate-600">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                      checked={tipoMaterialEditEnabled}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setTipoMaterialEditEnabled(checked)
                        if (checked) {
                          setProductoId('')
                          setProductoBloqueado(false)
                          setSerie('')
                          setChipId('')
                          setSerieSuggestions([])
                          setSerieSelectorOpen(false)
                          setSerieValidationError(null)
                          setChipValidationError(null)
                          setSerieCamposBloqueados(false)
                          setChipCamposBloqueados(true)
                          setAllowManualChipId(false)
                          setChipFromDatabase(false)
                          setChipLockedAfterManualRetired(false)
                          setChipUniquenessState('idle')
                          setCantidad('1')
                          setCantidadBlurConfirmada(false)
                          lastValidatedSerieRef.current = null
                        }
                      }}
                      disabled={!tipoMaterialEditAvailable}
                    />
                    Editar
                  </span>
                </label>
                <select
                  ref={tipoMaterialSelectRef}
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  value={tipoMaterialId}
                  onChange={(event) => {
                    setTipoMaterialId(event.target.value)
                    setProductoId('')
                    setProductoSearch('')
                    setProductoBloqueado(false)
                    setSerie('')
                    setChipId('')
                    setSerieSuggestions([])
                    setSerieSelectorOpen(false)
                    setSerieValidationError(null)
                    setChipValidationError(null)
                    setSerieCamposBloqueados(false)
                    setChipCamposBloqueados(true)
                    setAllowManualChipId(false)
                    setChipFromDatabase(false)
                    setChipLockedAfterManualRetired(false)
                    setChipUniquenessState('idle')
                    setCantidad('1')
                    setCantidadBlurConfirmada(false)
                    lastValidatedSerieRef.current = null
                    setTipoMaterialEditEnabled(false)
                  }}
                  disabled={tipoMaterialQuery.isLoading || !tipoMaterialEditAvailable || !tipoMaterialEditEnabled}
                >
                  <option value="">{tipoMaterialQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo material'}</option>
                  {tipoMaterialOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 md:col-span-1 xl:col-span-2">
                <label className="flex w-full flex-col gap-1.5 text-sm text-slate-700">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Producto</span>
                  <button
                    type="button"
                    ref={productoSelectRef}
                    className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-left !text-sm"
                    onClick={() => setProductoSelectorOpen(true)}
                    onBlur={() => {
                      if (!tipoMaterialEditEnabled) lockProducto()
                    }}
                    disabled={productosQuery.isLoading || tipoMaterialEditEnabled || productoBloqueado || !tipoMaterialId}
                  >
                    {productosQuery.isLoading ? 'Cargando productos...' : productoOptions.find((option) => option.value === productoId)?.label ?? 'Selecciona producto'}
                  </button>
                </label>
              </div>
              <div className="min-w-0 md:col-span-1 xl:col-span-1">
                <Field label="Serie" error={serieValidationError ?? undefined} compact>
                  <input
                    ref={serieInputRef}
                    inputMode={serieInputMode}
                    pattern={serieInputMode === 'numeric' ? '[0-9]*' : undefined}
                    className={`input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm ${serieDisabled ? 'bg-slate-50 text-slate-400' : ''}`}
                    value={serie}
                    onFocus={handleSerieFocus}
                    onClick={handleSerieFocus}
                    onKeyDown={handleSerieKeyDown}
                    onBlur={handleSerieBlur}
                    onChange={(event) => {
                      const nextValue = needsSerie ? applyMask(event.target.value, serieMask) : event.target.value
                      setSerie(nextValue)
                      setCantidadBlurConfirmada(false)
                      setChipUniquenessState('idle')
                      if (isRetiredMaterial && requiresChipByTipo) {
                        setChipId('')
                        setChipCamposBloqueados(true)
                        autoAdvanceToChipRef.current = false
                      }
                    }}
                    placeholder={isInstalledType ? 'Selecciona serie' : needsSerie && serieMask ? serieMask : undefined}
                    readOnly={isInstalledType}
                    disabled={materialFormCleared || serieDisabled}
                  />
                </Field>
                {serie.trim().length > 0 && serieSuggestions.length > 0 ? (
                  <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {serieSuggestions.map((item) => (
                      <button
                        key={item.serial}
                        type="button"
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 last:border-b-0 active:bg-blue-50"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSerie(item.serial)
                          if (item.chipId) {
                            setChipId(chipIdMask ? applyMask(item.chipId, chipIdMask) : item.chipId)
                          }
                          lastValidatedSerieRef.current = { key: `${productoId}::${item.serial}`, sePuede: true }
                          setSerieCamposBloqueados(true)
                          setSerieSuggestions([])
                          setSerieSelectorOpen(false)
                          setCantidadBlurConfirmada(true)
                          setChipUniquenessState('valid')
                        }}
                      >
                        {item.serial}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 md:col-span-1 xl:col-span-1">
                <Field label="ChipID" error={chipValidationError ?? undefined} compact>
                  <input
                    ref={chipIdInputRef}
                    inputMode={chipInputMode}
                    pattern={chipInputMode === 'numeric' ? '[0-9]*' : undefined}
                    className={`input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm ${chipDisabled ? 'bg-slate-50 text-slate-400' : ''}`}
                    value={chipId}
                    onFocus={handleChipFocus}
                    onKeyDown={handleChipKeyDown}
                    onBlur={handleChipBlur}
                    onChange={(event) => {
                      setChipId(requiresChipByTipo ? applyMask(event.target.value, chipIdMask) : event.target.value)
                      setCantidadBlurConfirmada(false)
                      setChipUniquenessState('idle')
                    }}
                    placeholder={requiresChipByTipo && chipIdMask ? chipIdMask : undefined}
                    disabled={chipDisabled}
                  />
                </Field>
              </div>
              <div className="min-w-0 md:col-span-1 xl:col-span-1">
                <Field label="Cantidad" compact>
                  <input
                    ref={cantidadInputRef}
                    className={`input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm text-right ${!productoId || needsSerie ? 'bg-slate-50 text-slate-400' : ''}`}
                    type="number"
                    min="0"
                    step={cantidadPermiteDecimales ? '0.01' : '1'}
                    value={needsSerie ? '1' : cantidad}
                    onFocus={handleCantidadFocus}
                    onKeyDown={handleCantidadKeyDown}
                    onBlur={handleCantidadBlur}
                    onChange={(event) => {
                      setCantidadBlurConfirmada(false)
                      if (needsSerie) {
                        setCantidad('1')
                        return
                      }
                      setCantidad(event.target.value)
                    }}
                    readOnly={needsSerie}
                    disabled={materialFormCleared || !productoId}
                  />
                </Field>
              </div>
              <div className="flex w-full flex-col gap-2 md:col-span-2 md:flex-row md:justify-end xl:col-span-6">
                <Button className="w-full md:w-auto" type="button" onClick={addMaterial} disabled={formInteractionLocked || isAddingMaterial || !canAddMaterial}>
                  {isAddingMaterial ? 'Agregando...' : 'Agregar'}
                </Button>
                <Button
                  className="w-full md:w-auto"
                  type="button"
                  variant="secondary"
                  disabled={formInteractionLocked}
                  onMouseDown={() => {
                    skipMaterialBlurValidationRef.current = true
                  }}
                  onClick={resetMaterialForm}
                >
                  Limpiar
                </Button>
              </div>
            </div>
            <div className="ot-grid-scroll mt-2 sm:mt-4">
              <Table
                columns={columns}
                data={materialRows}
                emptyLabel="NO HAY DATOS PARA LA FECHA"
                rowClassName={(row) => (isRetiredMaterialRow(row) ? 'bg-slate-200' : '')}
                mobileRenderMode="table"
                mobileTableMinWidthClass="min-w-[620px]"
                density="compact"
              />
            </div>
            </FormCard>
          </fieldset>
        ) : !isTorSip ? (
          <fieldset disabled={formInteractionLocked} className="m-0 min-w-0 border-0 p-0">
            <FormCard title="Cargo Usuario" description="Carga de productos de cargo usuario.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="min-w-0 md:col-span-2 xl:col-span-6">
                <Field label="Producto">
                  <button
                    type="button"
                    ref={cargoUsuarioProductoRef}
                    className="input-base text-left"
                    onClick={() => setCargoUsuarioProductoSelectorOpen(true)}
                    disabled={cargoUsuarioProductosQuery.isLoading || cargoUsuarioProductoBloqueado}
                  >
                    {cargoUsuarioProductosQuery.isLoading
                      ? 'Cargando productos...'
                      : cargoUsuarioProductoOptions.find((option) => option.value === cargoUsuarioProductoId)?.label ?? 'Selecciona producto'}
                  </button>
                </Field>
              </div>
              {cargoUsuarioNeedsSerie ? (
                <>
                  <div className="min-w-0 md:col-span-1 xl:col-span-1">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <input
                            type="checkbox"
                            checked={cargoUsuarioTieneSerie}
                            onChange={(event) => handleCargoUsuarioSerieToggle(event.target.checked)}
                            disabled={!cargoUsuarioProductoId || cargoUsuarioSerieBloqueada}
                          />
                          Serie
                        </label>
                      <span className="text-xs text-slate-500">El producto es serializado.</span>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-slate-700">
                        <input
                          ref={cargoUsuarioSerieRef}
                          inputMode={cargoUsuarioSerieInputMode}
                          pattern={cargoUsuarioSerieInputMode === 'numeric' ? '[0-9]*' : undefined}
                          className={`input-base ${cargoUsuarioSerieBloqueada ? 'bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed' : ''}`}
                          value={cargoUsuarioSerie}
                          onChange={(event) => handleCargoUsuarioSerieChange(event.target.value)}
                          onKeyDown={handleCargoUsuarioSerieKeyDown}
                          onBlur={handleCargoUsuarioSerieBlur}
                          placeholder={cargoUsuarioNeedsSerie && cargoUsuarioSerieMask ? cargoUsuarioSerieMask : undefined}
                          readOnly={cargoUsuarioSerieBloqueada}
                          disabled={!cargoUsuarioProductoId || !cargoUsuarioTieneSerie}
                        />
                      {cargoUsuarioSerieError ? (
                        <span className="text-xs font-semibold text-rose-600">{cargoUsuarioSerieError}</span>
                      ) : null}
                      {cargoUsuarioSerie.trim().length > 0 && cargoUsuarioSerieSuggestions.length > 0 ? (
                        <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          {cargoUsuarioSerieSuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 last:border-b-0 active:bg-blue-50"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                handleCargoUsuarioSerieChange(item)
                                setCargoUsuarioSerieSuggestions([])
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {cargoUsuarioNeedsChip ? (
                    <div className="min-w-0 md:col-span-1 xl:col-span-1">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <input
                            type="checkbox"
                            checked={cargoUsuarioTieneChipId}
                            onChange={(event) => handleCargoUsuarioChipToggle(event.target.checked)}
                            disabled={!cargoUsuarioProductoId || !cargoUsuarioChipGateBySerie || cargoUsuarioChipBloqueado}
                          />
                          ChipID
                        </label>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-slate-700">
                        <input
                          ref={cargoUsuarioChipRef}
                          inputMode={cargoUsuarioChipInputMode}
                          pattern={cargoUsuarioChipInputMode === 'numeric' ? '[0-9]*' : undefined}
                          className={`input-base ${cargoUsuarioChipBloqueado ? 'bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed' : ''}`}
                          value={cargoUsuarioChipId}
                          onChange={(event) => handleCargoUsuarioChipChange(event.target.value)}
                          onKeyDown={handleCargoUsuarioChipKeyDown}
                          onBlur={handleCargoUsuarioChipBlur}
                          placeholder={cargoUsuarioNeedsChip && cargoUsuarioChipMask ? cargoUsuarioChipMask : undefined}
                          readOnly={cargoUsuarioChipBloqueado}
                          disabled={!cargoUsuarioProductoId || !cargoUsuarioChipGateBySerie || !cargoUsuarioTieneChipId || cargoUsuarioChipBloqueado}
                        />
                        {cargoUsuarioChipError ? (
                          <span className="text-xs font-semibold text-rose-600">{cargoUsuarioChipError}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="min-w-0 md:col-span-1 xl:col-span-1">
                    <Field label="Cantidad">
                      <input
                        ref={cargoUsuarioCantidadRef}
                        className="input-base text-right bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed"
                        type="number"
                        min="0"
                        step="1"
                        value="1"
                        onChange={() => {
                          setCargoUsuarioGuardado(false)
                          setCargoUsuarioCantidad('1')
                        }}
                        onKeyDown={handleCargoUsuarioCantidadKeyDown}
                        readOnly
                        disabled={!cargoUsuarioProductoId}
                      />
                    </Field>
                    <p className="mt-2 text-xs text-slate-500">Para serializados la cantidad queda fija en 1.</p>
                  </div>
                </>
              ) : (
                <div className="min-w-0 md:col-span-1 xl:col-span-1">
                  <Field label="Cantidad">
                    <input
                      ref={cargoUsuarioCantidadRef}
                      className="input-base text-right"
                      type="number"
                      min="0"
                      step="1"
                      value={cargoUsuarioCantidad}
                      onChange={(event) => {
                        setCargoUsuarioGuardado(false)
                        setCargoUsuarioCantidad(event.target.value)
                      }}
                      onKeyDown={handleCargoUsuarioCantidadKeyDown}
                      disabled={!cargoUsuarioProductoId}
                    />
                  </Field>
                  <p className="mt-2 text-xs text-slate-500">Producto no serializado. Solo registra cantidad.</p>
                </div>
              )}
              <div className="flex w-full flex-col gap-2 md:col-span-2 md:flex-row md:justify-end xl:col-span-6">
                <Button className="w-full md:w-auto" type="button" onClick={addCargoUsuario} disabled={formInteractionLocked || isAddingCargoUsuario || !cargoUsuarioCanAdd}>
                  {isAddingCargoUsuario ? 'Agregando...' : 'Agregar'}
                </Button>
                <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={resetCargoUsuarioForm} disabled={formInteractionLocked}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="ot-grid-scroll mt-2 sm:mt-4">
              <Table
                columns={cargoUsuarioColumns}
                data={cargoUsuarioRows}
                emptyLabel="NO HAY DATOS PARA LA FECHA"
                mobileRenderMode="table"
                mobileTableMinWidthClass="min-w-[720px]"
                density="compact"
              />
            </div>

            {cargoUsuarioError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{cargoUsuarioError}</div>
            ) : null}
            {cargoUsuarioSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{cargoUsuarioSuccess}</div>
            ) : null}

            </FormCard>
          </fieldset>
        ) : null}

        {headerWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{headerWarning}</div>
        ) : null}
        {saldoPopup ? (
          <div
            className={`fixed bottom-4 right-4 z-50 w-[min(92vw,28rem)] rounded-2xl border px-4 py-3 shadow-xl ${
              saldoPopup.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : saldoPopup.kind === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{saldoPopup.title}</p>
            <p className="mt-1 text-sm">{saldoPopup.message}</p>
          </div>
        ) : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={handleBackToDashboard} disabled={mutation.isPending || isPrevalidating}>
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto"
            type="submit"
            disabled={
              mutation.isPending ||
              isPrevalidating ||
              registroFechaBloqueado ||
              !resolvedIdSucursal ||
              ventaQuery.isLoading ||
              !numeroOrden ||
              detalleGuardado ||
              (!isTorSip && materialRows.length === 0 && cargoUsuarioRows.length === 0)
            }
          >
            {detalleGuardado ? 'Guardado' : mutation.isPending || isPrevalidating ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>

      <Modal
        open={productoSelectorOpen}
        title="Selecciona producto"
        onClose={() => {
          setProductoSelectorOpen(false)
          setProductoSearch('')
        }}
        containerClassName="w-[min(94vw,42rem)] rounded-[2rem] bg-white p-5 shadow-2xl"
        contentClassName="p-0"
        actions={
          <Button type="button" variant="secondary" onClick={() => { setProductoSelectorOpen(false); setProductoSearch('') }}>
            Cerrar
          </Button>
        }
      >
        <div className="relative z-10 mb-3 pointer-events-auto">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar producto</label>
          <input
            type="search"
            className="input-base rounded-xl py-2 text-sm"
            value={productoSearch}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation()
              setProductoSearch(event.target.value)
            }}
            placeholder="Buscar producto..."
            autoFocus
          />
        </div>
        <div className="max-h-[64dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50">
          {productosQuery.isLoading ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Cargando productos...</div>
          ) : filteredProductoOptions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Sin productos disponibles.</div>
          ) : (
            filteredProductoOptions.map((option) => {
              const selected = option.value === productoId
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 text-left text-lg font-medium text-slate-800 last:border-b-0 active:bg-blue-50"
                  onClick={() => selectProducto(option.value)}
                >
                  <span className="min-w-0 break-words">{option.label}</span>
                  <span className={`h-8 w-8 shrink-0 rounded-full border-4 ${selected ? 'border-cyan-700 bg-cyan-700 shadow-[inset_0_0_0_5px_white]' : 'border-slate-500 bg-white'}`} />
                </button>
              )
            })
          )}
        </div>
      </Modal>

      <Modal
        open={cargoUsuarioProductoSelectorOpen}
        title="Selecciona producto"
        onClose={() => {
          setCargoUsuarioProductoSelectorOpen(false)
          setCargoUsuarioProductoSearch('')
        }}
        containerClassName="w-[min(94vw,42rem)] rounded-[2rem] bg-white p-5 shadow-2xl"
        contentClassName="p-0"
        actions={
          <Button type="button" variant="secondary" onClick={() => { setCargoUsuarioProductoSelectorOpen(false); setCargoUsuarioProductoSearch('') }}>
            Cerrar
          </Button>
        }
      >
        <div className="relative z-10 mb-3 pointer-events-auto">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar producto</label>
          <input
            type="search"
            className="input-base rounded-xl py-2 text-sm"
            value={cargoUsuarioProductoSearch}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation()
              setCargoUsuarioProductoSearch(event.target.value)
            }}
            placeholder="Buscar producto..."
            autoFocus
          />
        </div>
        <div className="max-h-[64dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50">
          {cargoUsuarioProductosQuery.isLoading ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Cargando productos...</div>
          ) : filteredCargoUsuarioProductoOptions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Sin productos disponibles.</div>
          ) : (
            filteredCargoUsuarioProductoOptions.map((option) => {
              const selected = option.value === cargoUsuarioProductoId
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 text-left text-lg font-medium text-slate-800 last:border-b-0 active:bg-blue-50"
                  onClick={() => selectCargoUsuarioProducto(option.value)}
                >
                  <span className="min-w-0 break-words">{option.label}</span>
                  <span className={`h-8 w-8 shrink-0 rounded-full border-4 ${selected ? 'border-cyan-700 bg-cyan-700 shadow-[inset_0_0_0_5px_white]' : 'border-slate-500 bg-white'}`} />
                </button>
              )
            })
          )}
        </div>
      </Modal>

      <Modal
        open={serieSelectorOpen}
        title="Selecciona serie"
        onClose={() => {
          setSerieSelectorOpen(false)
          setSerieSelectorSearch('')
        }}
        containerClassName="w-[min(94vw,42rem)] rounded-[2rem] bg-white p-5 shadow-2xl"
        contentClassName="p-0"
        actions={
          <Button type="button" variant="secondary" onClick={() => { setSerieSelectorOpen(false); setSerieSelectorSearch('') }}>
            Cerrar
          </Button>
        }
      >
        <div className="relative z-10 mb-3 pointer-events-auto">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar serie</label>
          <input
            ref={serieSelectorSearchRef}
            type="search"
            className="input-base rounded-xl py-2 text-sm"
            value={serieSelectorSearch}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation()
              setSerieSelectorSearch(event.target.value)
            }}
            placeholder="Buscar por serie o ChipID..."
            autoFocus
          />
        </div>
        <div className="max-h-[64dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50">          {serieSelectorLoading ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Cargando series...</div>
          ) : filteredSerieSuggestions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm font-semibold text-slate-500">Sin series disponibles.</div>
          ) : (
            filteredSerieSuggestions.map((item) => {
              const selected = item.serial === serie
              const serialParts = splitSerialLastFour(item.serial)
              return (
                <button
                  key={item.serial}
                  type="button"
                  className="flex w-full items-center justify-between border-b border-slate-200 bg-white px-4 py-4 text-left text-xl font-medium text-slate-800 last:border-b-0 active:bg-blue-50"
                  onClick={() => {
                    setSerie(item.serial)
                    if (item.chipId) {
                      setChipId(chipIdMask ? applyMask(item.chipId, chipIdMask) : item.chipId)
                    }
                    lastValidatedSerieRef.current = { key: `${productoId}::${item.serial}`, sePuede: true }
                    setSerieCamposBloqueados(true)
                    setSerieSuggestions([])
                    setSerieSelectorOpen(false)
                    setSerieSelectorSearch('')
                    setCantidadBlurConfirmada(true)
                    setChipUniquenessState('valid')
                  }}
                >
                  <span>
                    <span>{serialParts.prefix}</span>
                    <span className="font-bold text-rose-600">{serialParts.suffix}</span>
                  </span>
                  <span className={`h-8 w-8 rounded-full border-4 ${selected ? 'border-cyan-700 bg-cyan-700 shadow-[inset_0_0_0_5px_white]' : 'border-slate-500 bg-white'}`} />
                </button>
              )
            })
          )}
        </div>
      </Modal>
      <Modal
        open={successModalOpen}
        title="Registro exitoso"
        onClose={handleSuccessModalAccept}
        contentClassName="max-w-full overflow-x-hidden whitespace-pre-wrap break-all"
        actions={
          <Button type="button" onClick={handleSuccessModalAccept}>
            Aceptar
          </Button>
        }
      >
        <p className="max-w-full overflow-x-hidden whitespace-pre-wrap break-all">{successModalMessage || success || 'Registro exitoso.'}</p>
      </Modal>

      <Modal
        open={errorModalOpen}
        title="No se pudo completar el proceso"
        onClose={handleErrorModalClose}
        contentClassName="max-w-full overflow-x-hidden whitespace-pre-wrap break-all"
        actions={
          <Button type="button" variant="secondary" onClick={handleErrorModalClose}>
            Cerrar
          </Button>
        }
      >
        <p className="max-w-full overflow-x-hidden whitespace-pre-wrap break-all">
          {errorModalMessage || error || cargoUsuarioError || 'Ocurrio un error al finalizar el proceso.'}
        </p>
      </Modal>
    </div>
  )
}

export default OtRealizadaPage
