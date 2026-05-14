import { useEffect, useMemo, useState, type FocusEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import { fetchEstados, fetchRamales, fetchRutas, fetchTiposServicio, fetchTiposTecnologia, type CatalogItem } from '../api/catalogApi'
import { fetchMe } from '../api/authApi'
import {
  fetchCabeceraVentaParaRegistroOtWb,
  fetchOtByNumero,
  registrarVentaParaRegistroOtWb,
  validateCuadreRuta,
  validateExisteCierreAlmacen,
} from '../api/otApi'
import { useSessionStore } from '../store/sessionStore'

type AgendaNavState = {
  manual?: boolean
  origen?: string
  ot?: string
  tor?: string
  clienteNro?: string
  estado?: string
  grupo?: string
  tecnicoNombre?: string
  idVendedor?: string
  idRuta?: string
  idTipoServicio?: string
  idSucursal?: string
  rowData?: UnknownRecord
}

type UnknownRecord = Record<string, unknown>
type GeoSample = { latitude: number; longitude: number; accuracy: number }

const GEO_TARGET_ACCURACY_METERS = 5
const GEO_MAX_CAPTURE_MS = 20000
const GEO_MIN_SAMPLES = 3
const GEO_MAX_SAMPLES = 8
const GEO_BYPASS_HOSTS = ['desktop-b4oj8tg']
const OT_DASHBOARD_FORCE_REFRESH_KEY = 'ot-dashboard-force-refresh'
const PDF_MAX_BYTES = 10 * 1024 * 1024
const TIPO_SERVICIO_ID_KEYS = [
  'id_tiposervicio',
  'Id_TipoServicio',
  'idTipoServicio',
  'IdTipoServicio',
  'id_tipo_servicio',
  'Id_Tipo_Servicio',
] as const

const normalizeHostName = (value: string): string => value.trim().toLowerCase()

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()
const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const isEstadoCerradoFinalizadoOk = (label: string): boolean => {
  const normalized = normalizeText(label)
  return normalized.includes('cerrado') && normalized.includes('finalizado') && normalized.includes('ok')
}

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

const readStringByToken = (row: UnknownRecord, includeTokens: string[], excludeTokens: string[] = ['id']): string => {
  for (const [key, raw] of Object.entries(row)) {
    if (raw === undefined || raw === null || raw === '') continue
    const normalized = normalizeKey(key)
    if (excludeTokens.some((token) => normalized.includes(token))) continue
    if (!includeTokens.some((token) => normalized.includes(token))) continue
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  }
  return ''
}

const readNumber = (row: UnknownRecord, keys: string[]): number | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const readNumberByToken = (row: UnknownRecord, includeTokens: string[]): number | null => {
  const normalizedTokens = includeTokens.map(normalizeKey)
  for (const [key, raw] of Object.entries(row)) {
    if (raw === undefined || raw === null || raw === '') continue
    const normalizedKey = normalizeKey(key)
    if (!normalizedTokens.every((token) => normalizedKey.includes(token))) continue
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string') {
      const parsed = Number(raw.trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTipoTecnologia = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim().toUpperCase()
}

const sanitizeNodoInput = (value: string): string => {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let result = ''
  for (const char of clean) {
    if (result.length < 3) {
      if (/[A-Z]/.test(char)) result += char
      continue
    }
    if (result.length < 6 && /\d/.test(char)) {
      result += char
    }
    if (result.length === 6) break
  }
  return result
}

const findNumberInRows = (rows: UnknownRecord[], keys: string[]): number | null => {
  for (const row of rows) {
    const value = readNumber(row, keys)
    if (value !== null) return value
  }
  return null
}

const findNumberInRowsByToken = (rows: UnknownRecord[], includeTokens: string[]): number | null => {
  for (const row of rows) {
    const value = readNumberByToken(row, includeTokens)
    if (value !== null) return value
  }
  return null
}

const isUnknownRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

const isNotFoundError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  if (error.response?.status === 404) return true
  const payload = error.response?.data
  if (isUnknownRecord(payload) && payload.code === 'NOT_FOUND') return true
  return false
}

const mapOptions = (items: CatalogItem[], idKeys: string[], labelKeys: string[]): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

const pickBestGeoSample = (samples: GeoSample[]): GeoSample | null => {
  const clean = samples
    .filter((sample) => Number.isFinite(sample.latitude) && Number.isFinite(sample.longitude) && Number.isFinite(sample.accuracy) && sample.accuracy > 0)
    .sort((a, b) => a.accuracy - b.accuracy)

  if (!clean.length) return null

  const top = clean.slice(0, Math.min(3, clean.length))
  let latWeighted = 0
  let lonWeighted = 0
  let totalWeight = 0

  for (const sample of top) {
    const weight = 1 / Math.max(sample.accuracy, 1)
    latWeighted += sample.latitude * weight
    lonWeighted += sample.longitude * weight
    totalWeight += weight
  }

  return {
    latitude: latWeighted / totalWeight,
    longitude: lonWeighted / totalWeight,
    accuracy: top[0].accuracy,
  }
}

const RegistrarOTAgendaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSessionStore((state) => state.session)
  const navState = (location.state as AgendaNavState | null) ?? null
  const isManualMode = navState?.manual === true
  const origenRegistro = (navState?.origen ?? (isManualMode ? 'Manual' : 'OT_WEB')).trim() || (isManualMode ? 'Manual' : 'OT_WEB')

  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null)
  const [idTipoServicioManual, setIdTipoServicioManual] = useState(() => (navState?.idTipoServicio ?? '').trim())
  const [otManualInput, setOtManualInput] = useState(() => (navState?.ot ?? '').trim())
  const [clienteManualInput, setClienteManualInput] = useState(() => (navState?.clienteNro ?? '').trim())
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false)
  const [calibrationMessage, setCalibrationMessage] = useState('Calibrando GPS con alta precision...')
  const [calibrationBusy, setCalibrationBusy] = useState(false)
  const [isPrevalidating, setIsPrevalidating] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [registroGuardado, setRegistroGuardado] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [successModalMessage, setSuccessModalMessage] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [nodo, setNodo] = useState('')
  const [ramal, setRamal] = useState('')
  const [tap, setTap] = useState('')
  const [boca, setBoca] = useState('')
  const [tipoTecnologia, setTipoTecnologia] = useState('')
  const [checkPlantaExterna, setCheckPlantaExterna] = useState(false)
  const [tieneDetalle, setTieneDetalle] = useState(false)
  const [nodoTouched, setNodoTouched] = useState(false)
  const [tapTouched, setTapTouched] = useState(false)
  const queryClient = useQueryClient()

  const otRaw = (navState?.ot ?? '').trim()
  const ot = parseNumber(otRaw)
  const clienteNro = parseNumber((navState?.clienteNro ?? '').trim())
  const tor = (navState?.tor ?? '').trim()
  const tecnicoNombre = (navState?.tecnicoNombre ?? '').trim() || (session?.nombre ?? '').trim()
  const rowData = navState?.rowData ?? null
  const navIdVendedor = parseNumber((navState?.idVendedor ?? '').trim())
  const navIdRuta = parseNumber((navState?.idRuta ?? '').trim())
  const navIdTipoServicio = parseNumber((navState?.idTipoServicio ?? '').trim())
  const navIdSucursal = parseNumber((navState?.idSucursal ?? '').trim())
  const hostName = useMemo(() => {
    const sessionHost = normalizeHostName(session?.hostName ?? '')
    const browserHost = typeof window !== 'undefined' ? normalizeHostName(window.location.hostname) : ''
    return sessionHost || browserHost
  }, [session?.hostName])
  const isGeoBypassMachine = useMemo(() => GEO_BYPASS_HOSTS.includes(hostName), [hostName])

  const rutasQuery = useQuery({
    queryKey: ['catalogos-rutas-agenda-base', session?.idUsuario ?? 0],
    queryFn: () => fetchRutas(session?.idUsuario),
    enabled: Boolean(session?.idUsuario),
  })

  const grupoParam = useMemo(() => {
    const fromState = (navState?.grupo ?? '').trim()
    if (fromState) return fromState
    if (rowData) {
      const fromRow = readString(rowData, [
        'nombreGrupo',
        'NombreGrupo',
        'grupo',
        'Grupo',
        'nombreRuta',
        'NombreRuta',
        'ruta',
        'Ruta',
      ]).trim()
      if (fromRow) return fromRow
      const byToken = readStringByToken(rowData, ['grupo', 'ruta', 'cuadrilla', 'nombre'])
      if (byToken) return byToken
    }
    const first = (rutasQuery.data ?? [])[0]
    if (!first) return ''
    return readString(first, ['nombreGrupo', 'NombreGrupo', 'grupo', 'Grupo', 'ruta', 'Ruta', 'nombre', 'Nombre', 'nombreRuta', 'NombreRuta']).trim()
  }, [navState?.grupo, rowData, rutasQuery.data])

  const spParams = useMemo(
    () => ({
      clienteNro: clienteNro ?? 0,
      ot: ot ?? 0,
      tor,
      grupo: grupoParam,
      tecnicoNombre,
    }),
    [clienteNro, grupoParam, ot, tecnicoNombre, tor]
  )

  const cabeceraQuery = useQuery({
    queryKey: ['cabecera-venta-registro-otwb', spParams.clienteNro, spParams.ot, spParams.tor, spParams.grupo, spParams.tecnicoNombre],
    enabled: !isManualMode && Boolean(clienteNro && ot && tor && tecnicoNombre),
    queryFn: () => fetchCabeceraVentaParaRegistroOtWb(spParams),
  })

  const cabeceraRows = useMemo(() => cabeceraQuery.data ?? [], [cabeceraQuery.data])

  const cabecera = useMemo(() => {
    return cabeceraRows[0] ?? null
  }, [cabeceraRows])

  const otDetailQuery = useQuery({
    queryKey: ['ot-por-numero', otRaw],
    queryFn: () => fetchOtByNumero(otRaw),
    enabled: !isManualMode && Boolean(otRaw) && cabeceraQuery.isFetched && (cabeceraQuery.isError || cabeceraRows.length === 0),
    retry: false,
  })
  const otDetailRow = otDetailQuery.data ?? null

  const resolvedRows = useMemo<UnknownRecord[]>(() => {
    const rows: UnknownRecord[] = []
    if (cabeceraRows.length > 0) rows.push(...cabeceraRows)
    if (otDetailRow) rows.push(otDetailRow)
    if (rowData) rows.push(rowData)
    return rows
  }, [cabeceraRows, otDetailRow, rowData])

  const manualRouteResolution = useMemo(() => {
    if (!isManualMode) {
      return { id: null as number | null, total: 0, hasMultiple: false }
    }
    const rows = (rutasQuery.data ?? []) as UnknownRecord[]
    const ids = new Set<number>()
    for (const row of rows) {
      const id =
        readNumber(row, ['idRuta', 'id_ruta', 'Id_Ruta', 'IdRuta', 'idGrupo', 'id_grupo', 'Id_Grupo', 'IdGrupo', 'id', 'Id']) ??
        readNumberByToken(row, ['id', 'ruta']) ??
        readNumberByToken(row, ['id', 'grupo'])
      if (id !== null && id > 0) {
        ids.add(id)
      }
    }
    const resolvedIds = Array.from(ids)
    if (resolvedIds.length === 1) {
      return { id: resolvedIds[0], total: 1, hasMultiple: false }
    }
    return { id: null as number | null, total: resolvedIds.length, hasMultiple: resolvedIds.length > 1 }
  }, [isManualMode, rutasQuery.data])

  const fallbackIdRutaDesdeCatalogo = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const rutasRows = (rutasQuery.data ?? []) as UnknownRecord[]
    const direct = findNumberInRows(rutasRows, ['idRuta', 'id_ruta', 'Id_Ruta', 'IdRuta', 'idGrupo', 'id_grupo', 'Id_Grupo', 'IdGrupo'])
    if (direct !== null) return direct
    return findNumberInRowsByToken(rutasRows, ['id', 'ruta'])
  }, [isManualMode, manualRouteResolution.id, rutasQuery.data])

  const hiddenIdVendedor = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor', 'idusuario', 'IdUsuario'])
    return cabeceraValue ?? navIdVendedor ?? session?.idUsuario ?? null
  }, [navIdVendedor, resolvedRows, session?.idUsuario])
  const hiddenIdRuta = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta'])
    return cabeceraValue ?? navIdRuta ?? fallbackIdRutaDesdeCatalogo ?? null
  }, [fallbackIdRutaDesdeCatalogo, isManualMode, manualRouteResolution.id, navIdRuta, resolvedRows])
  const hiddenIdGrupo = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
    return cabeceraValue ?? hiddenIdRuta ?? navIdRuta ?? fallbackIdRutaDesdeCatalogo ?? null
  }, [fallbackIdRutaDesdeCatalogo, hiddenIdRuta, isManualMode, manualRouteResolution.id, navIdRuta, resolvedRows])
  const hiddenIdTipoServicioFromData = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, [...TIPO_SERVICIO_ID_KEYS])
    if (cabeceraValue !== null) return cabeceraValue
    const tokenValue = findNumberInRowsByToken(resolvedRows, ['id', 'tipo', 'servicio'])
    return tokenValue ?? navIdTipoServicio ?? null
  }, [navIdTipoServicio, resolvedRows])
  const hiddenIdSucursal = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
    return cabeceraValue ?? navIdSucursal ?? session?.idSucursal ?? null
  }, [navIdSucursal, resolvedRows, session?.idSucursal])
  const manualRouteIssue = useMemo(() => {
    if (!isManualMode) return null
    if (rutasQuery.isLoading) return null
    if (manualRouteResolution.hasMultiple) {
      return 'No se puede registrar en modo Manual: el usuario tiene mas de un grupo/ruta asociado.'
    }
    if (manualRouteResolution.total === 0) {
      return 'No se encontro grupo/ruta para el usuario en tbl_ruta.'
    }
    return null
  }, [isManualMode, manualRouteResolution.hasMultiple, manualRouteResolution.total, rutasQuery.isLoading])

  const tecnicoVisible = useMemo(() => {
    if (!cabecera) return tecnicoNombre
    return readString(cabecera, ['nombre', 'Nombre', 'tecnico', 'Tecnico', 'nombreTecnico', 'NombreTecnico']).trim() || tecnicoNombre
  }, [cabecera, tecnicoNombre])

  const grupoVisible = useMemo(() => {
    if (!cabecera) return grupoParam
    const direct = readString(cabecera, ['nombregrupo', 'NombreGrupo', 'nombreruta', 'NombreRuta', 'ruta', 'Ruta', 'grupo', 'Grupo']).trim()
    if (direct) return direct
    const byToken = readStringByToken(cabecera, ['grupo', 'ruta', 'cuadrilla', 'nombre'])
    return byToken || grupoParam
  }, [cabecera, grupoParam])

  const otVisible = useMemo(() => {
    if (!cabecera) return ot ? String(ot) : ''
    const value = readNumber(cabecera, ['ot', 'OT', 'ordenTrabajo', 'OrdenTrabajo'])
    return value !== null ? String(value) : ot ? String(ot) : ''
  }, [cabecera, ot])
  const otInputValue = isManualMode ? otManualInput : otVisible

  const clienteVisible = useMemo(() => {
    if (!cabecera) return clienteNro ? String(clienteNro) : ''
    const value = readNumber(cabecera, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'ClienteNro'])
    return value !== null ? String(value) : clienteNro ? String(clienteNro) : ''
  }, [cabecera, clienteNro])
  const clienteInputValue = isManualMode ? clienteManualInput : clienteVisible

  const sucursalVisible = useMemo(() => {
    for (const row of cabeceraRows) {
      const fromSucursal = readString(row, ['sucursal', 'Sucursal']).trim()
      if (fromSucursal) return fromSucursal
    }
    return ''
  }, [cabeceraRows])

  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio-agenda'],
    queryFn: fetchTiposServicio,
  })

  const tipoServicioOptions = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    return rows
      .map((row) => {
        const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
        if (id === null) return null
        const prefijo = readString(row, ['prefijo', 'Prefijo', 'tor', 'TOR', 'codigo', 'Codigo', 'abreviatura', 'Abreviatura', 'sigla', 'Sigla']).trim()
        const descripcion = readString(row, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
        const labelBase = descripcion || `Tipo ${id}`
        const label = prefijo ? `${labelBase} (${prefijo})` : labelBase
        return { value: String(id), label }
      })
      .filter((item): item is { value: string; label: string } => Boolean(item))
  }, [tiposServicioQuery.data])

  const hiddenIdTipoServicio = useMemo(() => {
    if (hiddenIdTipoServicioFromData !== null) return hiddenIdTipoServicioFromData
    const rows = tiposServicioQuery.data ?? []
    const target = tor.trim().toLowerCase()
    if (!target) return null

    const matchByPrefijo = rows.find(
      (row) =>
        readString(row, ['prefijo', 'Prefijo', 'tor', 'TOR', 'codigo', 'Codigo', 'abreviatura', 'Abreviatura', 'sigla', 'Sigla'])
          .trim()
          .toLowerCase() === target
    )
    if (matchByPrefijo) {
      const id = readNumber(matchByPrefijo, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    const matchByTor = rows.find((row) => readString(row, ['tor', 'TOR']).trim().toLowerCase() === target)
    if (matchByTor) {
      const id = readNumber(matchByTor, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    const matchByDescriptionToken = rows.find((row) => {
      const descripcion = readString(row, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
        .trim()
        .toLowerCase()
      if (!descripcion) return false
      const tokens = descripcion.split(/[^a-z0-9]+/g).filter(Boolean)
      return tokens.includes(target)
    })
    if (matchByDescriptionToken) {
      const id = readNumber(matchByDescriptionToken, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    return null
  }, [hiddenIdTipoServicioFromData, tiposServicioQuery.data, tor])

  const parsedTipoServicioManual = parseNumber(idTipoServicioManual)
  const effectiveIdTipoServicio = isManualMode ? parsedTipoServicioManual : (hiddenIdTipoServicio ?? parsedTipoServicioManual)

  const estadoOrigen = useMemo(() => {
    const fromState = (navState?.estado ?? '').trim()
    if (fromState) return fromState
    if (!rowData) return ''
    const fromRow = readString(rowData, [
      'estado',
      'Estado',
      'estadoCierre',
      'EstadoCierre',
      'nombre_estado',
      'estadoNombre',
      'descripcionEstado',
      'DescripcionEstado',
    ]).trim()
    return fromRow
  }, [navState?.estado, rowData])
  const shouldAutoMapEstadoFallidaConVisita = useMemo(() => {
    const normalized = normalizeText(estadoOrigen)
    return normalized.includes('fallida') && normalized.includes('visita')
  }, [estadoOrigen])

  const tipoServicioLabel = useMemo(() => {
    if (isManualMode && effectiveIdTipoServicio !== null) {
      const selectedManual = tipoServicioOptions.find((option) => Number(option.value) === effectiveIdTipoServicio)
      if (selectedManual?.label?.trim()) {
        return selectedManual.label.trim()
      }
    }
    const rows = tiposServicioQuery.data ?? []
    const target = tor.trim().toLowerCase()
    if (!target) return ''
    const match =
      rows.find((row) => readString(row, ['prefijo', 'Prefijo']).trim().toLowerCase() === target) ??
      rows.find((row) => {
        const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS])
        return id !== null && hiddenIdTipoServicio !== null && id === hiddenIdTipoServicio
      }) ??
      null
    if (!match) return tor
    const desc = readString(match, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
    return desc ? `${desc} (${tor})` : tor
  }, [effectiveIdTipoServicio, hiddenIdTipoServicio, isManualMode, tipoServicioOptions, tiposServicioQuery.data, tor])
  const isTipoAsistencia = useMemo(() => {
    const normalized = normalizeText(tipoServicioLabel)
    return normalized.includes('asistencia')
  }, [tipoServicioLabel])

  const tieneDetalleSuggested = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    const selectedId = effectiveIdTipoServicio
    if (selectedId === null) return false
    const selected = rows.find((row) => {
      const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      return id !== null && id === selectedId
    })
    if (!selected) return false
    const raw = readValue(selected, ['habilitarTieneDetalle', 'HabilitarTieneDetalle', 'habilitar_tiene_detalle'])
    if (typeof raw === 'number') return raw === 1
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase()
      return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 's'
    }
    return false
  }, [effectiveIdTipoServicio, tiposServicioQuery.data])

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-agenda'],
    queryFn: fetchEstados,
  })
  const ramalesQuery = useQuery({
    queryKey: ['catalogos-ramales-agenda'],
    queryFn: fetchRamales,
  })
  const tiposTecnologiaQuery = useQuery({
    queryKey: ['catalogos-tipo-tecnologia-agenda', hiddenIdRuta ?? null],
    queryFn: () => fetchTiposTecnologia(hiddenIdRuta as number),
    enabled: typeof hiddenIdRuta === 'number' && hiddenIdRuta > 0,
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
  const ramalOptions = useMemo(() => {
    const rows = ramalesQuery.data ?? []
    const values = new Set<string>()
    for (const row of rows) {
      const value = readString(row, ['ramal', 'Ramal', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
      if (value) values.add(value)
    }
    return Array.from(values)
  }, [ramalesQuery.data])
  const tipoTecnologiaOptions = useMemo(() => {
    const rows = (tiposTecnologiaQuery.data ?? []) as UnknownRecord[]
    const values = new Set<string>()
    for (const row of rows) {
      const direct = normalizeTipoTecnologia(
        readValue(row, ['tipoTecnologia', 'TipoTecnologia', 'tipo_tecnologia', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
      )
      if (direct) {
        values.add(direct)
      }
    }
    return Array.from(values)
  }, [tiposTecnologiaQuery.data])
  const blockedEstadoIds = useMemo(() => {
    const ids = new Set<string>()
    for (const option of estadoOptions) {
      if (isEstadoCerradoFinalizadoOk(option.label)) {
        ids.add(option.value)
      }
    }
    return ids
  }, [estadoOptions])
  const isBlockedEstadoSelected = Boolean(idEstado && blockedEstadoIds.has(idEstado))
  const shouldBlockFinalizadoOkForCurrentOt = shouldAutoMapEstadoFallidaConVisita
  const isBlockedEstadoForCurrentOt = shouldBlockFinalizadoOkForCurrentOt && isBlockedEstadoSelected
  const selectedEstadoLabel = useMemo(() => {
    if (!idEstado) return ''
    return estadoOptions.find((option) => option.value === idEstado)?.label ?? ''
  }, [idEstado, estadoOptions])
  const isEstadoFinalizadoOkSelected = useMemo(() => {
    if (!selectedEstadoLabel.trim()) return false
    return isEstadoCerradoFinalizadoOk(selectedEstadoLabel)
  }, [selectedEstadoLabel])
  const mustKeepTieneDetalleUnchecked = Boolean(idEstado && !isEstadoFinalizadoOkSelected)

  useEffect(() => {
    if (!shouldAutoMapEstadoFallidaConVisita) return
    if (idEstado) return
    if (!estadoOptions.length) return

    const target = estadoOptions.find((option) => {
      const label = normalizeText(option.label)
      return label.includes('cerrado') && label.includes('imposibilidad') && label.includes('tecnica')
    })
    if (!target) return
    setIdEstado(target.value)
  }, [shouldAutoMapEstadoFallidaConVisita, idEstado, estadoOptions])

  useEffect(() => {
    if (!shouldBlockFinalizadoOkForCurrentOt) return
    if (!idEstado) return
    if (!blockedEstadoIds.has(idEstado)) return
    setIdEstado('')
  }, [blockedEstadoIds, idEstado, shouldBlockFinalizadoOkForCurrentOt])

  const hasGeoFix = latitud !== null && longitud !== null && geoAccuracy !== null
  const geoIsPrecise = geoAccuracy !== null && geoAccuracy <= GEO_TARGET_ACCURACY_METERS

  const parsedEstadoId = parseNumber(idEstado)
  const hasRequiredIds =
    hiddenIdVendedor !== null &&
    hiddenIdRuta !== null &&
    hiddenIdGrupo !== null &&
    effectiveIdTipoServicio !== null &&
    hiddenIdSucursal !== null

  const missingHeaderFields = useMemo(() => {
    const missing: string[] = []
    if (hiddenIdVendedor === null) missing.push('vendedor (idUsuario/idVendedor)')
    if (hiddenIdRuta === null) {
      if (isManualMode && manualRouteResolution.hasMultiple) {
        missing.push('ruta/grupo (el usuario tiene mas de un registro en tbl_ruta)')
      } else if (isManualMode) {
        missing.push('ruta/grupo (no se encontro registro en tbl_ruta para el usuario)')
      } else {
        missing.push('ruta/grupo (idRuta/idGrupo)')
      }
    }
    if (effectiveIdTipoServicio === null) missing.push('tipo de servicio (idTipoServicio)')
    if (hiddenIdSucursal === null) missing.push('sucursal (idSucursal)')
    return missing
  }, [effectiveIdTipoServicio, hiddenIdRuta, hiddenIdSucursal, hiddenIdVendedor, isManualMode, manualRouteResolution.hasMultiple])

  const tipoServicioHeaderWarning = useMemo(() => {
    if (!hasAttemptedSubmit || effectiveIdTipoServicio !== null) return null
    return isManualMode
      ? 'Debes seleccionar un tipo de servicio para continuar.'
      : 'No se pudo resolver tipo de servicio automaticamente. Selecciona uno para continuar.'
  }, [effectiveIdTipoServicio, hasAttemptedSubmit, isManualMode])

  const parsedOrdenTrabajo = parseNumber(otInputValue)
  const parsedCodigoCliente = parseNumber(clienteInputValue)
  const nodoUpper = nodo.trim().toUpperCase()
  const nodoValid = /^[A-Z]{3}\d{3}$/.test(nodoUpper)
  const ramalUpper = ramal.trim().toUpperCase()
  const ramalValid = ramalUpper.length > 0
  const parsedTap = parseNumber(tap)
  const tapValid = /^\d{3}$/.test(tap.trim())
  const tapDisplay = tap.trim() ? tap.trim().padStart(3, '0') : '-'
  const parsedBoca = parseNumber(boca)
  const bocaValid = parsedBoca !== null && Number.isInteger(parsedBoca) && parsedBoca >= 0 && parsedBoca <= 8
  const hasValidOrdenTrabajo = parsedOrdenTrabajo !== null && parsedOrdenTrabajo > 0
  const hasValidCodigoCliente = parsedCodigoCliente !== null && parsedCodigoCliente > 0

  const canSubmitBase = Boolean(
    session?.idUsuario &&
      hasRequiredIds &&
      parsedEstadoId !== null &&
      hasValidOrdenTrabajo &&
      hasValidCodigoCliente &&
      nodoValid &&
      ramalValid &&
      tapValid &&
      bocaValid &&
      tipoTecnologia.trim().length > 0 &&
      !isBlockedEstadoForCurrentOt
  )

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = []
    if (!session?.idUsuario) missing.push('usuario de sesion')
    if (missingHeaderFields.length > 0) missing.push(...missingHeaderFields)
    if (parsedEstadoId === null) missing.push('estado')
    if (!hasValidOrdenTrabajo) missing.push('nro orden')
    if (!hasValidCodigoCliente) missing.push('cod cliente')
    if (!nodoValid) missing.push('nodo (3 letras y 3 numeros)')
    if (!ramalValid) missing.push('ramal')
    if (!tapValid) missing.push('tap (3 digitos)')
    if (!bocaValid) missing.push('boca')
    if (!tipoTecnologia.trim()) missing.push('tipo tecnologia')
    return missing
  }, [
    bocaValid,
    hasValidCodigoCliente,
    hasValidOrdenTrabajo,
    missingHeaderFields,
    nodoValid,
    parsedEstadoId,
    ramalValid,
    session?.idUsuario,
    tapValid,
    tipoTecnologia,
  ])

  const missingRequiredMessage = useMemo(() => {
    if (missingRequiredFields.length === 0) return null
    return `Faltan datos requeridos: ${missingRequiredFields.join(', ')}.`
  }, [missingRequiredFields])

  const handleNodoBlur = (event: FocusEvent<HTMLInputElement>) => {
    setNodoTouched(true)
    if (!nodoValid) {
      const input = event.currentTarget
      window.setTimeout(() => {
        if (input && document.body.contains(input)) {
          input.focus()
        }
      }, 0)
    }
  }

  const handleTapBlur = (event: FocusEvent<HTMLInputElement>) => {
    setTapTouched(true)
    if (!tapValid) {
      const input = event.currentTarget
      window.setTimeout(() => {
        if (input && document.body.contains(input)) {
          input.focus()
        }
      }, 0)
    }
  }

  useEffect(() => {
    setTieneDetalle(tieneDetalleSuggested)
  }, [tieneDetalleSuggested])

  useEffect(() => {
    if (isTipoAsistencia) return
    if (!checkPlantaExterna) return
    setCheckPlantaExterna(false)
  }, [checkPlantaExterna, isTipoAsistencia])

  useEffect(() => {
    if (!tipoTecnologiaOptions.length) return
    if (tipoTecnologiaOptions.includes(tipoTecnologia)) return
    setTipoTecnologia(tipoTecnologiaOptions[0])
  }, [tipoTecnologia, tipoTecnologiaOptions])

  const requestGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (isGeoBypassMachine) {
        setGeoError(null)
        setLatitud(0)
        setLongitud(0)
        setGeoAccuracy(0)
        return
      }
      setGeoError('Tu navegador no soporta geolocalizacion.')
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      return
    }

    setGeoLoading(true)
    setGeoError(null)
    setGeoAccuracy(null)

    const samples: GeoSample[] = []
    const startedAt = Date.now()
    let finished = false
    let watchId: number | null = null
    let stopTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (stopTimer) clearTimeout(stopTimer)
    }

    const failWithError = (error: GeolocationPositionError) => {
      if (finished) return
      finished = true
      cleanup()
      setGeoLoading(false)
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      if (isGeoBypassMachine) {
        setGeoError(null)
        return
      }
      if (error.code === 1) {
        setGeoError('Permiso de ubicacion denegado. Debes habilitarlo para registrar OT.')
        return
      }
      if (error.code === 2) {
        setGeoError('No se pudo determinar la ubicacion.')
        return
      }
      if (error.code === 3) {
        setGeoError('Tiempo de espera agotado al obtener ubicacion.')
        return
      }
      setGeoError('No se pudo obtener latitud/longitud.')
    }

    const finishWithBestSample = () => {
      if (finished) return
      finished = true
      cleanup()

      const best = pickBestGeoSample(samples)
      if (!best) {
        setGeoLoading(false)
        setLatitud(null)
        setLongitud(null)
        setGeoAccuracy(null)
        setGeoError('No se pudo obtener una lectura valida de ubicacion.')
        return
      }

      setLatitud(best.latitude)
      setLongitud(best.longitude)
      setGeoAccuracy(best.accuracy)
      setGeoLoading(false)
      if (best.accuracy > GEO_TARGET_ACCURACY_METERS) {
        setGeoError(`Precision GPS actual +/-${best.accuracy.toFixed(1)} m.`)
      } else {
        setGeoError(null)
      }
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        samples.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })

        const best = pickBestGeoSample(samples)
        if (best) {
          setLatitud(best.latitude)
          setLongitud(best.longitude)
          setGeoAccuracy(best.accuracy)
        }

        const elapsed = Date.now() - startedAt
        const reachedTarget = best !== null && best.accuracy <= GEO_TARGET_ACCURACY_METERS
        const enoughSamples = samples.length >= GEO_MIN_SAMPLES
        const timeoutReached = elapsed >= GEO_MAX_CAPTURE_MS
        const sampleCapReached = samples.length >= GEO_MAX_SAMPLES

        if ((reachedTarget && enoughSamples) || timeoutReached || sampleCapReached) {
          finishWithBestSample()
        }
      },
      failWithError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    stopTimer = setTimeout(() => {
      finishWithBestSample()
    }, GEO_MAX_CAPTURE_MS + 2000)
  }

  const calibrateGeolocationForSubmit = (): Promise<GeoSample | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (isGeoBypassMachine) {
        setGeoError(null)
        setLatitud(0)
        setLongitud(0)
        setGeoAccuracy(0)
        return Promise.resolve({ latitude: 0, longitude: 0, accuracy: 0 })
      }
      setGeoError('Tu navegador no soporta geolocalizacion.')
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      return Promise.resolve(null)
    }

    setGeoLoading(true)
    setGeoError(null)
    setGeoAccuracy(null)

    return new Promise((resolve) => {
      const samples: GeoSample[] = []
      const startedAt = Date.now()
      let finished = false
      let watchId: number | null = null
      let stopTimer: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (stopTimer) clearTimeout(stopTimer)
      }

      const failWithError = (error: GeolocationPositionError) => {
        if (finished) return
        finished = true
        cleanup()
        setGeoLoading(false)
        setLatitud(null)
        setLongitud(null)
        setGeoAccuracy(null)
        if (isGeoBypassMachine) {
          setGeoError(null)
          resolve({ latitude: 0, longitude: 0, accuracy: 0 })
          return
        }
        if (error.code === 1) {
          setGeoError('Permiso de ubicacion denegado. Debes habilitarlo para registrar OT.')
          resolve(null)
          return
        }
        if (error.code === 2) {
          setGeoError('No se pudo determinar la ubicacion.')
          resolve(null)
          return
        }
        if (error.code === 3) {
          setGeoError('Tiempo de espera agotado al obtener ubicacion.')
          resolve(null)
          return
        }
        setGeoError('No se pudo obtener latitud/longitud.')
        resolve(null)
      }

      const finishWithBestSample = () => {
        if (finished) return
        finished = true
        cleanup()

        const best = pickBestGeoSample(samples)
        if (!best) {
          setGeoLoading(false)
          setLatitud(null)
          setLongitud(null)
          setGeoAccuracy(null)
          if (isGeoBypassMachine) {
            setGeoError(null)
            resolve({ latitude: 0, longitude: 0, accuracy: 0 })
            return
          }
          setGeoError('No se pudo obtener una lectura valida de ubicacion.')
          resolve(null)
          return
        }

        setLatitud(best.latitude)
        setLongitud(best.longitude)
        setGeoAccuracy(best.accuracy)
        setGeoLoading(false)
        if (best.accuracy > GEO_TARGET_ACCURACY_METERS) {
          setGeoError(`Precision GPS actual +/-${best.accuracy.toFixed(1)} m.`)
        } else {
          setGeoError(null)
        }
        resolve(best)
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          samples.push({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })

          const best = pickBestGeoSample(samples)
          if (best) {
            setLatitud(best.latitude)
            setLongitud(best.longitude)
            setGeoAccuracy(best.accuracy)
          }

          const elapsed = Date.now() - startedAt
          const reachedTarget = best !== null && best.accuracy <= GEO_TARGET_ACCURACY_METERS
          const enoughSamples = samples.length >= GEO_MIN_SAMPLES
          const timeoutReached = elapsed >= GEO_MAX_CAPTURE_MS
          const sampleCapReached = samples.length >= GEO_MAX_SAMPLES

          if ((reachedTarget && enoughSamples) || timeoutReached || sampleCapReached) {
            finishWithBestSample()
          }
        },
        failWithError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )

      stopTimer = setTimeout(() => {
        finishWithBestSample()
      }, GEO_MAX_CAPTURE_MS + 2000)
    })
  }

  useEffect(() => {
    void requestGeolocation()
  }, [])

  useEffect(() => {
    if (!session?.sessionToken) return
    const needsSessionRefresh = !session.hostName || !session.idUsuario || session.idUsuario <= 0
    if (!needsSessionRefresh) return
    let cancelled = false

    void fetchMe(session.sessionToken)
      .then((me) => {
        if (cancelled || !me) return
        const nextHostName = me.hostName || session.hostName
        const nextIdUsuario = typeof me.idUsuario === 'number' && Number.isFinite(me.idUsuario) && me.idUsuario > 0 ? me.idUsuario : session.idUsuario
        const nextNombre = me.nombre || session.nombre
        const nextRol = me.rol || session.rol
        const nextIdRol = typeof me.idRol === 'number' && Number.isFinite(me.idRol) ? me.idRol : session.idRol
        const nextIdSucursal =
          typeof me.idSucursal === 'number' && Number.isFinite(me.idSucursal) && me.idSucursal > 0 ? me.idSucursal : session.idSucursal
        const noChanges =
          nextHostName === session.hostName &&
          nextIdUsuario === session.idUsuario &&
          nextNombre === session.nombre &&
          nextRol === session.rol &&
          nextIdRol === session.idRol &&
          nextIdSucursal === session.idSucursal
        if (noChanges) return
        useSessionStore.getState().setSession({
          ...session,
          hostName: nextHostName,
          idUsuario: nextIdUsuario,
          nombre: nextNombre,
          rol: nextRol,
          idRol: nextIdRol,
          idSucursal: nextIdSucursal,
        })
      })
      .catch(() => {
        // Si falla, seguimos con la validacion normal.
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const mutation = useMutation({
    mutationFn: async (coordinates?: { latitud: number; longitud: number }) => {
      const ordenTrabajo = parsedOrdenTrabajo ?? 0
      const codigoCliente = parsedCodigoCliente ?? 0
      const payload = {
        idUsuario: session?.idUsuario ?? 0,
        idVendedor: hiddenIdVendedor ?? 0,
        idGrupo: hiddenIdGrupo ?? 0,
        idTipoServicio: effectiveIdTipoServicio ?? 0,
        ordenTrabajo,
        idEstado: parsedEstadoId ?? 0,
        codigoCliente,
        idSucursal: hiddenIdSucursal ?? 0,
        nombre: tecnicoVisible,
        origen: origenRegistro,
        observacion: observacion.trim(),
        total: 0,
        idUsuarioE: 0,
        eEliminado: false,
        tieneObservacion: Boolean(observacion.trim()),
        latitud: coordinates?.latitud ?? latitud ?? 0,
        longitud: coordinates?.longitud ?? longitud ?? 0,
        nodo: nodoUpper,
        ramal: ramal.trim(),
        tap: parsedTap ?? 0,
        boca: parsedBoca ?? 0,
        checkPlantaExterna,
        tieneDetalle,
        tipoTecnologia: tipoTecnologia.trim().toUpperCase(),
      }
      return await registrarVentaParaRegistroOtWb(payload, pdfFile)
    },
    onSuccess: (data) => {
      const idVenta = data?.data?.idVenta
      const orden = data?.data?.ordenTrabajo
      setSubmitError(null)
      setRegistroGuardado(true)
      setConfirmModalOpen(false)
      const rutaPdf = data?.data?.rutaPdf
      const message = idVenta || orden ? `Registro exitoso. NroTrans.: ${idVenta ?? '-'} | OT: ${orden ?? '-'}` : 'Registro exitoso.'
      const messageFinal = rutaPdf ? `${message} | PDF: ${rutaPdf}` : message
      setSuccess(messageFinal)
      setSuccessModalMessage(messageFinal)
      setSuccessModalOpen(true)
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'], refetchType: 'all' })
    },
    onError: () => {
      setSuccess(null)
      setSuccessModalOpen(false)
      setSuccessModalMessage('')
      setSubmitError('No se pudo guardar la OT. Revisa los datos de cabecera y estado.')
    },
  })

  const handleBackToDashboard = () => {
    const refreshToken = Date.now()
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(OT_DASHBOARD_FORCE_REFRESH_KEY, String(refreshToken))
    }
    navigate('/GestionOTs', {
      replace: true,
      state: { refreshToken },
    })
  }

  const handleSuccessModalAccept = () => {
    setSuccessModalOpen(false)
    handleBackToDashboard()
  }

  const runPreRegisterValidations = async (): Promise<boolean> => {
    const routeId = hiddenIdRuta ?? hiddenIdGrupo ?? null
    const executionDate = formatDateDDMMYYYY(new Date())

    if (routeId === null || routeId <= 0) {
      setSubmitError('No se pudo resolver la ruta/grupo para validar cierre y cuadre antes del registro.')
      return false
    }

    setIsPrevalidating(true)
    try {
      const [cierreAgenda, hasCuadreRuta] = await Promise.all([
        validateExisteCierreAlmacen({
          fecha: executionDate,
        }),
        validateCuadreRuta({
          idRuta: routeId,
          fecha: executionDate,
        }),
      ])

      if (cierreAgenda.bloqueado) {
        setSubmitError(cierreAgenda.mensaje || 'No se puede registrar la OT porque existe cierre de almacen.')
        return false
      }

      if (hasCuadreRuta) {
        setSubmitError('No se puede registrar la OT porque la ruta ya realizo cuadre.')
        return false
      }

      return true
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSubmitError(error.response?.data?.message ?? 'No se pudo validar cierre/cuadre antes del registro.')
      } else {
        setSubmitError('No se pudo validar cierre/cuadre antes del registro.')
      }
      return false
    } finally {
      setIsPrevalidating(false)
    }
  }

  const validateReadyToRegister = (sample: GeoSample | null): boolean => {
    if (!sample) {
      if (isGeoBypassMachine) {
        return true
      }
      setSubmitError('Debes capturar ubicacion antes de registrar la OT.')
      return false
    }
    if (!canSubmitBase) {
      setSubmitError(missingRequiredMessage ?? 'Faltan datos requeridos para registrar la OT.')
      return false
    }
    if (!pdfFile) {
      setSubmitError('Debes adjuntar el archivo PDF para registrar la OT.')
      return false
    }
    return true
  }

  const runCalibrationAndSubmit = async () => {
    if (calibrationBusy || mutation.isPending || isPrevalidating || registroGuardado) return

    setSubmitError(null)
    setSuccess(null)
    setConfirmModalOpen(false)
    setCalibrationModalOpen(true)
    setCalibrationBusy(true)
    setCalibrationMessage('Calibrando GPS con alta precision. No cierres esta ventana...')

    try {
      const canContinue = await runPreRegisterValidations()
      if (!canContinue) return

      const best = await calibrateGeolocationForSubmit()
      const coordinates = best ?? (isGeoBypassMachine ? { latitude: 0, longitude: 0, accuracy: 0 } : null)
      if (!coordinates) {
        setSubmitError('Debes capturar ubicacion antes de registrar la OT.')
        return
      }
      if (!validateReadyToRegister(coordinates)) return
      setCalibrationMessage('Ubicacion calibrada. Registrando OT...')
      await mutation.mutateAsync({
        latitud: coordinates.latitude,
        longitud: coordinates.longitude,
      })
    } finally {
      setCalibrationBusy(false)
      setCalibrationModalOpen(false)
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    setSubmitError(null)
    setSuccess(null)
    if (registroGuardado) {
      setSubmitError('La OT ya fue registrada. No se permite guardar nuevamente.')
      return
    }
    if (!canSubmitBase) {
      if (isBlockedEstadoForCurrentOt) {
        setSubmitError(
          `No se permite guardar con estado "${selectedEstadoLabel || 'CERRADO - FINALIZADO OK'}"${
            isManualMode ? ' en registro Manual.' : '.'
          }`
        )
        return
      }
      setSubmitError(missingRequiredMessage ?? 'Faltan datos requeridos para registrar la OT.')
      return
    }
    if (!pdfFile) {
      setSubmitError('Debes adjuntar el archivo PDF para registrar la OT.')
      return
    }
    setConfirmModalOpen(true)
  }

  const missingParamsMessage = useMemo(() => {
    if (isManualMode) return null
    const missing: string[] = []
    if (!clienteNro) missing.push('clienteNro')
    if (!ot) missing.push('ot')
    if (!tor) missing.push('tor')
    if (!tecnicoNombre) missing.push('tecnicoNombre')
    return missing.length > 0 ? `Faltan parametros para consultar cabecera: ${missing.join(', ')}.` : null
  }, [clienteNro, isManualMode, ot, tecnicoNombre, tor])

  const cabeceraErrorDetail = useMemo(() => {
    const error = cabeceraQuery.error
    if (!error) return ''
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        try {
          return JSON.stringify(error.response.data)
        } catch {
          return String(error.response.data)
        }
      }
      return error.message
    }
    if (error instanceof Error) return error.message
    return String(error)
  }, [cabeceraQuery.error])

  const hiddenHeaderMessage = useMemo(() => {
    if (!hasAttemptedSubmit || missingHeaderFields.length === 0) return null
    return `Faltan datos de cabecera requeridos: ${missingHeaderFields.join(', ')}.`
  }, [hasAttemptedSubmit, missingHeaderFields])

  const otDetailErrorDetail = useMemo(() => {
    const error = otDetailQuery.error
    if (!error) return ''
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        try {
          return JSON.stringify(error.response.data)
        } catch {
          return String(error.response.data)
        }
      }
      return error.message
    }
    if (error instanceof Error) return error.message
    return String(error)
  }, [otDetailQuery.error])

  const showOtDetailError = otDetailQuery.isError && !isNotFoundError(otDetailQuery.error)

  return (
    <div className="bento-page">
      <div className="px-1">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">RegistrarOrdenAgenda</h2>
        <p className="text-sm text-slate-500">Basado en API de cabecera de venta OT.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleFormSubmit}>
        <FormCard title="" hideHeader>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-4 hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Usuario</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={session?.nombre ?? ''} disabled />
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tecnico</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={tecnicoVisible} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-red-600">Fecha Ejecucion</label>
              <input
                className="input-base rounded-md border-rose-300 bg-slate-50 py-2 text-sm text-rose-600"
                value={formatDateDDMMYYYY(new Date())}
                disabled
              />
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Grupo</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={grupoVisible} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipo Instalacion</label>
              {hiddenIdTipoServicio !== null && !isManualMode ? (
                <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={tipoServicioLabel} disabled />
              ) : (
                <select
                  className="input-base rounded-md py-2 text-sm"
                  value={idTipoServicioManual}
                  onChange={(event) => setIdTipoServicioManual(event.target.value)}
                >
                  <option value="">{tiposServicioQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo de servicio'}</option>
                  {tipoServicioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden</label>
              <input
                className={`input-base rounded-md py-2 text-sm ${isManualMode ? '' : 'bg-slate-50'}`}
                value={otInputValue}
                onChange={(event) => {
                  if (!isManualMode) return
                  setOtManualInput(event.target.value.replace(/[^\d]/g, ''))
                }}
                placeholder={isManualMode ? 'Ingresa nro de orden' : undefined}
                disabled={!isManualMode}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente</label>
              <input
                className={`input-base rounded-md py-2 text-sm ${isManualMode ? '' : 'bg-slate-50'}`}
                value={clienteInputValue}
                onChange={(event) => {
                  if (!isManualMode) return
                  setClienteManualInput(event.target.value.replace(/[^\d]/g, ''))
                }}
                placeholder={isManualMode ? 'Ingresa cod cliente' : undefined}
                disabled={!isManualMode}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Estado</label>
              <select className="input-base rounded-md py-2 text-sm" value={idEstado} onChange={(event) => setIdEstado(event.target.value)}>
                <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                {estadoOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={shouldBlockFinalizadoOkForCurrentOt && blockedEstadoIds.has(option.value)}
                  >
                    {shouldBlockFinalizadoOkForCurrentOt && blockedEstadoIds.has(option.value)
                      ? `${option.label} (${isManualMode ? 'No permitido para Manual' : 'No permitido para Fallida con visita'})`
                      : option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Sucursal</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={sucursalVisible} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Origen</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={origenRegistro} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipo Tecnologia</label>
              <select
                className="input-base rounded-md py-2 text-sm"
                value={tipoTecnologia}
                onChange={(event) => setTipoTecnologia(event.target.value)}
              >
                <option value="">{tiposTecnologiaQuery.isLoading ? 'Cargando tecnologia...' : 'Selecciona tecnologia'}</option>
                {tipoTecnologiaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nodo</label>
              <input
                className="input-base rounded-md py-2 text-sm uppercase"
                value={nodo}
                onChange={(event) => setNodo(sanitizeNodoInput(event.target.value))}
                onBlur={handleNodoBlur}
                placeholder="SCZ123"
                maxLength={6}
                aria-invalid={nodoTouched && !nodoValid}
              />
              {nodoTouched && !nodoValid ? (
                <p className="mt-1 text-xs text-rose-600">Nodo debe tener 3 letras y 3 numeros (ej: SCZ123).</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Ramal</label>
              <select className="input-base rounded-md py-2 text-sm" value={ramal} onChange={(event) => setRamal(event.target.value)}>
                <option value="">{ramalesQuery.isLoading ? 'Cargando ramales...' : 'Selecciona ramal'}</option>
                {ramalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">TAP</label>
              <input
                className="input-base rounded-md py-2 text-sm"
                value={tap}
                onChange={(event) => setTap(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                onBlur={handleTapBlur}
                placeholder="0-999"
                maxLength={3}
                aria-invalid={tapTouched && !tapValid}
              />
              {tapTouched && !tapValid ? <p className="mt-1 text-xs text-rose-600">TAP debe tener exactamente 3 digitos.</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Boca</label>
              <select className="input-base rounded-md py-2 text-sm" value={boca} onChange={(event) => setBoca(event.target.value)}>
                <option value="">Selecciona boca</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <option key={item} value={String(item)}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nodo_Ramal_Tap</label>
              <input
                className="input-base rounded-md bg-slate-50 py-2 text-sm"
                value={`NODO ${nodoUpper || '-'} RAMAL ${ramalUpper || '-'} TAP ${tapDisplay} BOCA ${boca || '-'}`}
                disabled
              />
            </div>

            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Bitacora</label>
              <textarea
                className="input-base h-24 resize-none rounded-md py-2 text-sm"
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder="Escribe una observacion"
              />
            </div>

            <div className="md:col-span-1 md:pt-6">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  checked={checkPlantaExterna}
                  onChange={(event) => setCheckPlantaExterna(event.target.checked)}
                  disabled={!isTipoAsistencia}
                />
                Es Planta Externa
              </label>
            </div>

            <div className="md:col-span-1 md:pt-6">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  checked={tieneDetalle}
                  onChange={(event) => setTieneDetalle(event.target.checked)}
                />
                Se uso material?
              </label>
              {mustKeepTieneDetalleUnchecked ? (
                <p className="mt-1 text-xs text-slate-500">Para este estado, "Se uso material?" no aplica.</p>
              ) : null}
            </div>

            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Adjuntar PDF (obligatorio)</label>
              <input
                className="input-base rounded-md py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  if (!file) {
                    setPdfFile(null)
                    return
                  }
                  const lowerName = file.name.toLowerCase()
                  const mimeType = (file.type ?? '').toLowerCase()
                  const isPdfExtension = lowerName.endsWith('.pdf')
                  const isPdfMime = mimeType === '' || mimeType === 'application/pdf'
                  const isPdf = isPdfExtension && isPdfMime
                  if (!isPdf) {
                    setPdfFile(null)
                    setSubmitError('Solo se permite adjuntar archivos PDF.')
                    event.target.value = ''
                    return
                  }
                  if (file.size > PDF_MAX_BYTES) {
                    setPdfFile(null)
                    setSubmitError('El PDF supera el limite de 10MB.')
                    event.target.value = ''
                    return
                  }
                  setSubmitError(null)
                  setPdfFile(file)
                }}
                disabled={registroGuardado || mutation.isPending || isPrevalidating}
              />
              <p className="mt-1 text-xs text-slate-500">{pdfFile ? `Archivo: ${pdfFile.name}` : 'Debes adjuntar un PDF para continuar.'}</p>
            </div>

            <div className="md:col-span-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              Geolocalizacion: lat={latitud ?? 'N/D'}, lon={longitud ?? 'N/D'}
              {hasGeoFix ? (
                <div className={geoIsPrecise ? 'mt-1 text-emerald-700' : 'mt-1 text-rose-600'}>Precision estimada: +/-{(geoAccuracy ?? 0).toFixed(1)} m</div>
              ) : null}
              <div className="mt-2">
                <Button
                  className="w-full sm:w-auto"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void requestGeolocation()
                  }}
                  disabled={geoLoading || calibrationBusy || isPrevalidating}
                >
                  {geoLoading ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
                </Button>
              </div>
              {geoError ? <div className="mt-2 text-rose-600">{geoError}</div> : null}
            </div>
          </div>
        </FormCard>

        {!isManualMode && missingParamsMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{missingParamsMessage}</div>
        ) : null}
        {manualRouteIssue ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{manualRouteIssue}</div>
        ) : null}
        {hiddenHeaderMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{hiddenHeaderMessage}</div>
        ) : null}
        {tipoServicioHeaderWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{tipoServicioHeaderWarning}</div>
        ) : null}
        {!isManualMode && cabeceraQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo cargar la cabecera de venta OT.
            {cabeceraErrorDetail ? <div className="mt-2 break-all text-xs">{cabeceraErrorDetail}</div> : null}
          </div>
        ) : null}
        {!isManualMode && showOtDetailError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo obtener el detalle de la OT por numero (`fetchOtByNumero`).
            {otDetailErrorDetail ? <div className="mt-2 break-all text-xs">{otDetailErrorDetail}</div> : null}
          </div>
        ) : null}
        {!isManualMode && !cabeceraQuery.isLoading && !cabeceraQuery.isError && cabeceraRows.length > 0 && !sucursalVisible ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            La API de cabecera no devolvio la sucursal.
          </div>
        ) : null}
        {submitError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</div> : null}
        {!submitError && isBlockedEstadoForCurrentOt ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se permite guardar con estado "{selectedEstadoLabel || 'CERRADO - FINALIZADO OK'}"
            {isManualMode ? ' en registro Manual.' : '.'}
          </div>
        ) : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={handleBackToDashboard} disabled={mutation.isPending || isPrevalidating}>
            {success ? 'Volver' : 'Cancelar'}
          </Button>
          <Button
            className="w-full sm:w-auto"
            type="submit"
            disabled={registroGuardado || mutation.isPending || cabeceraQuery.isLoading || geoLoading || calibrationBusy || isPrevalidating}
          >
            {registroGuardado ? 'Registrada' : isPrevalidating ? 'Validando...' : mutation.isPending ? 'Guardando...' : 'Registrar OT'}
          </Button>
        </div>
      </form>

      <Modal open={confirmModalOpen && !registroGuardado} title="Muy importante" onClose={() => setConfirmModalOpen(false)}>
        <p className="font-semibold text-rose-700">ASEGURESE DE ESTAR EN LA UBICACION EXACTA</p>
        <p className="mt-2 text-slate-600">Si no esta exactamente en el domicilio correcto, no continue.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setConfirmModalOpen(false)} disabled={calibrationBusy || isPrevalidating || registroGuardado}>
            Cancelar
          </Button>
          <Button type="button" onClick={runCalibrationAndSubmit} disabled={calibrationBusy || isPrevalidating || registroGuardado}>
            Estoy en la ubicacion
          </Button>
        </div>
      </Modal>

      <Modal open={calibrationModalOpen} title="Calibrando GPS" onClose={() => (calibrationBusy ? undefined : setCalibrationModalOpen(false))}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <p className="font-medium text-slate-700">{calibrationMessage}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">Este proceso puede tardar para obtener la mejor precision posible.</p>
      </Modal>

      <Modal
        open={successModalOpen}
        title="Registro exitoso"
        onClose={handleSuccessModalAccept}
        actions={
          <Button type="button" onClick={handleSuccessModalAccept}>
            OK
          </Button>
        }
      >
        <p>{successModalMessage || success || 'Registro exitoso.'}</p>
      </Modal>
    </div>
  )
}

export default RegistrarOTAgendaPage
