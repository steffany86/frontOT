import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import api from '../api/http'
import { fetchEstados, fetchRutas, fetchTiposServicio, type CatalogItem } from '../api/catalogApi'
import { fetchOtByNumero, validateCuadreRuta, validateExisteCierreAlmacen } from '../api/otApi'
import { useSessionStore } from '../store/sessionStore'

type AgendaNavState = {
  ot?: string
  tor?: string
  clienteNro?: string
  grupo?: string
  tecnicoNombre?: string
  idVendedor?: string
  idRuta?: string
  idTipoServicio?: string
  idSucursal?: string
  rowData?: UnknownRecord
}

type UnknownRecord = Record<string, unknown>

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const isUnknownRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

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

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const findNumberInRows = (rows: UnknownRecord[], keys: string[]): number | null => {
  for (const row of rows) {
    const value = readNumber(row, keys)
    if (value !== null) return value
  }
  return null
}

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

const RegistrarOTAgendaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSessionStore((state) => state.session)
  const navState = (location.state as AgendaNavState | null) ?? null

  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPrevalidating, setIsPrevalidating] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    enabled: Boolean(clienteNro && ot && tor && tecnicoNombre),
    queryFn: async () => {
      const { data } = await api.get('/ot/spx_ObtenerCaberaVentaParaRegistroOTwb', { params: spParams })
      if (Array.isArray(data)) return data as UnknownRecord[]
      if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: UnknownRecord[] }).data
      }
      if (data && typeof data === 'object') return [data as UnknownRecord]
      return []
    },
  })

  const cabeceraRows = useMemo(() => cabeceraQuery.data ?? [], [cabeceraQuery.data])

  const cabecera = useMemo(() => {
    return cabeceraRows[0] ?? null
  }, [cabeceraRows])

  const otDetailQuery = useQuery({
    queryKey: ['ot-por-numero', otRaw],
    queryFn: () => fetchOtByNumero(otRaw),
    enabled: Boolean(otRaw),
    retry: false,
  })
  const otDetailRow = otDetailQuery.data ?? null

  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio-agenda'],
    queryFn: fetchTiposServicio,
  })

  const resolvedRows = useMemo<UnknownRecord[]>(() => {
    const rows: UnknownRecord[] = []
    if (cabeceraRows.length > 0) rows.push(...cabeceraRows)
    if (otDetailRow) rows.push(otDetailRow)
    if (rowData) rows.push(rowData)
    return rows
  }, [cabeceraRows, otDetailRow, rowData])

  const tipoServicioOptions = useMemo(
    () =>
      mapOptions(
        tiposServicioQuery.data ?? [],
        ['idTipoServicio', 'IdTipoServicio', 'Id_TipoServicio', 'id_tipo_servicio', 'id', 'Id'],
        ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion', 'prefijo', 'Prefijo']
      ),
    [tiposServicioQuery.data]
  )

  const tipoServicioCatalogId = useMemo(() => {
    const target = tor.trim().toLowerCase()
    if (!target) return null
    const normalizedTarget = normalizeKey(target)
    const option =
      tipoServicioOptions.find((item) => normalizeKey(item.label) === normalizedTarget) ??
      tipoServicioOptions.find((item) => normalizeKey(item.label).includes(normalizedTarget)) ??
      null
    if (!option) return null
    const parsed = Number(option.value)
    return Number.isFinite(parsed) ? parsed : null
  }, [tipoServicioOptions, tor])

  const hiddenIdVendedor = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor', 'idusuario', 'IdUsuario'])
    return cabeceraValue ?? navIdVendedor ?? null
  }, [navIdVendedor, resolvedRows])

  const hiddenIdRuta = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta'])
    return cabeceraValue ?? navIdRuta ?? null
  }, [navIdRuta, resolvedRows])

  const hiddenIdGrupo = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
    return cabeceraValue ?? hiddenIdRuta ?? navIdRuta ?? null
  }, [navIdRuta, resolvedRows, hiddenIdRuta])

  const hiddenIdTipoServicio = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_tiposervicio', 'Id_TipoServicio', 'idTipoServicio', 'IdTipoServicio'])
    return cabeceraValue ?? navIdTipoServicio ?? tipoServicioCatalogId ?? null
  }, [navIdTipoServicio, resolvedRows, tipoServicioCatalogId])

  const hiddenIdSucursal = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
    return cabeceraValue ?? navIdSucursal ?? null
  }, [navIdSucursal, resolvedRows])

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

  const clienteVisible = useMemo(() => {
    if (!cabecera) return clienteNro ? String(clienteNro) : ''
    const value = readNumber(cabecera, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'ClienteNro'])
    return value !== null ? String(value) : clienteNro ? String(clienteNro) : ''
  }, [cabecera, clienteNro])

  const sucursalVisible = useMemo(() => {
    for (const row of cabeceraRows) {
      const fromSucursal = readString(row, ['sucursal', 'Sucursal']).trim()
      if (fromSucursal) return fromSucursal
    }
    return ''
  }, [cabeceraRows])

  const tipoServicioLabel = useMemo(() => {
    const target = tor.trim().toLowerCase()
    if (!target) return ''
    const option = tipoServicioOptions.find((item) => normalizeKey(item.label).includes(normalizeKey(target))) ?? null
    if (!option) return tor
    return option.label ? `${option.label} (${tor})` : tor
  }, [tipoServicioOptions, tor])

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-agenda'],
    queryFn: fetchEstados,
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

  const parsedEstadoId = parseNumber(idEstado)
  const hasRequiredIds =
    hiddenIdVendedor !== null &&
    hiddenIdRuta !== null &&
    hiddenIdGrupo !== null &&
    hiddenIdTipoServicio !== null &&
    hiddenIdSucursal !== null

  const missingHeaderFields = useMemo(() => {
    const missing: string[] = []
    if (hiddenIdVendedor === null) missing.push('vendedor (idUsuario/idVendedor)')
    if (hiddenIdRuta === null) missing.push('ruta/grupo (idRuta/idGrupo)')
    if (hiddenIdTipoServicio === null) missing.push('tipo de servicio (idTipoServicio)')
    if (hiddenIdSucursal === null) missing.push('sucursal (idSucursal)')
    return missing
  }, [hiddenIdGrupo, hiddenIdRuta, hiddenIdSucursal, hiddenIdTipoServicio, hiddenIdVendedor])

  const canSubmit = Boolean(session?.idUsuario && hasRequiredIds && parsedEstadoId !== null && otVisible && clienteVisible)

  const requestGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalizacion.')
      setLatitud(null)
      setLongitud(null)
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude)
        setLongitud(position.coords.longitude)
        setGeoLoading(false)
      },
      (error) => {
        setGeoLoading(false)
        setLatitud(null)
        setLongitud(null)
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
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    requestGeolocation()
  }, [])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const ordenTrabajo = parseNumber(otVisible) ?? 0
      const codigoCliente = parseNumber(clienteVisible) ?? 0
      const payload = {
        idUsuario: session?.idUsuario ?? 0,
        idVendedor: hiddenIdVendedor ?? 0,
        idGrupo: hiddenIdGrupo ?? 0,
        idTipoServicio: hiddenIdTipoServicio ?? 0,
        ordenTrabajo,
        idEstado: parsedEstadoId ?? 0,
        codigoCliente,
        idSucursal: hiddenIdSucursal ?? 0,
        nombre: tecnicoVisible,
        origen: 'OT_WEB',
        observacion: observacion.trim(),
        total: 0,
        idUsuarioE: 0,
        eEliminado: false,
        tieneObservacion: Boolean(observacion.trim()),
        latitud: latitud ?? 0,
        longitud: longitud ?? 0,
      }
      const response = await api.post('/ot/spx_RegistrarVentaParaRegistroOTwb', payload)
      return response.data as { data?: { idVenta?: number; ordenTrabajo?: number } }
    },
    onSuccess: (data) => {
      const idVenta = data?.data?.idVenta
      const orden = data?.data?.ordenTrabajo
      setSubmitError(null)
      if (idVenta || orden) {
        setSuccess(`Venta registrada correctamente. IdVenta: ${idVenta ?? '-'} | OT: ${orden ?? '-'}`)
      } else {
        setSuccess('Venta registrada correctamente.')
      }
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'] })
    },
    onError: () => {
      setSuccess(null)
      setSubmitError('No se pudo guardar la OT. Revisa los datos de cabecera y estado.')
      setIsSubmitting(false)
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

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

  const hiddenHeaderMessage = useMemo(() => {
    if (!hasAttemptedSubmit || missingHeaderFields.length === 0) return null
    return `Faltan datos de cabecera requeridos: ${missingHeaderFields.join(', ')}.`
  }, [hasAttemptedSubmit, missingHeaderFields])

  const missingParamsMessage = useMemo(() => {
    const missing: string[] = []
    if (!clienteNro) missing.push('clienteNro')
    if (!ot) missing.push('ot')
    if (!tor) missing.push('tor')
    if (!tecnicoNombre) missing.push('tecnicoNombre')
    return missing.length > 0 ? `Faltan parametros para consultar cabecera: ${missing.join(', ')}.` : null
  }, [clienteNro, ot, tecnicoNombre, tor])

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
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">RegistrarOrdenAgenda</h2>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={async (event) => {
          event.preventDefault()
          setHasAttemptedSubmit(true)
          setSubmitError(null)
          setSuccess(null)
          if (!canSubmit) {
            setSubmitError('Faltan datos requeridos para registrar la OT.')
            return
          }
          if (mutation.isPending || isPrevalidating || isSubmitting) return
          setIsSubmitting(true)
          const canContinue = await runPreRegisterValidations()
          if (!canContinue) {
            setIsSubmitting(false)
            return
          }
          mutation.mutate()
        }}
      >
        <FormCard>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Usuario</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={session?.nombre ?? ''} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tecnico</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={tecnicoVisible} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-red-600">Fecha Ejecucion</label>
              <input
                className="input-base rounded-md border-rose-300 bg-slate-50 py-1.5 text-sm text-rose-600"
                value={formatDateDDMMYYYY(new Date())}
                disabled
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Grupo</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={grupoVisible} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipo Instalacion</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={tipoServicioLabel} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={otVisible} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={clienteVisible} disabled />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Estado</label>
              <select className="input-base rounded-md py-1.5 text-sm" value={idEstado} onChange={(event) => setIdEstado(event.target.value)}>
                <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                {estadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Sucursal</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={sucursalVisible} disabled />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Observacion</label>
              <textarea
                className="input-base h-10 resize-none rounded-md py-1.5 text-sm"
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder="Escribe una observacion"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">Geolocalizacion</span>
                <Button type="button" variant="secondary" onClick={requestGeolocation} disabled={geoLoading}>
                  {geoLoading ? 'Ubicando...' : 'Actualizar'}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Latitud</label>
                  <input className="input-base rounded-md bg-white py-1.5 text-sm" value={latitud ?? 'N/D'} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Longitud</label>
                  <input className="input-base rounded-md bg-white py-1.5 text-sm" value={longitud ?? 'N/D'} disabled />
                </div>
              </div>
              {geoError ? <div className="mt-2 text-rose-600">{geoError}</div> : null}
            </div>
          </div>
        </FormCard>

        {missingParamsMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{missingParamsMessage}</div>
        ) : null}
        {hiddenHeaderMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{hiddenHeaderMessage}</div>
        ) : null}
        {cabeceraQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo cargar la cabecera desde `spx_ObtenerCaberaVentaParaRegistroOTwb`.
            {cabeceraErrorDetail ? <div className="mt-2 break-all text-xs">{cabeceraErrorDetail}</div> : null}
          </div>
        ) : null}
        {showOtDetailError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo obtener el detalle de la OT por número (`fetchOtByNumero`).
            {otDetailErrorDetail ? <div className="mt-2 break-all text-xs">{otDetailErrorDetail}</div> : null}
          </div>
        ) : null}
        {!cabeceraQuery.isLoading && !cabeceraQuery.isError && cabeceraRows.length > 0 && !sucursalVisible ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            El procedimiento `spx_ObtenerCaberaVentaParaRegistroOTwb` no devolvio la sucursal.
          </div>
        ) : null}
        {submitError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</div> : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/ot', { replace: true, state: { refreshToken: Date.now() } })}
            disabled={mutation.isPending || isSubmitting || isPrevalidating}
          >
            {success ? 'Volver' : 'Cancelar'}
          </Button>
          <Button
            type="submit"
            disabled={
              Boolean(success) ||
              mutation.isPending ||
              isSubmitting ||
              cabeceraQuery.isLoading ||
              otDetailQuery.isLoading ||
              geoLoading ||
              isPrevalidating
            }
          >
            {isPrevalidating || isSubmitting ? 'Validando...' : mutation.isPending ? 'Guardando...' : 'Registrar OT'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegistrarOTAgendaPage
