import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Table from '../components/common/Table'
import type { Column } from '../components/common/Table'
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
  return readString(row, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'cliente', 'Cliente'])
}

const getOtCodigo = (row: OtSummary): string => {
  return readString(row, ['ot', 'OT', 'ordenTrabajo', 'OrdenTrabajo', 'codigo', 'Codigo'])
}

const getEstado = (row: OtSummary): string => {
  return readString(row, ['estado', 'Estado', 'status', 'Status'])
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

  const columns: Column<OtSummary>[] = [
    {
      key: 'cliente_nro',
      header: 'Cliente Nro',
      render: (row) => getClienteNro(row) || 'Sin dato',
    },
    {
      key: 'ot',
      header: 'OT',
      render: (row) => getOtCodigo(row) || 'Sin OT',
    },
    {
      key: 'fecha',
      header: 'Inicio Agendado',
      render: (row) => getFecha(row) || 'Sin fecha',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => getEstado(row) || 'Sin estado',
    },
    {
      key: 'tor',
      header: 'TOR',
      render: (row) => getTor(row) || 'Sin dato',
    },
    {
      key: 'acciones',
      header: 'Registrar OT',
      render: (row) => {
        const ot = getOtCodigo(row).trim()
        const clienteNro = getClienteNro(row).trim()
        const fechaFila = getFecha(row).trim() || fecha
        const validationKey = buildVentaValidationKey(fechaFila, ot, clienteNro)
        const validationState = ventaValidationByKey.get(validationKey)
        const ventaYaRegistrada = validationState?.exists ?? hasVentaForRow(row, fecha)
        const isValidatingVenta = validationState?.isLoading ?? false
        const validationError = validationState?.isError ?? false
        const idRuta = getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta', 'id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
        const idSucursal = getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
        const bloqueoKey = buildRegistroBloqueoKey(fechaFila, idRuta, idSucursal)
        const bloqueoState = bloqueoByKey.get(bloqueoKey)
        const isCheckingBloqueo = bloqueoState?.isLoading ?? false
        const bloqueoError = bloqueoState?.isError ?? false
        const hasCierre = bloqueoState?.hasCierre ?? false
        const hasCuadre = bloqueoState?.hasCuadre ?? false
        const hasCierreGlobal = cierreAgendaQuery.data?.bloqueado ?? false
        const isCheckingCierreGlobal = cierreAgendaQuery.isLoading || cierreAgendaQuery.isFetching
        const hasCierreGlobalError = cierreAgendaQuery.isError
        const registroBloqueado = hasCierreGlobal || hasCierre || hasCuadre || hasCierreGlobalError || bloqueoError

        return (
          <Button
            type="button"
            disabled={
              isValidatingVenta ||
              isCheckingCierreGlobal ||
              isCheckingBloqueo ||
              ventaYaRegistrada ||
              registroBloqueado
            }
            title={
              isCheckingCierreGlobal
                ? 'Validando cierre de agenda...'
                : hasCierreGlobal
                  ? cierreAgendaQuery.data?.mensaje || 'Existe cierre de almacen para la fecha seleccionada.'
                  : hasCierreGlobalError
                    ? 'No se pudo validar el cierre de almacen. Intente nuevamente o revise el servicio.'
                  : isCheckingBloqueo
                    ? 'Validando cierre/cuadre...'
                    : bloqueoError
                      ? 'No se pudo validar cierre o cuadre para la ruta. Intente nuevamente o revise el servicio.'
                      : hasCierre
                        ? 'La ruta ya tiene cierre de almacen.'
                        : hasCuadre
                          ? 'La ruta ya realizo cuadre.'
                          : isValidatingVenta
                            ? 'Validando venta registrada...'
                            : ventaYaRegistrada
                              ? 'Ya existe registro en tbl_venta/tbl_codigoventa para esta fila.'
                              : validationError
                                ? 'No se pudo validar venta por API en este intento.'
                                : 'Registrar OT'
            }
            onClick={() => {
              if (isValidatingVenta || isCheckingCierreGlobal || isCheckingBloqueo || ventaYaRegistrada || registroBloqueado) return

              const ot = getOtCodigo(row).trim()
              const tor = getTor(row).trim()
              const clienteNro = getClienteNro(row).trim()
              const grupo = getGrupo(row).trim()
              const tecnicoNombre = getTecnicoNombre(row).trim() || (usuario?.nombre ?? '').trim()

              const missing: string[] = []
              if (!ot) missing.push('OT')
              if (!tor) missing.push('TOR')
              if (!clienteNro) missing.push('Cliente_Nro')
              if (!tecnicoNombre) missing.push('Tecnico')

              if (missing.length > 0) {
                setNavError(`No se puede abrir RegistrarOrdenAgenda. Faltan datos obligatorios: ${missing.join(', ')}.`)
                return
              }

              setNavError(null)
              navigate('/ot/RegistrarOrdenAgenda', {
                state: {
                  ot,
                  tor,
                  clienteNro,
                  grupo,
                  tecnicoNombre,
                  idVendedor: getNumericString(row, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor']),
                  idRuta: getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta']),
                  idTipoServicio: getNumericString(row, ['id_tiposervicio', 'Id_TipoServicio', 'idTipoServicio', 'IdTipoServicio']),
                  idSucursal: getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal']),
                  rowData: row,
                },
              })
            }}
          >
            {isCheckingCierreGlobal
              ? 'Validando...'
              : hasCierreGlobal
                ? 'Cierre Registrado'
              : hasCierreGlobalError
                ? 'Error Validacion'
              : isCheckingBloqueo
                ? 'Validando...'
                : bloqueoError
                  ? 'Error Validacion'
                  : hasCierre
                    ? 'Cierre Registrado'
                    : hasCuadre
                      ? 'Cuadre Registrado'
                      : isValidatingVenta
                        ? 'Validando...'
                        : ventaYaRegistrada
                          ? 'OT Registrada'
                          : 'Registrar OT'}
          </Button>
        )
      },
    },
    {
      key: 'detalle-codigoventa',
      header: 'Registrar Detalle',
      render: (row) => {
        const ot = getOtCodigo(row).trim()
        const clienteNro = getClienteNro(row).trim()
        const fechaFila = getFecha(row).trim() || fecha
        const validationKey = buildVentaValidationKey(fechaFila, ot, clienteNro)
        const validationState = ventaValidationByKey.get(validationKey)
        const isValidating = validationState?.isLoading ?? false
        const hasDetalle = validationState?.hasDetalle ?? false
        const hasVenta = validationState?.exists ?? hasVentaForRow(row, fecha)
        const idRuta = getNumericString(row, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta', 'id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
        const idSucursal = getNumericString(row, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
        const bloqueoKey = buildRegistroBloqueoKey(fechaFila, idRuta, idSucursal)
        const bloqueoState = bloqueoByKey.get(bloqueoKey)
        const isCheckingBloqueo = bloqueoState?.isLoading ?? false
        const bloqueoError = bloqueoState?.isError ?? false
        const hasCierre = bloqueoState?.hasCierre ?? false
        const hasCuadre = bloqueoState?.hasCuadre ?? false
        const hasCierreGlobal = cierreAgendaQuery.data?.bloqueado ?? false
        const isCheckingCierreGlobal = cierreAgendaQuery.isLoading || cierreAgendaQuery.isFetching
        const hasCierreGlobalError = cierreAgendaQuery.isError
        const registroBloqueado = hasCierreGlobal || hasCierre || hasCuadre || hasCierreGlobalError || bloqueoError

        return (
          <Button
            type="button"
            disabled={isValidating || isCheckingCierreGlobal || isCheckingBloqueo || !hasVenta || hasDetalle || registroBloqueado}
            title={
              isCheckingCierreGlobal
                ? 'Validando cierre de agenda...'
                : hasCierreGlobal
                  ? cierreAgendaQuery.data?.mensaje || 'Existe cierre de almacen para la fecha seleccionada.'
                  : hasCierreGlobalError
                    ? 'No se pudo validar el cierre de almacen.'
                  : isCheckingBloqueo
                    ? 'Validando cierre/cuadre...'
                    : bloqueoError
                      ? 'No se pudo validar cierre o cuadre para la ruta.'
                      : hasCierre
                        ? 'La ruta ya tiene cierre de almacen.'
                        : hasCuadre
                          ? 'La ruta ya realizo cuadre.'
              : isValidating
                ? 'Validando detalle en codigo venta...'
                : !hasVenta
                  ? 'Primero debes registrar la OT.'
                : hasDetalle
                  ? 'Ya existe detalle en tbl_codigoventa para esta fila.'
                  : 'Registrar detalle'
            }
            onClick={() => {
              if (isValidating || isCheckingCierreGlobal || isCheckingBloqueo || !hasVenta || hasDetalle || registroBloqueado) return
              setNavError(null)
              navigate('/ot/RegistrarOrdenAgenda_Detalle', {
                state: {
                  numeroOrden: ot,
                  clienteNro,
                  fecha: fechaFila,
                  tor: getTor(row).trim(),
                  grupo: getGrupo(row).trim(),
                  tecnicoNombre: getTecnicoNombre(row).trim() || (usuario?.nombre ?? '').trim(),
                  idRuta,
                  idSucursal,
                  rowData: row,
                },
              })
            }}
          >
            {isCheckingCierreGlobal
              ? 'Validando...'
              : hasCierreGlobal
                ? 'Cierre Registrado'
                : hasCierreGlobalError
                  ? 'Error Validacion'
                  : isCheckingBloqueo
                    ? 'Validando...'
                    : bloqueoError
                      ? 'Error Validacion'
                      : hasCierre
                        ? 'Cierre Registrado'
                        : hasCuadre
                          ? 'Cuadre Registrado'
                          : isValidating
                            ? 'Validando...'
                            : !hasVenta
                              ? 'Registrar OT Primero'
                              : hasDetalle
                                ? 'Detalle Registrado'
                                : 'Registrar Detalle'}
          </Button>
        )
      },
    },
  ]

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

  return (
    <div className="bento-page">
      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Gestion de Ordenes de Trabajo</h2>
            <p className="text-sm text-slate-500">Listado OT por fecha y tecnico autenticado.</p>
          </div>
          {query.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Fecha">
            <input className="input-base" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{displayRows.length} registros</span>
        </div>

        <div className="mt-4">
          {navError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{navError}</div>
          ) : null}
          {cierreAgendaErrorMessage ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No se pudo validar cierre/cuadre con el backend. Verifica que la API nueva este levantada en el puerto correcto.
              {` Detalle: ${cierreAgendaErrorMessage}`}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
          ) : (
            <Table columns={columns} data={displayRows} emptyLabel="No hay OT para la fecha seleccionada." />
          )}
        </div>
      </section>
    </div>
  )
}

export default OtDashboardPage
