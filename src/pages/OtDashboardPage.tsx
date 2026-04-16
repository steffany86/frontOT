import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import { fetchSupervisorUltimoEstadoDia, validateCuadreRuta, validateExisteCierreAlmacen, validateVentaYDetalle } from '../api/otApi'
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

const readIntegerString = (row: OtSummary, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!/^\d+$/.test(normalized)) return ''
    return String(Number(normalized))
  }
  return ''
}

const readBoolean = (row: OtSummary, keys: string[]): boolean | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 's', 'yes', 'y'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return null
}

const getClienteNro = (row: OtSummary): string => {
  return readIntegerString(row, [
    'cliente_nro',
    'Cliente_Nro',
    'clienteNro',
    'ClienteNro',
    'nroCliente',
    'NroCliente',
    'codigoCliente',
    'CodigoCliente',
  ])
}

const getOtCodigo = (row: OtSummary): string => {
  return readIntegerString(row, [
    'ot',
    'OT',
    'ordenTrabajo',
    'OrdenTrabajo',
    'numeroOrden',
    'NumeroOrden',
    'nroOT',
    'NroOT',
    'codigo',
    'Codigo',
  ])
}

const getEstado = (row: OtSummary): string => {
  return readString(row, ['estado', 'Estado', 'status', 'Status'])
}

const normalizeEstado = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

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

const getTor = (row: OtSummary): string => {
  return readString(row, ['tor', 'TOR', 'Tor'])
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

const buildVentaValidationKey = (fecha: string, ot: string, clienteNro: string): string => {
  return `${normalizeToISODate(fecha)}|${ot.trim()}|${clienteNro.trim()}`
}

const buildRegistroBloqueoKey = (fecha: string, idRuta: string, idSucursal: string): string => {
  return `${normalizeToISODate(fecha)}|${idRuta.trim()}|${idSucursal.trim()}`
}

const hasVentaForRow = (row: OtSummary, fechaFiltro: string): boolean => {
  const clienteFila = getClienteNro(row).trim()
  const otFila = getOtCodigo(row).trim()
  if (!clienteFila || !otFila) return false

  const existeVentaFlag = readBoolean(row, [
    'existeVenta',
    'ExisteVenta',
    'tieneVenta',
    'TieneVenta',
    'ventaRegistrada',
    'VentaRegistrada',
    'otRegistrada',
    'OtRegistrada',
    'yaRegistrado',
    'YaRegistrado',
  ])

  const idVenta = Number(getNumericString(row, ['idVenta', 'IdVenta', 'id_venta', 'Id_Venta']))
  const ventaOt = readString(row, ['otVenta', 'OTVenta', 'ordenTrabajoVenta', 'OrdenTrabajoVenta', 'ot', 'OT']).trim()
  const ventaCliente = readString(row, ['clienteNroVenta', 'ClienteNroVenta', 'cliente_nro_venta', 'Cliente_Nro_Venta', 'cliente_nro', 'Cliente_Nro']).trim()
  const ventaFechaRaw = readString(row, ['fechaVenta', 'FechaVenta', 'fecha_venta', 'Fecha_Venta', 'fechaRegistroVenta', 'FechaRegistroVenta']).trim()
  const ventaFecha = normalizeToISODate(ventaFechaRaw)
  const fechaEsperada = normalizeToISODate(fechaFiltro)
  const fechaCoincide = !ventaFecha || !fechaEsperada || ventaFecha === fechaEsperada

  if (idVenta > 0 && fechaCoincide) return true
  if (existeVentaFlag === true && fechaCoincide) return true
  if (ventaOt && ventaCliente) {
    return ventaOt === otFila && ventaCliente === clienteFila && fechaCoincide
  }
  return false
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
  ventaYaRegistrada: boolean
  isValidatingDetalle: boolean
  detalleYaRegistrado: boolean
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
  const registroBloqueado =
    args.hasCierreGlobal || args.hasCierre || args.hasCuadre || args.hasCierreGlobalError || args.bloqueoError

  const finalizarDisabled =
    args.isValidatingVenta || args.isCheckingCierreGlobal || args.isCheckingBloqueo || args.ventaYaRegistrada || registroBloqueado

  const materialDisabled =
    args.isValidatingDetalle ||
    args.isCheckingCierreGlobal ||
    args.isCheckingBloqueo ||
    !args.ventaYaRegistrada ||
    args.detalleYaRegistrado ||
    registroBloqueado

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
                  : args.ventaYaRegistrada
                    ? 'Ya existe registro en tbl_venta/tbl_codigoventa para esta fila.'
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
                  : !args.ventaYaRegistrada
                    ? 'Primero debes registrar la OT.'
                    : args.detalleYaRegistrado
                      ? 'Ya existe detalle en tbl_codigoventa para esta fila.'
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
    } else if (args.ventaYaRegistrada && args.detalleYaRegistrado) {
      blockedNotice = 'Esta OT ya fue finalizada y tambien ya tiene cargado el material.'
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
  const { usuario, roleName } = useAuth()
  const [fecha, setFecha] = useState(todayISO())
  const [navError, setNavError] = useState<string | null>(null)
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
  })

  const cierreAgendaQuery = useQuery({
    queryKey: ['ot-dashboard-validar-cierre-agenda', fecha],
    queryFn: () => validateExisteCierreAlmacen({ fecha }),
    staleTime: 60_000,
    retry: 1,
  })

  const rows = query.data ?? []
  const displayRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          Boolean(getClienteNro(row).trim()) ||
          Boolean(getOtCodigo(row).trim()) ||
          Boolean(getEstado(row).trim()) ||
          Boolean(getTor(row).trim())
      ),
    [rows]
  )

  const validationTargets = useMemo(() => {
    const unique = new Map<string, { key: string; fecha: string; ot: string; clienteNro: string }>()
    for (const row of displayRows) {
      const ot = getOtCodigo(row).trim()
      const clienteNro = getClienteNro(row).trim()
      if (!ot || !clienteNro) continue
      const fechaFila = getFecha(row).trim() || fecha
      const key = buildVentaValidationKey(fechaFila, ot, clienteNro)
      if (!unique.has(key)) {
        unique.set(key, { key, fecha: fechaFila, ot, clienteNro })
      }
    }
    return Array.from(unique.values())
  }, [displayRows, fecha])

  const ventaValidationQueries = useQueries({
    queries: validationTargets.map((target) => ({
      queryKey: ['ot-dashboard-validar-venta', target.key],
      queryFn: () => validateVentaYDetalle({ fecha: target.fecha, ot: target.ot, clienteNro: target.clienteNro }),
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const ventaValidationByKey = useMemo(() => {
    const map = new Map<string, { exists: boolean; hasDetalle: boolean; isLoading: boolean; isError: boolean }>()
    for (let index = 0; index < validationTargets.length; index += 1) {
      const target = validationTargets[index]
      const queryState = ventaValidationQueries[index]
      map.set(target.key, {
        exists: queryState.data?.existeVenta ?? false,
        hasDetalle: queryState.data?.tieneDetalleEnCodigoVenta ?? false,
        isLoading: queryState.isLoading || queryState.isFetching,
        isError: queryState.isError,
      })
    }
    return map
  }, [validationTargets, ventaValidationQueries])

  const bloqueoTargets = useMemo(() => {
    const unique = new Map<string, { key: string; fecha: string; idRuta: number; idSucursal: number | null }>()
    for (const row of displayRows) {
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
  }, [displayRows, fecha])

  const bloqueoQueries = useQueries({
    queries: bloqueoTargets.map((target) => ({
      queryKey: ['ot-dashboard-validar-bloqueo-registro', target.key],
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

  const errorMessage =
    query.isError && query.error instanceof Error && query.error.message
      ? query.error.message
      : query.isError
        ? 'No se pudo cargar el listado OT.'
        : null

  const cierreAgendaErrorMessage =
    cierreAgendaQuery.isError && cierreAgendaQuery.error instanceof Error && cierreAgendaQuery.error.message
      ? cierreAgendaQuery.error.message
      : cierreAgendaQuery.isError
        ? 'No se pudo validar el cierre de almacen.'
        : null

  const cardEntries = useMemo(
    () =>
      displayRows.map((row, index) => {
        const ot = getOtCodigo(row).trim()
        const clienteNro = getClienteNro(row).trim()
        const fechaFila = getFecha(row).trim() || fecha
        const tor = getTor(row).trim()
        const estado = getEstado(row).trim() || 'pendiente'
        const estadoBadgeClass = getEstadoBadgeClass(estado)
        const validationKey = buildVentaValidationKey(fechaFila, ot, clienteNro)
        const validationState = ventaValidationByKey.get(validationKey)
        const ventaYaRegistrada = validationState?.exists ?? hasVentaForRow(row, fecha)
        const isValidatingVenta = validationState?.isLoading ?? false
        const validationError = validationState?.isError ?? false
        const isValidatingDetalle = validationState?.isLoading ?? false
        const detalleYaRegistrado = validationState?.hasDetalle ?? false
        const idRuta = getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta', 'id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
        const idSucursal = getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
        const bloqueoKey = buildRegistroBloqueoKey(fechaFila, idRuta, idSucursal)
        const bloqueoState = bloqueoByKey.get(bloqueoKey)
        const isCheckingBloqueo = bloqueoState?.isLoading ?? false
        const bloqueoError = bloqueoState?.isError ?? false
        const hasCierre = bloqueoState?.hasCierre ?? false
        const hasCuadre = bloqueoState?.hasCuadre ?? false
        const cierreMensaje = cierreAgendaQuery.data?.mensaje?.trim() || ''
        const hasCierreGlobal = cierreAgendaQuery.data?.bloqueado ?? false
        const isCheckingCierreGlobal = cierreAgendaQuery.isLoading || cierreAgendaQuery.isFetching
        const hasCierreGlobalError = cierreAgendaQuery.isError
        const ui = buildOtCardUiState({
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
          ventaYaRegistrada,
          isValidatingDetalle,
          detalleYaRegistrado,
        })

        return {
          row,
          index,
          ot,
          clienteNro,
          fechaFila,
          tor,
          estado,
          estadoBadgeClass,
          ventaYaRegistrada,
          detalleYaRegistrado,
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
      displayRows,
      fecha,
      usuario?.nombre,
      ventaValidationByKey,
    ]
  )

  const fullyBlockedSummary = useMemo(() => {
    if (!cardEntries.length) return null

    const fullyBlockedCards = cardEntries.filter((card) => card.ui.isFullyBlocked)
    if (fullyBlockedCards.length !== cardEntries.length) return null

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
        message: `Estamos validando las ${cardEntries.length} OT de la pantalla. Mientras termine la consulta, los botones seguiran bloqueados temporalmente.`,
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

    if (cierreCount === cardEntries.length) {
      return {
        tone: 'amber' as const,
        message:
          firstNotice ||
          'No hay acciones disponibles porque existe cierre de almacen para la fecha seleccionada.',
      }
    }

    if (cuadreCount === cardEntries.length) {
      return {
        tone: 'amber' as const,
        message: 'No hay acciones disponibles porque todas las rutas de la lista ya realizaron cuadre.',
      }
    }

    if (completeCount === cardEntries.length) {
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
  }, [cardEntries])

  return (
    <div className="bento-page">
      <section className="glass-panel p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Gestion de Ordenes de Trabajo</h2>
            <p className="text-sm text-slate-500">Listado OT por fecha y tecnico autenticado.</p>
          </div>
          {query.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Fecha">
            <input className="input-base" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} disabled />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{displayRows.length} registros</span>
        </div>

        <div className="mt-4">
          {navError ? (
            <div className="mb-4 break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{navError}</div>
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
          {cierreAgendaErrorMessage ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No se pudo validar cierre/cuadre con el backend. Verifica que la API nueva este levantada en el puerto correcto.
              {` Detalle: ${cierreAgendaErrorMessage}`}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
          ) : displayRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No hay OT para la fecha seleccionada.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cardEntries.map((card) => {
                return (
                  <article key={`${card.ot || 'ot'}-${card.clienteNro || 'cliente'}-${card.index}`} className="bento-tile p-3 sm:p-4">
                    <div className="rounded-[1.7rem] border border-brand-200/60 bg-white/90 p-3.5 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <h3 className="break-words text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                          CLIENTE: {getClienteLabel(card.row)}
                        </h3>
                        <span
                          className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${card.estadoBadgeClass}`}
                        >
                          {card.estado}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1 text-sm break-words text-slate-700">
                        <p>
                          <span className="font-semibold">OT:</span> {card.ot || 'Sin OT'}
                        </p>
                        <p>
                          <span className="font-semibold">Agendado:</span> {card.fechaFila || 'Sin fecha'}
                        </p>
                        <p>
                          <span className="font-semibold">Tor:</span> {card.tor || 'Sin TOR'}
                        </p>
                      </div>

                      {card.ui.blockedNotice ? (
                        <div
                          className={`mt-4 whitespace-pre-line rounded-xl border px-3 py-2 text-sm ${getNoticeClasses(
                            card.ui.blockedNoticeTone
                          )}`}
                        >
                          {card.ui.blockedNotice}
                        </div>
                      ) : null}

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
                                grupo: card.grupo,
                                tecnicoNombre: card.tecnicoNombre,
                                idVendedor: getNumericString(card.row, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor']),
                                idRuta: card.idRuta || getNumericString(card.row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta']),
                                idTipoServicio: getNumericString(card.row, ['id_tiposervicio', 'Id_TipoServicio', 'idTipoServicio', 'IdTipoServicio']),
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
                          disabled={card.ui.materialDisabled}
                          title={card.ui.materialTitle}
                          onClick={() => {
                            if (card.ui.materialDisabled) return
                            setNavError(null)
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
                          }}
                        >
                          {card.ui.materialLabel}
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default OtDashboardPage
