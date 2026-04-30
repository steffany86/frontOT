import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import {
  fetchOtByNumero,
  fetchOtFinalizadas,
  fetchOtRegistroCompleto,
  fetchSupervisorUltimoEstadoDia,
  validateCuadreRuta,
  validateExisteCierreAlmacen,
  validateVentaYDetalle,
  type OtRegistroCompletoVenta,
} from '../api/otApi'
import { fetchTiposServicio } from '../api/catalogApi'
import { useAuth } from '../context/AuthContext'
import type { OtSummary } from '../types/ot'
import { todayISO } from '../utils/dates'

const readValue = (row: OtSummary, keys: string[]): unknown => {
  const record = row as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const readString = (row: OtSummary, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const normalizeIdentifierValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  const text = String(value).trim()
  if (!text) return ''
  const decimalWithTrailingZeros = text.match(/^(\d+)[.,]0+$/)
  if (decimalWithTrailingZeros) {
    return decimalWithTrailingZeros[1]
  }
  return text
}

const readIdentifierString = (row: OtSummary, keys: string[]): string => {
  const value = readValue(row, keys)
  return normalizeIdentifierValue(value)
}

const getClienteNro = (row: OtSummary): string => {
  const explicitCliente = readIdentifierString(row, [
    'cliente_nro',
    'Cliente_Nro',
    'clienteNro',
    'ClienteNro',
    'nroCliente',
    'NroCliente',
    'codigo_cliente',
    'Codigo_Cliente',
    'codigoCliente',
    'CodigoCliente',
  ])
  if (explicitCliente) return explicitCliente

  const genericCodigo = readIdentifierString(row, ['CODIGO', 'codigo'])
  if (!genericCodigo) return ''
  const ot = getOtCodigo(row).trim()
  return ot && genericCodigo === ot ? '' : genericCodigo
}

const getOtCodigo = (row: OtSummary): string => {
  return readIdentifierString(row, [
    'ot',
    'OT',
    'ordenTrabajo',
    'OrdenTrabajo',
    'orden_trabajo',
    'Orden_Trabajo',
    'numeroOrden',
    'NumeroOrden',
    'wo_external_id',
    'WO_EXTERNAL_ID',
    'woExternalId',
    'WoExternalId',
    'nroOT',
    'NroOT',
    'codigo',
    'Codigo',
  ])
}

const toDigitsOnly = (value: string): string => value.replace(/\D+/g, '')

const getEstado = (row: OtSummary): string => {
  return readString(row, [
    'estado',
    'Estado',
    'status',
    'Status',
    'estadoCierre',
    'EstadoCierre',
    'nombreEstado',
    'NombreEstado',
    'nombre_estado',
    'Nombre_Estado',
    'estadoNombre',
    'EstadoNombre',
    'nombre',
    'Nombre',
  ])
}

const normalizeEstado = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type OtDashboardTab = 'pendientes' | 'finalizadas'

const OT_DASHBOARD_TABS: { id: OtDashboardTab; label: string }[] = [
  { id: 'pendientes', label: 'General (pendientes)' },
  { id: 'finalizadas', label: 'Finalizadas' },
]
const OT_DASHBOARD_FORCE_REFRESH_KEY = 'ot-dashboard-force-refresh'

const getEstadoBadgeClass = (estado: string): string => {
  const normalized = normalizeEstado(estado)
  if (normalized.includes('fallida')) {
    return 'border-rose-200 bg-rose-100 text-rose-700'
  }
  if (normalized.includes('finalizado') || normalized.includes('finalizada')) {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  }
  return 'border-amber-200 bg-amber-100 text-amber-700'
}

const getFecha = (row: OtSummary): string => {
  return readString(row, [
    'inicio_agendado',
    'Inicio_Agendado',
    'InicioAgendado',
    'fecha',
    'Fecha',
    'fechaEjecucion',
    'Fecha_Ejecucion',
    'FechaEjecucion',
  ])
}

const getFechaEjecucion = (row: OtSummary): string => {
  return readString(row, [
    'fecha_ejecucion',
    'Fecha_Ejecucion',
    'fechaEjecucion',
    'FechaEjecucion',
    'fecha',
    'Fecha',
  ])
}

const getIdVenta = (row: OtSummary): string => {
  return getNumericString(row, ['id_venta', 'Id_Venta', 'idVenta', 'IdVenta', 'id', 'Id'])
}

const getIdTipoServicio = (row: OtSummary): string => {
  return getNumericString(row, [
    'id_tiposervicio',
    'Id_TipoServicio',
    'idTipoServicio',
    'IdTipoServicio',
    'id_tipo_servicio',
    'Id_Tipo_Servicio',
  ])
}

const getTor = (row: OtSummary): string => {
  return readString(row, ['tor', 'TOR', 'Tor'])
}

const getOrigen = (row: OtSummary): string => {
  return readString(row, ['origen', 'Origen'])
}

const isAgendaRow = (row: OtSummary): boolean => {
  const origenNorm = normalizeEstado(getOrigen(row))
  if (origenNorm.includes('manual')) return false
  const tor = getTor(row).trim()
  const inicioAgendado = readString(row, ['inicio_agendado', 'Inicio_Agendado', 'InicioAgendado']).trim()
  return Boolean(tor || inicioAgendado)
}

const getClienteLabel = (row: OtSummary): string => {
  const cliente = getClienteNro(row).trim()
  if (cliente) return cliente
  const clienteNombre = readString(row, ['cliente', 'Cliente', 'nombreCliente', 'NombreCliente']).trim()
  return clienteNombre || 'SIN CLIENTE'
}

const getGrupo = (row: OtSummary): string => {
  return readString(row, ['grupo', 'Grupo', 'ruta', 'Ruta', 'nombreRuta', 'NombreRuta'])
}

const getTecnicoNombre = (row: OtSummary): string => {
  return readString(row, [
    'tecnico',
    'Tecnico',
    'nombreTecnico',
    'NombreTecnico',
    'nombreUsuario',
    'NombreUsuario',
    'usuario',
    'Usuario',
    'nombre',
    'Nombre',
    'vendedor',
    'Vendedor',
    'nombreVendedor',
    'NombreVendedor',
  ])
}

const getNumericString = (row: OtSummary, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return String(parsed)
  }
  return ''
}

const normalizeToISODate = (value: string): string => {
  const source = value.trim()
  if (!source) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source

  const ddmmyyyy = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return ''
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateTimestamp = (source: string): number => {
  const value = source.trim()
  if (!value) return 0

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime()
  }

  const iso = normalizeToISODate(value)
  if (!iso) return 0

  const parsedIso = new Date(`${iso}T00:00:00`)
  return Number.isNaN(parsedIso.getTime()) ? 0 : parsedIso.getTime()
}

const formatDateTimeDisplay = (source: string): string => {
  const value = source.trim()
  if (!value) return ''

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0')
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const year = String(parsed.getFullYear())
    const hours = String(parsed.getHours()).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')
    const seconds = String(parsed.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  const isoDate = normalizeToISODate(value)
  if (!isoDate) return value
  const [, yyyy, mm, dd] = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []
  if (!yyyy || !mm || !dd) return value

  return `${dd}/${mm}/${yyyy} 00:00:00`
}

const buildVentaValidationKey = (fecha: string, ot: string, clienteNro: string): string => {
  return `${normalizeToISODate(fecha)}|${ot.trim()}|${clienteNro.trim()}`
}

const buildRegistroBloqueoKey = (fecha: string, idRuta: string, idSucursal: string): string => {
  return `${normalizeToISODate(fecha)}|${idRuta.trim()}|${idSucursal.trim()}`
}

const toPositiveNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(String(value).trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.trunc(parsed)
}

const normalizeDetailKey = (key: string): string => key.replace(/[\s_-]+/g, '').toLowerCase()

const shouldHideIdField = (key: string): boolean => normalizeDetailKey(key).startsWith('id')
const shouldFormatDetailDateField = (key: string): boolean => {
  const normalized = normalizeDetailKey(key)
  return normalized.includes('fecha') || normalized.includes('date') || normalized.includes('hora')
}

const toDetailLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

const toDetailValue = (value: unknown, key?: string): string => {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-'
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return '-'
    if (key && shouldFormatDetailDateField(key)) {
      return formatDateTimeDisplay(raw) || '-'
    }
    return raw
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const sanitizeDetailRow = (row: Record<string, unknown>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (shouldHideIdField(key)) continue
    out[key] = toDetailValue(value, key)
  }
  return out
}

const omitDetailKeys = (row: Record<string, string>, keysToHide: string[]): Record<string, string> => {
  if (!keysToHide.length) return row
  const hidden = new Set(keysToHide.map(normalizeDetailKey))
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (hidden.has(normalizeDetailKey(key))) continue
    out[key] = value
  }
  return out
}

type NoticeTone = 'amber' | 'rose' | 'slate'
type BlockedCategory = 'loading' | 'cierre' | 'error' | 'cuadre' | 'complete' | null

const getNoticeClasses = (tone: NoticeTone, extraClassName = ''): string => {
  const palette =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'slate'
        ? 'border-slate-200 bg-slate-50 text-slate-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'

  return `${palette} ${extraClassName}`.trim()
}

type OtCardUiStateArgs = {
  isCheckingCierreGlobal: boolean
  hasCierreGlobal: boolean
  cierreGlobalMessage: string
  hasCierreGlobalError: boolean
  isCheckingBloqueo: boolean
  bloqueoError: boolean
  hasCierre: boolean
  cierreMessage: string
  hasCuadre: boolean
  isValidatingVenta: boolean
  validationError: boolean
  cantidadVentas: number
  isValidatingDetalle: boolean
  cantidadDetalles: number
  addMaterialOCargoUsuario: boolean
  habilitarCargarMaterial: boolean
}

type OtCardUiState = {
  registroBloqueado: boolean
  finalizarDisabled: boolean
  materialDisabled: boolean
  finalizarTitle: string
  materialTitle: string
  finalizarLabel: string
  materialLabel: string
  blockedNotice: string | null
  blockedNoticeTone: NoticeTone
  blockedCategory: BlockedCategory
  isFullyBlocked: boolean
}

const buildOtCardUiState = (args: OtCardUiStateArgs): OtCardUiState => {
  const ventaYaRegistrada = args.cantidadVentas > 0
  const detalleYaRegistrado = args.cantidadDetalles > 0
  const requiereMaterial = args.addMaterialOCargoUsuario
  const onlyFinalizar = !ventaYaRegistrada && !detalleYaRegistrado
  const onlyMaterial = ventaYaRegistrada && !detalleYaRegistrado
  const flujoFinalizado = (ventaYaRegistrada && detalleYaRegistrado) || (ventaYaRegistrada && !requiereMaterial)

  const registroBloqueado =
    args.hasCierreGlobal || args.hasCierre || args.hasCuadre || args.hasCierreGlobalError || args.bloqueoError

  const finalizarDisabled =
    args.isValidatingVenta || args.isCheckingCierreGlobal || args.isCheckingBloqueo || registroBloqueado || !onlyFinalizar

  const materialDisabled =
    args.isValidatingDetalle ||
    args.isCheckingCierreGlobal ||
    args.isCheckingBloqueo ||
    registroBloqueado ||
    !args.habilitarCargarMaterial

  const finalizarTitle = args.isCheckingCierreGlobal
    ? 'Validando cierre de agenda...'
    : args.hasCierreGlobal
      ? args.cierreGlobalMessage || 'Existe cierre de almacen para la fecha seleccionada.'
      : args.hasCierreGlobalError
        ? 'No se pudo validar el cierre de almacen. Intente nuevamente o revise el servicio.'
        : args.isCheckingBloqueo
          ? 'Validando cierre/cuadre...'
          : args.bloqueoError
            ? 'No se pudo validar cierre o cuadre para la ruta. Intente nuevamente o revise el servicio.'
            : args.hasCierre
              ? args.cierreMessage || 'La ruta ya tiene cierre de almacen.'
              : args.hasCuadre
                ? 'La ruta ya realizo cuadre.'
                : args.isValidatingVenta
                  ? 'Validando venta registrada...'
                  : flujoFinalizado
                    ? detalleYaRegistrado
                      ? 'Esta OT ya fue finalizada (venta y material registrados).'
                      : 'Esta OT ya fue finalizada.'
                    : onlyMaterial
                      ? 'Ya existe venta registrada. Debes usar Cargar Material.'
                      : !onlyFinalizar && !onlyMaterial
                        ? 'Estado inconsistente: existe detalle sin venta. Validar con backend.'
                    : args.validationError
                      ? 'No se pudo validar venta por API en este intento.'
                      : 'Finalizar OT'

  const materialTitle = args.isCheckingCierreGlobal
    ? 'Validando cierre de agenda...'
    : args.hasCierreGlobal
      ? args.cierreGlobalMessage || 'Existe cierre de almacen para la fecha seleccionada.'
      : args.hasCierreGlobalError
        ? 'No se pudo validar el cierre de almacen.'
        : args.isCheckingBloqueo
          ? 'Validando cierre/cuadre...'
          : args.bloqueoError
            ? 'No se pudo validar cierre o cuadre para la ruta.'
            : args.hasCierre
              ? args.cierreMessage || 'La ruta ya tiene cierre de almacen.'
              : args.hasCuadre
                ? 'La ruta ya realizo cuadre.'
                  : args.isValidatingDetalle
                    ? 'Validando detalle en codigo venta...'
                    : flujoFinalizado
                      ? detalleYaRegistrado
                        ? 'Ya existe detalle en tbl_codigoventa para esta fila.'
                        : 'Esta OT no requiere carga de material.'
                      : !args.addMaterialOCargoUsuario
                        ? 'El estado actual de la OT no permite Cargar Material.'
                      : !ventaYaRegistrada
                        ? 'Primero debes registrar la OT (Finalizar OT).'
                      : !args.habilitarCargarMaterial
                        ? 'Estado inconsistente: existe detalle sin venta. Validar con backend.'
                       : 'Cargar Material'

  const finalizarLabel =
    args.isCheckingCierreGlobal || args.isCheckingBloqueo || args.isValidatingVenta
      ? 'Validando...'
      : args.hasCierreGlobal || args.hasCierre
        ? 'Cierre Registrado'
        : args.hasCierreGlobalError || args.bloqueoError
          ? 'Error Validacion'
          : args.hasCuadre
            ? 'Cuadre Registrado'
            : 'Finalizar OT'

  const materialLabel =
    args.isCheckingCierreGlobal || args.isCheckingBloqueo || args.isValidatingDetalle
      ? 'Validando...'
      : args.hasCierreGlobal || args.hasCierre
        ? 'Cierre Registrado'
        : args.hasCierreGlobalError || args.bloqueoError
          ? 'Error Validacion'
          : args.hasCuadre
            ? 'Cuadre Registrado'
            : 'Cargar Material'

  let blockedNotice: string | null = null
  let blockedNoticeTone: NoticeTone = 'amber'
  let blockedCategory: BlockedCategory = null

  if (finalizarDisabled && materialDisabled) {
    if (args.isCheckingCierreGlobal || args.isCheckingBloqueo || args.isValidatingVenta || args.isValidatingDetalle) {
      blockedNotice = 'Estamos validando cierre, cuadre y registros para esta OT. Espera unos segundos.'
      blockedCategory = 'loading'
      blockedNoticeTone = 'amber'
    } else if (args.hasCierreGlobal) {
      blockedNotice = args.cierreGlobalMessage || 'No se puede continuar porque existe cierre de almacen para la fecha seleccionada.'
      blockedCategory = 'cierre'
      blockedNoticeTone = 'amber'
    } else if (args.hasCierreGlobalError || args.bloqueoError || args.validationError) {
      blockedNotice = 'No se pudo validar el estado de esta OT con el backend. Revisa el servicio e intenta nuevamente.'
      blockedCategory = 'error'
      blockedNoticeTone = 'rose'
    } else if (args.hasCierre) {
      blockedNotice = args.cierreMessage || 'No se puede continuar porque la ruta ya tiene cierre de almacen.'
      blockedCategory = 'cierre'
      blockedNoticeTone = 'amber'
    } else if (args.hasCuadre) {
      blockedNotice = 'No se puede continuar porque la ruta ya realizo cuadre.'
      blockedCategory = 'cuadre'
      blockedNoticeTone = 'amber'
    } else if (flujoFinalizado) {
      blockedNotice = detalleYaRegistrado
        ? 'Esta OT ya fue finalizada y tambien ya tiene cargado el material.'
        : 'Esta OT ya fue finalizada y no requiere carga de material.'
      blockedCategory = 'complete'
      blockedNoticeTone = 'slate'
    } else if (!args.addMaterialOCargoUsuario) {
      blockedNotice = 'El estado actual de la OT no permite cargar material.'
      blockedCategory = 'complete'
      blockedNoticeTone = 'slate'
    } else {
      blockedNotice = 'No hay acciones disponibles para esta OT en este momento.'
      blockedCategory = 'complete'
      blockedNoticeTone = 'slate'
    }
  }

  return {
    registroBloqueado,
    finalizarDisabled,
    materialDisabled,
    finalizarTitle,
    materialTitle,
    finalizarLabel,
    materialLabel,
    blockedNotice,
    blockedNoticeTone,
    blockedCategory,
    isFullyBlocked: finalizarDisabled && materialDisabled,
  }
}

const OtDashboardPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { usuario, roleName } = useAuth()
  const todayValue = todayISO()
  const [fechaFiltro, setFechaFiltro] = useState(todayValue)
  const fecha = fechaFiltro
  const [estadoTab, setEstadoTab] = useState<OtDashboardTab>('pendientes')
  const isFinalizadasTab = estadoTab === 'finalizadas'
  const isPendientesTab = estadoTab === 'pendientes'
  const [showListFilters, setShowListFilters] = useState(false)
  const [nroOtFilter, setNroOtFilter] = useState('')
  const [codClienteFilter, setCodClienteFilter] = useState('')
  const [navError, setNavError] = useState<string | null>(null)
  const [materialClickKey, setMaterialClickKey] = useState<string | null>(null)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [detalleModalLoading, setDetalleModalLoading] = useState(false)
  const [detalleModalError, setDetalleModalError] = useState<string | null>(null)
  const [detalleModalData, setDetalleModalData] = useState<OtRegistroCompletoVenta | null>(null)
  const [detalleModalTitle, setDetalleModalTitle] = useState('Detalle de registro OT')
  const [detalleLoadingCardKey, setDetalleLoadingCardKey] = useState<string | null>(null)
  const refreshToken = (location.state as { refreshToken?: number } | null)?.refreshToken ?? 0

  const query = useQuery({
    queryKey: ['ot-dashboard-lista', fecha, usuario?.idUsuario ?? 0, roleName ?? '', refreshToken],
    queryFn: () =>
      fetchSupervisorUltimoEstadoDia({
        fecha,
        idUsuario: usuario?.idUsuario,
        tecnico: usuario?.nombre,
        rol: roleName || undefined,
      }),
    enabled: !isFinalizadasTab,
  })

  const finalizadasQuery = useQuery({
    queryKey: ['ot-dashboard-lista-finalizadas', fecha, usuario?.idUsuario ?? 0, roleName ?? '', refreshToken],
    queryFn: () =>
      fetchOtFinalizadas({
        fecha,
        usuario: usuario?.idUsuario,
      }),
    enabled: isFinalizadasTab,
  })

  const manualPendientesQuery = useQuery({
    queryKey: ['ot-dashboard-lista-manuales-pendientes', fecha, usuario?.idUsuario ?? 0, refreshToken],
    queryFn: () =>
      fetchOtFinalizadas({
        fecha,
        usuario: usuario?.idUsuario,
      }),
    enabled: isPendientesTab,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const marker = window.sessionStorage.getItem(OT_DASHBOARD_FORCE_REFRESH_KEY)
    const shouldForceRefresh = Boolean(marker) || refreshToken > 0
    if (marker) {
      window.sessionStorage.removeItem(OT_DASHBOARD_FORCE_REFRESH_KEY)
    }
    if (!shouldForceRefresh) return
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista-finalizadas'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-venta'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-bloqueo-registro'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-cierre-agenda'] }),
      ])
      if (isFinalizadasTab) {
        await finalizadasQuery.refetch()
      } else {
        await query.refetch()
      }
    })()
  }, [finalizadasQuery.refetch, isFinalizadasTab, query.refetch, queryClient, refreshToken])

  useEffect(() => {
    if (!isPendientesTab) return
    if (fechaFiltro === todayValue) return
    setFechaFiltro(todayValue)
  }, [fechaFiltro, isPendientesTab, todayValue])

  const cierreAgendaQuery = useQuery({
    queryKey: ['ot-dashboard-validar-cierre-agenda', fecha],
    queryFn: () => validateExisteCierreAlmacen({ fecha }),
    staleTime: 60_000,
    retry: 1,
    enabled: !isFinalizadasTab,
  })

  const rows = useMemo(() => {
    if (isFinalizadasTab) {
      return finalizadasQuery.data ?? []
    }

    const baseRows = query.data ?? []
    const manualRows = (manualPendientesQuery.data ?? []).filter((row) =>
      normalizeEstado(getOrigen(row)).includes('manual')
    )
    if (manualRows.length === 0) {
      return baseRows
    }

    const merged = new Map<string, OtSummary>()
    const buildMergeKey = (row: OtSummary): string => {
      const ot = getOtCodigo(row).trim()
      const cliente = getClienteNro(row).trim()
      if (ot && cliente) {
        return `otcliente:${ot}|${cliente}`
      }
      const idVentaRaw = getIdVenta(row).trim()
      const idVentaNumber = Number(idVentaRaw)
      if (Number.isFinite(idVentaNumber) && idVentaNumber > 0) {
        return `idventa:${Math.trunc(idVentaNumber)}`
      }
      return [
        ot,
        cliente,
        (getFechaEjecucion(row).trim() || getFecha(row).trim()),
        normalizeEstado(getOrigen(row)),
      ].join('|')
    }

    for (const row of baseRows) {
      merged.set(buildMergeKey(row), row)
    }
    for (const row of manualRows) {
      const key = buildMergeKey(row)
      if (!merged.has(key)) {
        merged.set(key, row)
      }
    }
    return Array.from(merged.values())
  }, [finalizadasQuery.data, isFinalizadasTab, manualPendientesQuery.data, query.data])

  // No descartar filas por aliases de columnas: algunos SPs devuelven nombres
  // distintos y el filtro estricto puede ocultar todo el listado.
  const allRows = useMemo(() => rows, [rows])

  const validationTargets = useMemo(() => {
    if (isFinalizadasTab) return []
    const unique = new Map<string, { key: string; fecha: string; ot: string; clienteNro: string; desdeAgenda: boolean }>()
    for (const row of allRows) {
      const ot = getOtCodigo(row).trim()
      const clienteNro = getClienteNro(row).trim()
      if (!ot || !clienteNro) continue
      const fechaFila = getFecha(row).trim() || fecha
      const key = buildVentaValidationKey(fechaFila, ot, clienteNro)
      const agendaSource = isAgendaRow(row)
      if (!unique.has(key)) {
        unique.set(key, { key, fecha: fechaFila, ot, clienteNro, desdeAgenda: agendaSource })
      } else if (agendaSource) {
        const prev = unique.get(key)!
        unique.set(key, { ...prev, desdeAgenda: true })
      }
    }
    return Array.from(unique.values())
  }, [allRows, fecha, isFinalizadasTab])

  const ventaValidationQueries = useQueries({
    queries: validationTargets.map((target) => ({
      queryKey: ['ot-dashboard-validar-venta', target.key, refreshToken],
      queryFn: () =>
        validateVentaYDetalle({
          fecha: target.fecha,
          ot: target.ot,
          clienteNro: target.clienteNro,
          incluirManual: true,
          desdeAgenda: target.desdeAgenda,
        }),
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const ventaValidationByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        exists: boolean
        hasDetalle: boolean
        cantidadVentas: number
        cantidadDetalles: number
        addMaterialOCargoUsuario: boolean
        habilitarCargarMaterial: boolean
        isLoading: boolean
        isError: boolean
      }
    >()
    for (let index = 0; index < validationTargets.length; index += 1) {
      const target = validationTargets[index]
      const queryState = ventaValidationQueries[index]
      map.set(target.key, {
        exists: queryState.data?.existeVenta ?? false,
        hasDetalle: queryState.data?.tieneDetalleEnCodigoVenta ?? false,
        cantidadVentas: queryState.data?.cantidadVentas ?? 0,
        cantidadDetalles: queryState.data?.cantidadDetalles ?? 0,
        addMaterialOCargoUsuario: queryState.data?.addMaterialOCargoUsuario ?? false,
        habilitarCargarMaterial: queryState.data?.habilitarCargarMaterial ?? false,
        isLoading: queryState.isLoading || queryState.isFetching,
        isError: queryState.isError,
      })
    }
    return map
  }, [validationTargets, ventaValidationQueries])

  const bloqueoTargets = useMemo(() => {
    if (isFinalizadasTab) return []
    const unique = new Map<string, { key: string; fecha: string; idRuta: number; idSucursal: number | null }>()
    for (const row of allRows) {
      const idRutaRaw = getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta', 'id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
      if (!idRutaRaw) continue
      const idRuta = Number(idRutaRaw)
      if (!Number.isFinite(idRuta) || idRuta <= 0) continue

      const idSucursalRaw = getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
      const idSucursalParsed = idSucursalRaw ? Number(idSucursalRaw) : null
      const fechaFila = getFecha(row).trim() || fecha
      const key = buildRegistroBloqueoKey(fechaFila, String(idRuta), idSucursalRaw)

      if (!unique.has(key)) {
        unique.set(key, {
          key,
          fecha: fechaFila,
          idRuta,
          idSucursal: idSucursalParsed !== null && Number.isFinite(idSucursalParsed) && idSucursalParsed > 0 ? idSucursalParsed : null,
        })
      }
    }
    return Array.from(unique.values())
  }, [allRows, fecha, isFinalizadasTab])

  const bloqueoQueries = useQueries({
    queries: bloqueoTargets.map((target) => ({
      queryKey: ['ot-dashboard-validar-bloqueo-registro', target.key, refreshToken],
      queryFn: async () => {
        const [cierreAgenda, hasCuadre] = await Promise.all([
          validateExisteCierreAlmacen({
            fecha: target.fecha,
          }),
          validateCuadreRuta({
            idRuta: target.idRuta,
            fecha: target.fecha,
          }),
        ])
        return { hasCierre: cierreAgenda.bloqueado, hasCuadre }
      },
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const bloqueoByKey = useMemo(() => {
    const map = new Map<string, { hasCierre: boolean; hasCuadre: boolean; isLoading: boolean; isError: boolean }>()
    for (let index = 0; index < bloqueoTargets.length; index += 1) {
      const target = bloqueoTargets[index]
      const queryState = bloqueoQueries[index]
      map.set(target.key, {
        hasCierre: queryState.data?.hasCierre ?? false,
        hasCuadre: queryState.data?.hasCuadre ?? false,
        isLoading: queryState.isLoading || queryState.isFetching,
        isError: queryState.isError,
      })
    }
    return map
  }, [bloqueoQueries, bloqueoTargets])

  const finalizadasEstadoTargets = useMemo(() => {
    if (!isFinalizadasTab) return []
    const unique = new Map<string, number>()
    for (const row of allRows) {
      const idVentaRaw = getIdVenta(row).trim()
      const idVenta = Number(idVentaRaw)
      if (!idVentaRaw || !Number.isFinite(idVenta) || idVenta <= 0) continue
      if (!unique.has(idVentaRaw)) {
        unique.set(idVentaRaw, idVenta)
      }
    }
    return Array.from(unique.entries()).map(([key, idVenta]) => ({ key, idVenta }))
  }, [allRows, isFinalizadasTab])

  const finalizadasEstadoQueries = useQueries({
    queries: finalizadasEstadoTargets.map((target) => ({
      queryKey: ['ot-dashboard-estado-cierre', target.key, refreshToken],
      queryFn: async () => {
        const registro = await fetchOtRegistroCompleto(target.idVenta)
        const cabecera = registro.cabecera as Record<string, unknown> | null
        if (!cabecera) return { estado: '', idTipoServicio: '' }
        const estadoCierreRaw = cabecera.estadoCierre ?? cabecera.EstadoCierre ?? cabecera.estado ?? cabecera.Estado
        const estadoCierre = typeof estadoCierreRaw === 'string' ? estadoCierreRaw.trim() : String(estadoCierreRaw ?? '').trim()
        const idTipoServicioRaw =
          cabecera.id_tiposervicio ??
          cabecera.Id_TipoServicio ??
          cabecera.idTipoServicio ??
          cabecera.IdTipoServicio ??
          cabecera.id_tipo_servicio ??
          cabecera.Id_Tipo_Servicio ??
          ''
        const idTipoServicio = String(idTipoServicioRaw).trim()
        return { estado: estadoCierre, idTipoServicio }
      },
      staleTime: 60_000,
      retry: 1,
      enabled: isFinalizadasTab,
    })),
  })

  const finalizadasEstadoByVenta = useMemo(() => {
    const map = new Map<string, { estado: string; idTipoServicio: string }>()
    for (let index = 0; index < finalizadasEstadoTargets.length; index += 1) {
      const target = finalizadasEstadoTargets[index]
      const queryState = finalizadasEstadoQueries[index]
      const estado = (queryState.data?.estado ?? '').trim()
      const idTipoServicio = (queryState.data?.idTipoServicio ?? '').trim()
      if (estado || idTipoServicio) {
        map.set(target.key, { estado, idTipoServicio })
      }
    }
    return map
  }, [finalizadasEstadoQueries, finalizadasEstadoTargets])

  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio-ot-dashboard'],
    queryFn: fetchTiposServicio,
    staleTime: 300_000,
    enabled: isFinalizadasTab,
  })

  const tipoServicioNombreById = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    const map = new Map<string, string>()
    for (const row of rows) {
      const item = row as Record<string, unknown>
      const id = String(
        item.idTipoServicio ??
          item.IdTipoServicio ??
          item.Id_TipoServicio ??
          item.id_tipo_servicio ??
          item.id ??
          item.Id ??
          ''
      )
        .trim()
      if (!id) continue
      const nombre = String(
        item.nombre ??
          item.Nombre ??
          item.tipoServicio ??
          item.TipoServicio ??
          item.descripcion ??
          item.Descripcion ??
          ''
      ).trim()
      if (!nombre) continue
      map.set(id, nombre)
    }
    return map
  }, [tiposServicioQuery.data])

  const activeListQuery = isFinalizadasTab ? finalizadasQuery : query

  const errorMessage =
    activeListQuery.isError && activeListQuery.error instanceof Error && activeListQuery.error.message
      ? activeListQuery.error.message
      : activeListQuery.isError
        ? isFinalizadasTab
          ? 'No se pudo cargar el listado desde tbl_venta.'
          : 'No se pudo cargar el listado OT.'
        : null

  const cierreAgendaErrorMessage =
    cierreAgendaQuery.isError && cierreAgendaQuery.error instanceof Error && cierreAgendaQuery.error.message
      ? cierreAgendaQuery.error.message
      : cierreAgendaQuery.isError
        ? 'No se pudo validar el cierre de almacen.'
        : null

  const cardEntries = useMemo(
    () =>
      allRows.map((row, index) => {
        const ot = getOtCodigo(row).trim()
        const clienteNro = getClienteNro(row).trim()
        const fechaFila = getFecha(row).trim() || fecha
        const fechaEjecucion = getFechaEjecucion(row).trim() || fechaFila
        const idVenta = getIdVenta(row).trim()
        const idTipoServicio = getIdTipoServicio(row).trim()
        const finalizadasMeta = isFinalizadasTab ? finalizadasEstadoByVenta.get(idVenta) : undefined
        const idTipoServicioResolved = idTipoServicio || finalizadasMeta?.idTipoServicio || ''
        const tipoServicioFromRow = readString(row, ['tipoServicio', 'TipoServicio', 'nombreTipoServicio', 'NombreTipoServicio']).trim()
        const tipoServicioNombre = tipoServicioFromRow || tipoServicioNombreById.get(idTipoServicioResolved)?.trim() || ''
        const tor = getTor(row).trim()
        const estadoFromRow = getEstado(row).trim()
        const estadoFromTblEstado = isFinalizadasTab ? finalizadasMeta?.estado?.trim() ?? '' : ''
        const estado = estadoFromTblEstado || estadoFromRow || (isFinalizadasTab ? 'SIN ESTADO' : 'pendiente')
        const origen = getOrigen(row).trim()
        const isManual = normalizeEstado(origen).includes('manual')
        const validationKey = buildVentaValidationKey(fechaFila, ot, clienteNro)
        const validationState = ventaValidationByKey.get(validationKey)
        const cantidadVentas = isFinalizadasTab ? 1 : validationState?.cantidadVentas ?? (validationState?.exists ? 1 : 0)
        const cantidadDetalles = isFinalizadasTab ? 0 : validationState?.cantidadDetalles ?? (validationState?.hasDetalle ? 1 : 0)
        const ventaYaRegistrada = isFinalizadasTab ? true : cantidadVentas > 0
        const isValidatingVenta = isFinalizadasTab ? false : validationState?.isLoading ?? false
        const validationError = isFinalizadasTab ? false : validationState?.isError ?? false
        const isValidatingDetalle = isFinalizadasTab ? false : validationState?.isLoading ?? false
        const detalleYaRegistrado = isFinalizadasTab ? false : cantidadDetalles > 0
        const addMaterialOCargoUsuario = isFinalizadasTab ? false : validationState?.addMaterialOCargoUsuario ?? false
        const habilitarCargarMaterial =
          isFinalizadasTab ? false : validationState?.habilitarCargarMaterial ?? (ventaYaRegistrada && !detalleYaRegistrado)
        const isFinalizada = isFinalizadasTab ? true : (ventaYaRegistrada && detalleYaRegistrado) || (ventaYaRegistrada && !addMaterialOCargoUsuario)
        const estadoVisual = isFinalizadasTab ? estado : isFinalizada ? 'finalizado' : estado
        const estadoBadgeClass = getEstadoBadgeClass(estadoVisual)
        const idRuta = getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta', 'id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
        const idSucursal = getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
        const bloqueoKey = buildRegistroBloqueoKey(fechaFila, idRuta, idSucursal)
        const bloqueoState = bloqueoByKey.get(bloqueoKey)
        const isCheckingBloqueo = isFinalizadasTab ? false : bloqueoState?.isLoading ?? false
        const bloqueoError = isFinalizadasTab ? false : bloqueoState?.isError ?? false
        const hasCierre = isFinalizadasTab ? false : bloqueoState?.hasCierre ?? false
        const hasCuadre = isFinalizadasTab ? false : bloqueoState?.hasCuadre ?? false
        const cierreMensaje = isFinalizadasTab ? '' : cierreAgendaQuery.data?.mensaje?.trim() || ''
        const hasCierreGlobal = isFinalizadasTab ? false : cierreAgendaQuery.data?.bloqueado ?? false
        const isCheckingCierreGlobal = isFinalizadasTab ? false : cierreAgendaQuery.isLoading || cierreAgendaQuery.isFetching
        const hasCierreGlobalError = isFinalizadasTab ? false : cierreAgendaQuery.isError
        const ui = isFinalizadasTab
          ? {
              registroBloqueado: false,
              finalizarDisabled: false,
              materialDisabled: false,
              finalizarTitle: '',
              materialTitle: '',
              finalizarLabel: 'Finalizar OT',
              materialLabel: 'Cargar Material',
              blockedNotice: null,
              blockedNoticeTone: 'slate' as const,
              blockedCategory: null,
              isFullyBlocked: false,
            }
          : buildOtCardUiState({
              isCheckingCierreGlobal,
              hasCierreGlobal,
              cierreGlobalMessage: cierreMensaje,
              hasCierreGlobalError,
              isCheckingBloqueo,
              bloqueoError,
              hasCierre,
              cierreMessage: cierreMensaje,
              hasCuadre,
              isValidatingVenta,
              validationError,
              cantidadVentas,
              isValidatingDetalle,
              cantidadDetalles,
              addMaterialOCargoUsuario,
              habilitarCargarMaterial,
            })

        return {
          row,
          index,
          key: `${ot || 'ot'}-${clienteNro || 'cliente'}-${index}`,
          ot,
          idVenta,
          idTipoServicio: idTipoServicioResolved,
          tipoServicioNombre,
          clienteNro,
          fechaFila,
          fechaEjecucion,
          tor,
          origen,
          isManual,
          estado: estadoVisual,
          estadoBadgeClass,
          ventaYaRegistrada,
          detalleYaRegistrado,
          cantidadVentas,
          cantidadDetalles,
          isFinalizada,
          validationError,
          idRuta,
          idSucursal,
          tecnicoNombre: getTecnicoNombre(row).trim() || (usuario?.nombre ?? '').trim(),
          grupo: getGrupo(row).trim(),
          ui,
        }
      }),
    [
      bloqueoByKey,
      cierreAgendaQuery.data?.bloqueado,
      cierreAgendaQuery.data?.mensaje,
      cierreAgendaQuery.isError,
      cierreAgendaQuery.isFetching,
      cierreAgendaQuery.isLoading,
      allRows,
      fecha,
      finalizadasEstadoByVenta,
      isFinalizadasTab,
      tipoServicioNombreById,
      usuario?.nombre,
      ventaValidationByKey,
    ]
  )

  const visibleCardEntries = useMemo(
    () => {
      const base = cardEntries.filter((card) => {
        if (estadoTab === 'finalizadas') {
          return card.ventaYaRegistrada && !card.isManual
        }
        // En "General (pendientes)" solo van OT no finalizadas.
        return !card.isFinalizada
      })
      if (estadoTab !== 'finalizadas') {
        return [...base].sort((a, b) => {
          if (a.isManual === b.isManual) {
            return a.index - b.index
          }
          return a.isManual ? 1 : -1
        })
      }

      return [...base].sort((a, b) => {
        const fechaA = toDateTimestamp(a.fechaEjecucion || '')
        const fechaB = toDateTimestamp(b.fechaEjecucion || '')
        if (fechaA !== fechaB) return fechaB - fechaA

        const idA = Number(a.idVenta || 0)
        const idB = Number(b.idVenta || 0)
        return idB - idA
      })
    },
    [cardEntries, estadoTab]
  )

  const filteredCardEntries = useMemo(() => {
    const nroOtQuery = nroOtFilter.trim()
    const clienteQuery = codClienteFilter.trim()
    if (!nroOtQuery && !clienteQuery) return visibleCardEntries

    return visibleCardEntries.filter((card) => {
      const otValue = String(card.ot ?? '').trim()
      const clienteValue = String(card.clienteNro ?? '').trim()
      const otDigits = toDigitsOnly(otValue)
      const clienteDigits = toDigitsOnly(clienteValue)

      if (nroOtQuery && !otValue.includes(nroOtQuery) && !otDigits.includes(nroOtQuery)) return false
      if (clienteQuery && !clienteValue.includes(clienteQuery) && !clienteDigits.includes(clienteQuery)) return false
      return true
    })
  }, [codClienteFilter, nroOtFilter, visibleCardEntries])

  const fullyBlockedSummary = useMemo(() => {
    if (isFinalizadasTab) return null
    if (!filteredCardEntries.length) return null

    const fullyBlockedCards = filteredCardEntries.filter((card) => card.ui.isFullyBlocked)
    if (fullyBlockedCards.length !== filteredCardEntries.length) return null

    const countByCategory = new Map<Exclude<BlockedCategory, null>, number>()
    for (const card of fullyBlockedCards) {
      if (!card.ui.blockedCategory) continue
      countByCategory.set(card.ui.blockedCategory, (countByCategory.get(card.ui.blockedCategory) ?? 0) + 1)
    }

    const firstNotice = fullyBlockedCards.find((card) => card.ui.blockedNotice)?.ui.blockedNotice ?? ''
    const loadingCount = countByCategory.get('loading') ?? 0
    const errorCount = countByCategory.get('error') ?? 0
    const cierreCount = countByCategory.get('cierre') ?? 0
    const cuadreCount = countByCategory.get('cuadre') ?? 0
    const completeCount = countByCategory.get('complete') ?? 0

    if (loadingCount > 0) {
      return {
        tone: 'amber' as const,
        message: `Estamos validando las ${filteredCardEntries.length} OT de la pantalla. Mientras termine la consulta, los botones seguiran bloqueados temporalmente.`,
      }
    }

    if (errorCount > 0) {
      return {
        tone: 'rose' as const,
        message:
          firstNotice ||
          'No se pudo validar el estado de cierre/cuadre con el backend. Revisa el servicio para volver a habilitar los botones.',
      }
    }

    if (cierreCount === filteredCardEntries.length) {
      return {
        tone: 'amber' as const,
        message:
          firstNotice ||
          'No hay acciones disponibles porque existe cierre de almacen para la fecha seleccionada.',
      }
    }

    if (cuadreCount === filteredCardEntries.length) {
      return {
        tone: 'amber' as const,
        message: 'No hay acciones disponibles porque todas las rutas de la lista ya realizaron cuadre.',
      }
    }

    if (completeCount === filteredCardEntries.length) {
      return {
        tone: 'slate' as const,
        message: 'Las OT visibles ya fueron procesadas y no tienen acciones pendientes en esta pantalla.',
      }
    }

    return {
      tone: cierreCount + cuadreCount > 0 ? ('amber' as const) : ('slate' as const),
      message:
        firstNotice ||
        'Todas las OT visibles quedaron sin acciones disponibles. Revisa cierres, cuadre o registros ya realizados.',
    }
  }, [filteredCardEntries, isFinalizadasTab])

  const handleEstadoTabChange = (id: string) => {
    if (id === 'pendientes' || id === 'finalizadas') {
      setEstadoTab(id)
    }
  }

  const resolveIdVentaFromCard = async (card: (typeof cardEntries)[number]): Promise<number | null> => {
    const idVentaFromRow = toPositiveNumber(
      getNumericString(card.row, ['id_venta', 'Id_Venta', 'idVenta', 'IdVenta', 'id', 'Id'])
    )
    if (idVentaFromRow) return idVentaFromRow
    if (isFinalizadasTab) return null
    if (!card.ot) return null

    const otRow = await fetchOtByNumero(card.ot)
    return toPositiveNumber(
      String(
        otRow.id_venta ??
          otRow.Id_Venta ??
          otRow.idVenta ??
          otRow.IdVenta ??
          otRow.id ??
          otRow.Id ??
          ''
      )
    )
  }

  const closeDetalleModal = () => {
    if (detalleModalLoading) return
    setDetalleModalOpen(false)
    setDetalleModalError(null)
    setDetalleModalData(null)
    setDetalleLoadingCardKey(null)
  }

  const handleOpenDetalleModal = async (card: (typeof cardEntries)[number]) => {
    setDetalleModalOpen(true)
    setDetalleModalLoading(true)
    setDetalleModalError(null)
    setDetalleModalData(null)
    setDetalleLoadingCardKey(card.key)
    setDetalleModalTitle(`Detalle OT ${card.ot || ''} | Cliente ${card.clienteNro || ''}`)

    try {
      const idVenta = await resolveIdVentaFromCard(card)
      if (!idVenta) {
        throw new Error('No se pudo resolver Id_Venta para consultar el registro.')
      }
      const data = await fetchOtRegistroCompleto(idVenta)

      const baseCabecera =
        data.cabecera && typeof data.cabecera === 'object'
          ? ({ ...(data.cabecera as Record<string, unknown>) } as Record<string, unknown>)
          : ({} as Record<string, unknown>)

      const estadoExistenteRaw =
        baseCabecera.estadoCierre ??
        baseCabecera.EstadoCierre

      const estadoExistente = typeof estadoExistenteRaw === 'string' ? estadoExistenteRaw.trim() : String(estadoExistenteRaw ?? '').trim()
      const estadoCierre = estadoExistente

      if (estadoCierre) {
        // Lo colocamos primero para que sea visible sin scroll horizontal.
        const orderedCabecera: Record<string, unknown> = { estadoCierre }
        for (const [key, value] of Object.entries(baseCabecera)) {
          const normalized = key.replace(/[\s_-]+/g, '').toLowerCase()
          if (normalized === 'estadocierre') continue
          orderedCabecera[key] = value
        }
        setDetalleModalData({ ...data, cabecera: orderedCabecera })
      } else {
        setDetalleModalData(data)
      }
    } catch (error) {
      const defaultMessage = 'No se pudo cargar el detalle de tbl_venta/tbl_codigoventa/tbl_codigoventacargousuario.'
      const message = error instanceof Error && error.message.trim() ? error.message.trim() : defaultMessage
      setDetalleModalError(message)
    } finally {
      setDetalleModalLoading(false)
      setDetalleLoadingCardKey(null)
    }
  }

  const fechaActivaLabel = `${todayValue} (hoy)`

  return (
    <div className="bento-page">
      <section className="glass-panel p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Ordenes de Trabajo</h2>
          </div>
          {activeListQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex min-w-0 gap-2 overflow-x-auto">
              {OT_DASHBOARD_TABS.map((tab) => {
                const active = estadoTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleEstadoTabChange(tab.id)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                      active
                        ? 'border border-brand-500/25 bg-brand-600 text-white shadow-soft'
                        : 'border border-transparent bg-white text-slate-600 hover:border-slate-300 hover:text-brand-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 px-1 lg:justify-end">
              <span className="px-2 text-sm font-medium text-slate-700 whitespace-nowrap">Fecha activa: {fechaActivaLabel}</span>
              <Button
                type="button"
                className="h-9 whitespace-nowrap px-3"
                title="Registrar OT manual"
                onClick={() => {
                  setNavError(null)
                  navigate('/GestionOTs/RegistrarOrdenAgenda', {
                    state: {
                      manual: true,
                      origen: 'Manual',
                      tecnicoNombre: (usuario?.nombre ?? '').trim(),
                      idVendedor: usuario?.idUsuario ? String(usuario.idUsuario) : '',
                      idSucursal: usuario?.idSucursal ? String(usuario.idSucursal) : '',
                    },
                  })
                }}
              >
                + OT manual
              </Button>
              <Button
                variant="secondary"
                type="button"
                className="h-9 whitespace-nowrap"
                onClick={() => setShowListFilters((current) => !current)}
              >
                {showListFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Button>
            </div>
          </div>
        </div>

        {showListFilters ? (
          <div className="mt-3 grid items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
              <span>Nro OT</span>
              <input
                className="input-base h-10 border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                type="text"
                value={nroOtFilter}
                onChange={(event) => setNroOtFilter(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="Ej: 28704355"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
              <span>Cod Cliente</span>
              <input
                className="input-base h-10 border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                type="text"
                value={codClienteFilter}
                onChange={(event) => setCodClienteFilter(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="Ej: 2630691"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
              <span>Fecha</span>
              <input
                className="input-base h-10 border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                type="date"
                value={fecha}
                onChange={(event) => {
                  if (isPendientesTab) return
                  setFechaFiltro(event.target.value || todayValue)
                }}
                disabled={isPendientesTab}
                title={isPendientesTab ? 'En General (pendientes) la fecha esta fija en el dia de hoy.' : undefined}
              />
            </label>
            <Button
              variant="secondary"
              type="button"
              className="h-10 xl:self-end"
              onClick={() => {
                setFechaFiltro(todayValue)
                setNroOtFilter('')
                setCodClienteFilter('')
              }}
              disabled={fecha === todayValue && !nroOtFilter && !codClienteFilter}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{filteredCardEntries.length} registros</span>
        </div>

        <div className="mt-4">
          {navError ? (
            <div className="mb-4 whitespace-pre-line break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {navError}
            </div>
          ) : null}
          {fullyBlockedSummary ? (
            <div
              className={`mb-4 whitespace-pre-line rounded-xl border px-4 py-3 text-sm ${getNoticeClasses(
                fullyBlockedSummary.tone
              )}`}
            >
              {fullyBlockedSummary.message}
            </div>
          ) : null}
          {!isFinalizadasTab && cierreAgendaErrorMessage ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No se pudo validar cierre/cuadre con el backend. Verifica que la API nueva este levantada en el puerto correcto.
              {` Detalle: ${cierreAgendaErrorMessage}`}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
          ) : filteredCardEntries.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {allRows.length === 0
                ? 'Revise registro Conformacion de cuadrillas y/o no hay datos en agenda'
                : estadoTab === 'finalizadas'
                  ? 'No hay registros en tbl_venta para la fecha seleccionada.'
                  : 'No hay OT pendientes para la fecha seleccionada.'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCardEntries.map((card) => {
                const isManualCard = isPendientesTab && card.isManual
                return (
                  <article
                    key={`${card.ot || 'ot'}-${card.clienteNro || 'cliente'}-${card.index}`}
                    className={`bento-tile p-3 sm:p-4 ${isManualCard ? 'bg-amber-50/40 ring-1 ring-amber-200/80' : ''}`}
                  >
                    <div
                      className={`rounded-[1.7rem] border p-3.5 sm:p-5 ${
                        isManualCard ? 'border-amber-300 bg-amber-50/80' : 'border-brand-200/60 bg-white/90'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <h3 className="break-words text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                          CLIENTE: {getClienteLabel(card.row)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {isManualCard ? (
                            <span className="inline-flex w-fit rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                              Manual
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${card.estadoBadgeClass}`}
                          >
                            {card.estado}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1 text-sm break-words text-slate-700">
                        {estadoTab === 'finalizadas' ? (
                          <>
                            <p>
                              <span className="font-semibold">OT:</span> {card.ot || 'Sin OT'}
                            </p>
                            <p>
                              <span className="font-semibold">Tipo servicio:</span>{' '}
                              {card.tipoServicioNombre || card.idTipoServicio || 'Sin tipo'}
                            </p>
                            <p>
                              <span className="font-semibold">Fecha_Ejecucion:</span>{' '}
                              {formatDateTimeDisplay(card.fechaEjecucion || '') || 'Sin fecha'}
                            </p>
                            <p>
                              <span className="font-semibold">NroTrans.:</span> {card.idVenta || 'Sin NroTrans.'}
                            </p>
                            <p>
                              <span className="font-semibold">Origen:</span> {card.origen || 'Sin origen'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              <span className="font-semibold">OT:</span> {card.ot || 'Sin OT'}
                            </p>
                            <p>
                              <span className="font-semibold">Agendado:</span>{' '}
                              {formatDateTimeDisplay(card.fechaEjecucion || card.fechaFila || '') || 'Sin fecha'}
                            </p>
                            {isManualCard ? (
                              <>
                                <p>
                                  <span className="font-semibold">Tipo servicio:</span>{' '}
                                  {card.tipoServicioNombre || card.idTipoServicio || 'Sin tipo'}
                                </p>
                                <p>
                                  <span className="font-semibold">Nro Trans.:</span> {card.idVenta || 'Sin NroTrans.'}
                                </p>
                              </>
                            ) : null}
                          </>
                        )}
                        {estadoTab === 'finalizadas' || isManualCard ? null : (
                          <p>
                            <span className="font-semibold">Tor:</span> {card.tor || 'Sin TOR'}
                          </p>
                        )}
                        {isManualCard ? (
                          <p>
                            <span className="font-semibold">Origen:</span> {card.origen || 'Manual'}
                          </p>
                        ) : null}
                      </div>

                      {estadoTab === 'finalizadas' ? (
                        <div className="mt-5 grid grid-cols-1 gap-2 [&>button]:w-full">
                          {normalizeEstado(String(card.origen ?? '')).includes('manual') ? (
                            <Button
                              type="button"
                              disabled={materialClickKey === card.key}
                              title={
                                materialClickKey === card.key
                                  ? 'Validando transacciones pendientes...'
                                  : 'Cargar material para este registro manual.'
                              }
                              onClick={async () => {
                                if (materialClickKey === card.key) return

                                setMaterialClickKey(card.key)
                                setNavError(null)

                                try {
                                  if (!card.ot || !card.clienteNro) {
                                    setNavError('No se puede cargar material: faltan OT o Codigo Cliente.')
                                    return
                                  }

                                  const fechaValidacion = card.fechaEjecucion || card.fechaFila || fecha
                                  const idRutaValue = Number(
                                    card.idRuta || getNumericString(card.row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta'])
                                  )
                                  const idRuta = Number.isFinite(idRutaValue) && idRutaValue > 0 ? idRutaValue : null

                                  const cierreAgenda = await validateExisteCierreAlmacen({ fecha: fechaValidacion })
                                  if (cierreAgenda.bloqueado) {
                                    setNavError(cierreAgenda.mensaje || 'No se puede continuar porque existe cierre de almacen para la fecha seleccionada.')
                                    return
                                  }

                                  if (idRuta) {
                                    const hasCuadreRuta = await validateCuadreRuta({ idRuta, fecha: fechaValidacion })
                                    if (hasCuadreRuta) {
                                      setNavError('No se puede continuar porque la ruta ya realizo cuadre.')
                                      return
                                    }
                                  }

                                  const ventaDetalle = await validateVentaYDetalle({
                                    fecha: fechaValidacion,
                                    ot: card.ot,
                                    clienteNro: card.clienteNro,
                                    incluirManual: true,
                                  })
                                  if (!ventaDetalle.habilitarCargarMaterial) {
                                    if (ventaDetalle.tieneDetalleEnCodigoVenta) {
                                      setNavError('Esta OT ya tiene material registrado y no permite nueva carga.')
                                    } else {
                                      setNavError('El estado actual de la OT no permite cargar material.')
                                    }
                                    return
                                  }

                                  navigate('/GestionOTs/RegistrarOrdenAgenda_Detalle', {
                                    state: {
                                      numeroOrden: card.ot,
                                      clienteNro: card.clienteNro,
                                      fecha: card.fechaEjecucion || card.fechaFila,
                                      tor: card.tor,
                                      grupo: card.grupo,
                                      tecnicoNombre: card.tecnicoNombre,
                                      idRuta: card.idRuta,
                                      idSucursal: card.idSucursal,
                                      rowData: card.row,
                                    },
                                  })
                                } catch (error) {
                                  const defaultMessage = 'No se pudo validar transacciones pendientes antes de abrir el registro.'
                                  const message = error instanceof Error && error.message.trim() ? error.message.trim() : defaultMessage
                                  setNavError(message)
                                } finally {
                                  setMaterialClickKey((current) => (current === card.key ? null : current))
                                }
                              }}
                            >
                              {materialClickKey === card.key ? 'Validando...' : 'Cargar Material'}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={detalleModalLoading || detalleLoadingCardKey === card.key}
                            onClick={() => {
                              void handleOpenDetalleModal(card)
                            }}
                          >
                            {detalleLoadingCardKey === card.key ? 'Cargando...' : 'Ver registro'}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 [&>button]:w-full">
                          <Button
                            type="button"
                            disabled={card.ui.finalizarDisabled}
                            title={card.ui.finalizarTitle}
                            onClick={() => {
                              const missing: string[] = []
                              if (card.ui.finalizarDisabled) return
                              if (!card.ot) missing.push('OT')
                              if (!card.tor) missing.push('TOR')
                              if (!card.clienteNro) missing.push('Cliente_Nro')
                              if (!card.tecnicoNombre) missing.push('Tecnico')

                              if (missing.length > 0) {
                                setNavError(`No se puede abrir RegistrarOrdenAgenda. Faltan datos obligatorios: ${missing.join(', ')}.`)
                                return
                              }

                              setNavError(null)
                              navigate('/GestionOTs/RegistrarOrdenAgenda', {
                                state: {
                                  ot: card.ot,
                                  tor: card.tor,
                                  clienteNro: card.clienteNro,
                                  estado: card.estado,
                                  grupo: card.grupo,
                                  tecnicoNombre: card.tecnicoNombre,
                                  idVendedor: getNumericString(card.row, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor']),
                                  idRuta: card.idRuta || getNumericString(card.row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta']),
                                  idTipoServicio: getNumericString(card.row, [
                                    'id_tiposervicio',
                                    'Id_TipoServicio',
                                    'idTipoServicio',
                                    'IdTipoServicio',
                                    'id_tipo_servicio',
                                    'Id_Tipo_Servicio',
                                  ]),
                                  idSucursal: card.idSucursal || getNumericString(card.row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal']),
                                  rowData: card.row,
                                },
                              })
                            }}
                          >
                            {card.ui.finalizarLabel}
                          </Button>

                          <Button
                            type="button"
                            disabled={card.ui.materialDisabled || materialClickKey === card.key}
                            title={materialClickKey === card.key ? 'Validando transacciones pendientes...' : card.ui.materialTitle}
                            onClick={async () => {
                              if (card.ui.materialDisabled || materialClickKey === card.key) return

                              setMaterialClickKey(card.key)
                              setNavError(null)

                              try {
                                const fechaValidacion = card.fechaFila || fecha
                                const idRutaValue = Number(
                                  card.idRuta || getNumericString(card.row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta'])
                                )
                                const idRuta = Number.isFinite(idRutaValue) && idRutaValue > 0 ? idRutaValue : null

                                const cierreAgenda = await validateExisteCierreAlmacen({ fecha: fechaValidacion })
                                if (cierreAgenda.bloqueado) {
                                  setNavError(cierreAgenda.mensaje || 'No se puede continuar porque existe cierre de almacen para la fecha seleccionada.')
                                  return
                                }

                                if (idRuta) {
                                  const hasCuadreRuta = await validateCuadreRuta({ idRuta, fecha: fechaValidacion })
                                  if (hasCuadreRuta) {
                                    setNavError('No se puede continuar porque la ruta ya realizo cuadre.')
                                    return
                                  }
                                }

                                navigate('/GestionOTs/RegistrarOrdenAgenda_Detalle', {
                                  state: {
                                    numeroOrden: card.ot,
                                    clienteNro: card.clienteNro,
                                    fecha: card.fechaFila,
                                    tor: card.tor,
                                    grupo: card.grupo,
                                    tecnicoNombre: card.tecnicoNombre,
                                    idRuta: card.idRuta,
                                    idSucursal: card.idSucursal,
                                    rowData: card.row,
                                  },
                                })
                              } catch (error) {
                                const defaultMessage = 'No se pudo validar transacciones pendientes antes de abrir el registro.'
                                const message = error instanceof Error && error.message.trim() ? error.message.trim() : defaultMessage
                                setNavError(message)
                              } finally {
                                setMaterialClickKey((current) => (current === card.key ? null : current))
                              }
                            }}
                          >
                            {materialClickKey === card.key ? 'Validando...' : card.ui.materialLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
        <Modal
          open={detalleModalOpen}
          title={detalleModalTitle}
          onClose={closeDetalleModal}
          containerClassName="w-full max-w-6xl"
          actions={
            <Button type="button" variant="secondary" onClick={closeDetalleModal} disabled={detalleModalLoading}>
              Cerrar
            </Button>
          }
        >
          {detalleModalLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando detalle...</div>
          ) : detalleModalError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{detalleModalError}</div>
          ) : (
            <div className="max-h-[68vh] space-y-4 overflow-auto pr-1">
              {(() => {
                const CABECERA_KEYS_TO_HIDE = [
                  'fechaRegistro',
                  'observacion',
                  'total',
                  'eEliminado',
                  'eliminado',
                  'nombre',
                  'tieneObservacion',
                ]

                const cabeceraRows = detalleModalData?.cabecera
                  ? [omitDetailKeys(sanitizeDetailRow(detalleModalData.cabecera), CABECERA_KEYS_TO_HIDE)]
                  : []
                const instaladosRows = (detalleModalData?.instalados ?? []).map((row) => sanitizeDetailRow(row))
                const retiradosRows = (detalleModalData?.retirados ?? []).map((row) => sanitizeDetailRow(row))
                const cargoRows = (detalleModalData?.cargoUsuario ?? []).map((row) => sanitizeDetailRow(row))

                const renderSection = (
                  title: string,
                  rows: Record<string, string>[],
                  options?: {
                    hideWhenEmpty?: boolean
                    hiddenLabelSet?: Set<string>
                    labelOverrides?: Record<string, string>
                    columnOrder?: string[]
                  }
                ) => {
                  if (options?.hideWhenEmpty && rows.length === 0) return null
                  const normalizeLabel = (value: string): string => value.trim().toLowerCase()
                  const resolveLabel = (key: string): string => {
                    const defaultLabel = toDetailLabel(key)
                    const normalized = normalizeLabel(defaultLabel)
                    return options?.labelOverrides?.[normalized] ?? defaultLabel
                  }
                  const columnKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => {
                    const label = toDetailLabel(key).toLowerCase()
                    return !(options?.hiddenLabelSet?.has(label))
                  })
                  const columnOrderMap = new Map<string, number>()
                  ;(options?.columnOrder ?? []).forEach((label, index) => {
                    columnOrderMap.set(normalizeLabel(label), index)
                  })
                  const originalIndex = new Map<string, number>()
                  columnKeys.forEach((key, idx) => {
                    originalIndex.set(key, idx)
                  })
                  const sortedColumnKeys = [...columnKeys].sort((a, b) => {
                    const labelA = normalizeLabel(resolveLabel(a))
                    const labelB = normalizeLabel(resolveLabel(b))
                    const orderA = columnOrderMap.has(labelA) ? (columnOrderMap.get(labelA) as number) : Number.MAX_SAFE_INTEGER
                    const orderB = columnOrderMap.has(labelB) ? (columnOrderMap.get(labelB) as number) : Number.MAX_SAFE_INTEGER
                    if (orderA !== orderB) return orderA - orderB
                    return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0)
                  })
                  return (
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
                      {rows.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          Sin registros.
                        </div>
                      ) : (
                        <div className="overflow-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-xs">
                            <thead className="bg-slate-100 text-slate-700">
                              <tr>
                                {sortedColumnKeys.map((key) => (
                                  <th key={`${title}-${key}`} className="whitespace-nowrap px-2 py-2 text-left font-semibold">
                                    {resolveLabel(key)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, idx) => (
                                <tr key={`${title}-row-${idx}`} className="border-t border-slate-100">
                                  {sortedColumnKeys.map((key) => (
                                    <td key={`${title}-${idx}-${key}`} className="whitespace-nowrap px-2 py-2 text-slate-700">
                                      {row[key] ?? '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )
                }

                return (
                  <>
                    {renderSection('OT', cabeceraRows)}
                    {renderSection('Detalle-Instalados', instaladosRows, {
                      hideWhenEmpty: true,
                      hiddenLabelSet: new Set(['medida']),
                      labelOverrides: {
                        'cod inicio': 'Serie',
                      },
                      columnOrder: ['nombre', 'cantidad', 'serie', 'chip id'],
                    })}
                    {renderSection('Detalle-Retirados', retiradosRows, {
                      hideWhenEmpty: true,
                      hiddenLabelSet: new Set(['medida']),
                      labelOverrides: {
                        'cod inicio': 'Serie',
                      },
                      columnOrder: ['nombre', 'cantidad', 'serie', 'chip id'],
                    })}
                    {renderSection('Cargo Usuario', cargoRows, {
                      hideWhenEmpty: true,
                      hiddenLabelSet: new Set(['medida']),
                      labelOverrides: {
                        'cod inicio': 'Serie',
                      },
                      columnOrder: ['nombre', 'cantidad', 'serie', 'chip id'],
                    })}
                  </>
                )
              })()}
            </div>
          )}
        </Modal>
      </section>
    </div>
  )
}

export default OtDashboardPage
