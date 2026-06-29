import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Table from '../components/common/Table'
import type { Column } from '../components/common/Table'
import { fetchListaOt, fetchOtList } from '../api/otApi'
import type { OtSummary } from '../types/ot'
import { formatDate, todayISO } from '../utils/dates'
import { useSessionStore } from '../store/sessionStore'

type ViewMode = 'horario' | 'buscar' | 'calendario'
type SessionLike = { idUsuario?: number; nombre?: string } | null | undefined

const ROLE_SUPERVISOR_ID = 9
const ROLE_TECNICO_ID = 8
const DEFAULT_ESTADO_FILTER_OPTIONS = ['pendiente', 'en proceso', 'ejecutada', 'aceptado', 'fallida con visita']
const GROUP_STYLES = [
  'bg-amber-200 text-amber-900',
  'bg-sky-200 text-sky-900',
  'bg-emerald-200 text-emerald-900',
  'bg-rose-200 text-rose-900',
  'bg-indigo-200 text-indigo-900',
]

const GROUP_ACCENT_STYLES = [
  'border-l-4 border-amber-500',
  'border-l-4 border-sky-500',
  'border-l-4 border-emerald-500',
  'border-l-4 border-rose-500',
  'border-l-4 border-indigo-500',
]

const DAY_CARD_CLASS = 'bg-white border-2 border-slate-900'

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value).trim().toLowerCase()
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

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

const readNumber = (row: OtSummary, keys: string[]): number | undefined => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const getOtId = (row: OtSummary): number | undefined => {
  return readNumber(row, ['id', 'Id', 'idOt', 'Id_Ot', 'IdOt', 'idOrden', 'Id_Orden', 'IdOrden', 'idOT', 'IdOT'])
}

const getOtCodigo = (row: OtSummary): string => {
  return readString(row, ['codigo', 'OrdenTrabajo', 'ordenTrabajo', 'orden_trabajo', 'Orden', 'OT', 'ot'])
}

const getOtFecha = (row: OtSummary): string => {
  return readString(row, ['fecha', 'Fecha_Ejecucion', 'FechaEjecucion', 'fechaEjecucion', 'fecha_ejecucion', 'Fecha'])
}

const getOtCliente = (row: OtSummary): string => {
  return readString(row, ['cliente', 'Cliente', 'clienteNombre', 'ClienteNombre'])
}

const getOtClienteNro = (row: OtSummary): string => {
  return readString(row, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'cliente', 'Cliente'])
}

const getOtTecnico = (row: OtSummary): string => {
  return readString(row, ['tecnico', 'Tecnico', 'nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
}

const getOtRuta = (row: OtSummary): string => {
  return readString(row, ['ruta', 'Ruta', 'rutaNombre', 'RutaNombre'])
}

const getOtUsuarioId = (row: OtSummary): number | undefined => {
  return readNumber(row, ['idUsuario', 'Id_Usuario', 'idTecnico', 'Id_Tecnico', 'tecnicoId', 'IdTecnico', 'usuarioId', 'IdUsuario'])
}

const getOtUsuarioNombre = (row: OtSummary): string => {
  return readString(row, ['nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario', 'tecnico', 'Tecnico'])
}

const getOtEstado = (row: OtSummary): string => {
  const value = readValue(row, ['estado', 'Estado', 'Pendiente', 'pendiente', 'status', 'Status'])
  if (value === undefined || value === null) return ''
  if (typeof value === 'boolean') return value ? 'Pendiente' : 'Finalizada'
  if (typeof value === 'number') return value === 1 ? 'Pendiente' : value === 0 ? 'Finalizada' : String(value)
  return typeof value === 'string' ? value : String(value)
}

const getOtTor = (row: OtSummary): string => {
  return readString(row, ['tor', 'TOR', 'Tor'])
}

const isAssignedToUser = (row: OtSummary, session: SessionLike): boolean => {
  const userId = getOtUsuarioId(row)
  if (userId !== undefined && session?.idUsuario !== undefined) {
    return userId === session.idUsuario
  }
  const otName = normalizeText(getOtUsuarioNombre(row))
  const sessionName = normalizeText(session?.nombre ?? '')
  if (otName && sessionName) {
    return otName === sessionName
  }
  return false
}

const extractTimeLabel = (value: string): string => {
  if (!value) return ''
  const match = value.match(/(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}:${match[2]}`
}

const getOtTime = (row: OtSummary): string => {
  const raw = readString(row, [
    'hora',
    'Hora',
    'horaEjecucion',
    'Hora_Ejecucion',
    'hora_ejecucion',
    'fecha',
    'Fecha_Ejecucion',
    'FechaEjecucion',
    'fechaEjecucion',
  ])
  return extractTimeLabel(raw)
}

const pickAccentClass = (label: string): string => {
  const normalized = normalizeText(label)
  if (!normalized) return GROUP_ACCENT_STYLES[0]
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 997
  }
  return GROUP_ACCENT_STYLES[Math.abs(hash) % GROUP_ACCENT_STYLES.length]
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const formatISODate = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const formatDateDMY = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  return `${match[3]}/${match[2]}/${match[1]}`
}

const toISODate = (value?: string): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatISODate(date)
}

const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7

const startOfWeek = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() - mondayIndex(base))
  return base
}

const endOfWeek = (date: Date): Date => {
  const base = startOfWeek(date)
  base.setDate(base.getDate() + 6)
  return base
}

const startOfMonth = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setDate(1)
  return base
}

const endOfMonth = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setMonth(base.getMonth() + 1, 0)
  return base
}

const getCalendarRange = (anchor: Date): { start: Date; end: Date; gridStart: Date; gridEnd: Date } => {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  return {
    start: monthStart,
    end: monthEnd,
    gridStart: startOfWeek(monthStart),
    gridEnd: endOfWeek(monthEnd),
  }
}

const OtListPage = () => {
  const [view, setView] = useState<ViewMode>('horario')
  const [calendarAnchor, setCalendarAnchor] = useState<Date>(() => new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const navigate = useNavigate()
  const session = useSessionStore((state) => state.session)

  const roleId = session?.idRol
  const roleName = normalizeText(session?.rol ?? '')
  const isSupervisor = roleId === ROLE_SUPERVISOR_ID || roleName === 'supervisor'
  const isTecnico = roleId === ROLE_TECNICO_ID || roleName === 'tecnico'

  useEffect(() => {
    if (!isSupervisor && view === 'calendario') {
      setView('horario')
    }
  }, [isSupervisor, view])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 639px)')
    const handleChange = () => setIsMobile(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  const todayKey = todayISO()
  const [horarioFecha, setHorarioFecha] = useState(todayKey)
  const [buscarFecha, setBuscarFecha] = useState(todayKey)
  const [selectedEstados, setSelectedEstados] = useState<string[]>([])
  const horarioLabel = formatDateDMY(horarioFecha)
  const buscarLabel = formatDateDMY(buscarFecha)
  const apiRole = session?.rol?.trim() || undefined
  const apiUserId = session?.idUsuario
  const selectedEstadosCsv = useMemo(() => selectedEstados.join(','), [selectedEstados])
  const estadoListParam = selectedEstados.length ? selectedEstados : undefined
  const estadoCsvParam = selectedEstadosCsv || undefined

  const horarioQuery = useQuery({
    queryKey: ['ot-horario-listaot', horarioFecha, selectedEstadosCsv, apiRole ?? ''],
    queryFn: () =>
      fetchListaOt({
        fecha: horarioFecha,
        estado: estadoCsvParam,
        estados: estadoListParam,
        rol: apiRole,
      }),
  })

  const buscarQuery = useQuery({
    queryKey: ['ot-buscar-listaot', buscarFecha, selectedEstadosCsv, apiUserId ?? 0, apiRole ?? ''],
    queryFn: () =>
      fetchListaOt({
        fecha: buscarFecha,
        estado: estadoCsvParam,
        estados: estadoListParam,
        idUsuario: apiUserId,
        rol: apiRole,
      }),
  })

  const horarioDataRaw = horarioQuery.data ?? []
  const horarioData = horarioDataRaw
  const buscarDataRaw = buscarQuery.data ?? []
  const buscarData = buscarDataRaw

  const discoveredEstadoOptions = useMemo(() => {
    const map = new Map<string, string>()
    ;[...horarioDataRaw, ...buscarDataRaw].forEach((row) => {
      const estado = getOtEstado(row).trim()
      if (!estado) return
      const key = normalizeText(estado)
      if (!map.has(key)) {
        map.set(key, estado)
      }
    })
    return Array.from(map.values())
  }, [buscarDataRaw, horarioDataRaw])

  const estadoFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    DEFAULT_ESTADO_FILTER_OPTIONS.forEach((option) => {
      map.set(normalizeText(option), option)
    })
    discoveredEstadoOptions.forEach((option) => {
      map.set(normalizeText(option), option)
    })
    return Array.from(map.values())
  }, [discoveredEstadoOptions])

  const toggleEstadoFilter = (estado: string) => {
    setSelectedEstados((current) => {
      const exists = current.includes(estado)
      if (exists) return current.filter((item) => item !== estado)
      return [...current, estado]
    })
  }

  const buscarErrorMessage =
    buscarQuery.isError && buscarQuery.error instanceof Error && buscarQuery.error.message
      ? buscarQuery.error.message
      : buscarQuery.isError
        ? 'No se pudieron cargar las OT. Verifica la conexion con el backend.'
        : null
  const horarioErrorMessage =
    horarioQuery.isError && horarioQuery.error instanceof Error && horarioQuery.error.message
      ? horarioQuery.error.message
      : horarioQuery.isError
        ? 'No se pudieron cargar las OT. Verifica la conexion con el backend.'
        : null

  const columns: Column<OtSummary>[] = [
    {
      key: 'cliente_nro',
      header: 'Cliente Nro',
      render: (row) => getOtClienteNro(row) || 'Sin dato',
    },
    {
      key: 'ot',
      header: 'OT',
      render: (row) => getOtCodigo(row) || 'Sin OT',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => getOtEstado(row) || 'Sin estado',
    },
    {
      key: 'tor',
      header: 'TOR',
      render: (row) => getOtTor(row) || 'Sin dato',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const id = getOtId(row)
        if (!id) {
          return <span className="text-xs text-slate-400">Sin ID</span>
        }
        return (
          <Button variant="secondary" onClick={() => navigate(`/GestionOTs/${id}`)} type="button">
            Agregar datos
          </Button>
        )
      },
    },
  ]

  const scheduleGroups = useMemo(() => {
    const byHour = new Map<string, OtSummary[]>()
    const withoutTime: OtSummary[] = []
    horarioData.forEach((row) => {
      const time = getOtTime(row)
      if (!time) {
        withoutTime.push(row)
        return
      }
      const hourLabel = `${time.slice(0, 2)}:00`
      const items = byHour.get(hourLabel) ?? []
      items.push(row)
      byHour.set(hourLabel, items)
    })

    const hours = Array.from(byHour.keys()).sort((a, b) => a.localeCompare(b))
    const groups = hours.map((hour) => ({
      hour,
      items: [...(byHour.get(hour) ?? [])].sort((a, b) => getOtTime(a).localeCompare(getOtTime(b))),
    }))

    return { groups, withoutTime }
  }, [horarioData])

  const calendarRange = useMemo(() => getCalendarRange(calendarAnchor), [calendarAnchor])
  const calendarStart = formatISODate(calendarRange.start)
  const calendarEnd = formatISODate(calendarRange.end)

  const calendarQuery = useQuery({
    queryKey: ['ot-calendario', calendarStart, calendarEnd, apiRole ?? '', apiUserId ?? 0, isSupervisor],
    queryFn: () =>
      fetchOtList({
        inicio: calendarStart,
        fin: calendarEnd,
        rol: apiRole,
        usuario: apiUserId,
        pendiente: isSupervisor ? false : true,
      }),
    enabled: view === 'calendario' && Boolean(calendarStart && calendarEnd),
  })

  const calendarDataRaw = calendarQuery.data ?? []
  const calendarData = useMemo(() => {
    if (isSupervisor) return calendarDataRaw
    if (isTecnico) {
      return calendarDataRaw.filter((row) => isAssignedToUser(row, session))
    }
    return calendarDataRaw
  }, [calendarDataRaw, isSupervisor, isTecnico, session])

  const calendarItemsByDate = useMemo(() => {
    const map = new Map<string, OtSummary[]>()
    calendarData.forEach((row) => {
      const dateKey = toISODate(getOtFecha(row))
      if (!dateKey) return
      const items = map.get(dateKey) ?? []
      items.push(row)
      map.set(dateKey, items)
    })
    return map
  }, [calendarData])

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return []
    return calendarItemsByDate.get(selectedDay) ?? []
  }, [calendarItemsByDate, selectedDay])

  const calendarDays = useMemo(() => {
    const days: Date[] = []
    const cursor = new Date(calendarRange.gridStart)
    while (cursor <= calendarRange.gridEnd) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [calendarRange])

  const calendarLabel = useMemo(() => {
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarAnchor)
  }, [calendarAnchor])

  const handleCalendarShift = (direction: 'prev' | 'next') => {
    setCalendarAnchor((current) => {
      const next = new Date(current)
      next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1))
      return next
    })
  }

  const handleOpenDetail = (row: OtSummary) => {
    const id = getOtId(row)
    if (!id) return
    navigate(`/GestionOTs/${id}`)
  }

  const openDayModal = (dayKey: string) => {
    setSelectedDay(dayKey)
    setDayModalOpen(true)
  }

  const handleSelectView = (next: ViewMode) => {
    setView(next)
  }

  const emptyLabel = isTecnico ? 'NO HAY DATOS PARA LA FECHA' : 'NO HAY DATOS PARA LA FECHA'

  return (
    <div className="bento-page">
      <div className="bento-page-head flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Lista de OT pendientes</h2>
          <p className="text-sm text-slate-500">
            {isSupervisor ? 'Viendo todas las OT pendientes.' : isTecnico ? 'Viendo tus OT pendientes.' : 'Viendo OT pendientes.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button
          className="w-full sm:w-auto"
          variant={view === 'horario' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => handleSelectView('horario')}
        >
          Horario
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant={view === 'buscar' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => handleSelectView('buscar')}
        >
          Buscar
        </Button>
        {isSupervisor ? (
          <Button
            className="col-span-2 w-full sm:col-auto sm:w-auto"
            variant={view === 'calendario' ? 'primary' : 'secondary'}
            type="button"
            onClick={() => handleSelectView('calendario')}
          >
            Calendario
          </Button>
        ) : null}
      </div>

      {view === 'horario' ? (
        <div className="glass-panel p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="section-title">Horario</h3>
              <p className="text-xs text-slate-500">OT organizadas por hora segun fecha y estado.</p>
            </div>
            {horarioQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Fecha">
              <input className="input-base" type="date" value={horarioFecha} onChange={(event) => setHorarioFecha(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" type="button" onClick={() => setHorarioFecha(todayKey)}>
                Hoy
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estados</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {estadoFilterOptions.map((estado) => {
                const selected = selectedEstados.includes(estado)
                return (
                  <button
                    key={`estado-horario-${estado}`}
                    type="button"
                    onClick={() => toggleEstadoFilter(estado)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? 'border-brand-300 bg-brand-100 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600'
                    }`}
                  >
                    {estado}
                  </button>
                )
              })}
              {selectedEstados.length > 0 ? (
                <Button variant="ghost" type="button" onClick={() => setSelectedEstados([])}>
                  Limpiar estados
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{horarioLabel}</span>
            <span className="text-xs text-slate-400">{horarioData.length} OT</span>
          </div>

          {horarioErrorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {horarioErrorMessage}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {scheduleGroups.groups.length === 0 && scheduleGroups.withoutTime.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
              </div>
            ) : null}

            {scheduleGroups.groups.map((group, index) => (
              <div
                key={group.hour}
                className={`rounded-2xl border p-3 shadow-sm ${GROUP_STYLES[index % GROUP_STYLES.length]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{group.hour}</span>
                  <span className="text-xs text-slate-400">{group.items.length} OT</span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.map((row) => {
                    const id = getOtId(row)
                    const time = getOtTime(row)
                    const codigo = getOtCodigo(row) || 'OT'
                    const cliente = getOtCliente(row)
                    const ruta = getOtRuta(row)
                    const tecnico = getOtTecnico(row)
                      const grupoLabel = ruta || tecnico || codigo
                      return (
                        <button
                          key={`${group.hour}-${codigo}-${id ?? 'no-id'}`}
                          type="button"
                          onClick={() => handleOpenDetail(row)}
                          disabled={!id}
                      className={`flex w-full flex-col gap-1 rounded-xl border border-white/80 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                        grupoLabel
                      )}`}
                    >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{codigo}</span>
                          {time ? <span className="text-[11px] text-slate-400">{time}</span> : null}
                        </div>
                        {cliente ? <span className="text-[11px] text-slate-500">{cliente}</span> : null}
                        {ruta ? <span className="text-[11px] text-slate-400">{ruta}</span> : null}
                        {tecnico ? <span className="text-[11px] text-slate-400">{tecnico}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {scheduleGroups.withoutTime.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Sin hora asignada</span>
                  <span className="text-xs text-slate-400">{scheduleGroups.withoutTime.length} OT</span>
                </div>
                <div className="mt-3 space-y-2">
                  {scheduleGroups.withoutTime.map((row) => {
                    const id = getOtId(row)
                    const codigo = getOtCodigo(row) || 'OT'
                    const cliente = getOtCliente(row)
                    const ruta = getOtRuta(row)
                    const tecnico = getOtTecnico(row)
                    const grupoLabel = ruta || tecnico || codigo
                    return (
                      <button
                        key={`no-time-${codigo}-${id ?? 'no-id'}`}
                        type="button"
                        onClick={() => handleOpenDetail(row)}
                        disabled={!id}
                      className={`flex w-full flex-col gap-1 rounded-xl border border-white/80 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                        grupoLabel
                      )}`}
                    >
                        <div className="font-semibold text-slate-700">{codigo}</div>
                        {cliente ? <span className="text-[11px] text-slate-500">{cliente}</span> : null}
                        {ruta ? <span className="text-[11px] text-slate-400">{ruta}</span> : null}
                        {tecnico ? <span className="text-[11px] text-slate-400">{tecnico}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === 'buscar' ? (
        <div className="glass-panel p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Buscar</h3>
              <p className="text-xs text-slate-500">Filtra por fecha y estado.</p>
            </div>
            {buscarQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Fecha">
              <input className="input-base" type="date" value={buscarFecha} onChange={(event) => setBuscarFecha(event.target.value)} />
            </Field>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estados</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {estadoFilterOptions.map((estado) => {
                const selected = selectedEstados.includes(estado)
                return (
                  <button
                    key={`estado-buscar-${estado}`}
                    type="button"
                    onClick={() => toggleEstadoFilter(estado)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? 'border-brand-300 bg-brand-100 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600'
                    }`}
                  >
                    {estado}
                  </button>
                )
              })}
              {selectedEstados.length > 0 ? (
                <Button variant="ghost" type="button" onClick={() => setSelectedEstados([])}>
                  Limpiar estados
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{buscarLabel}</span>
            <span className="text-xs text-slate-400">{buscarData.length} OT</span>
          </div>

          <div className="mt-4">
            {buscarErrorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{buscarErrorMessage}</div>
            ) : (
              <Table columns={columns} data={buscarData} emptyLabel={emptyLabel} variant="row-block" mobileRowBlockMode="cards" />
            )}
          </div>
        </div>
      ) : null}

      {view === 'calendario' ? (
        <div className="glass-panel bg-slate-50/80 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Calendario</h3>
              <p className="text-xs text-slate-500">Todas las OT del mes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" type="button" onClick={() => handleCalendarShift('prev')}>
                Anterior
              </Button>
              <Button variant="secondary" type="button" onClick={() => setCalendarAnchor(new Date())}>
                Hoy
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleCalendarShift('next')}>
                Siguiente
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{calendarLabel}</span>
            {calendarQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
          </div>

          {calendarQuery.isError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              No se pudo cargar el calendario. Intenta nuevamente.
            </div>
          ) : null}

          <div className="mt-4">
            <div className="hidden sm:grid sm:grid-cols-7 sm:gap-2 sm:text-xs sm:font-semibold sm:uppercase sm:text-slate-400">
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((label) => (
                <div key={label} className="px-2 py-1 text-center">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
              {calendarDays.map((day) => {
                const dayKey = formatISODate(day)
                const dayItems = calendarItemsByDate.get(dayKey) ?? []
                const isToday = dayKey === todayISO()
                const isCurrentMonth = day.getMonth() === calendarAnchor.getMonth() && day.getFullYear() === calendarAnchor.getFullYear()
                const weekdayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day)

                return (
                  <div
                    key={dayKey}
                    onClick={isMobile ? () => openDayModal(dayKey) : undefined}
                    className={`min-h-[140px] rounded-2xl border px-3 py-3 shadow-sm transition sm:min-h-[170px] lg:min-h-[190px] ${
                      isCurrentMonth ? DAY_CARD_CLASS : 'border-slate-300 bg-white'
                    } ${isMobile ? 'cursor-pointer hover:border-brand-200' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className={`text-xs font-semibold ${isToday ? 'text-brand-600' : 'text-slate-600'}`}>
                          {day.getDate()}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400 sm:hidden">{weekdayLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayItems.length ? <span className="text-[10px] text-slate-400">{dayItems.length} OT</span> : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDayModal(dayKey)
                          }}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-600"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {dayItems.slice(0, 4).map((row) => {
                        const codigo = getOtCodigo(row) || 'OT'
                        const cliente = getOtCliente(row)
                        const ruta = getOtRuta(row)
                        const id = getOtId(row)
                        const grupoLabel = ruta || cliente || codigo
                        return (
                          <button
                            key={`${dayKey}-${codigo}-${id ?? 'no-id'}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleOpenDetail(row)
                            }}
                            disabled={!id}
                            className={`w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-left text-[11px] text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                              grupoLabel
                            )}`}
                          >
                            <div className="font-semibold text-slate-700">{codigo}</div>
                            {cliente ? <div className="text-[10px] text-slate-500">{cliente}</div> : null}
                            {ruta ? <div className="text-[10px] text-slate-400">{ruta}</div> : null}
                          </button>
                        )
                      })}
                      {dayItems.length > 4 ? (
                        <div className="text-[10px] text-slate-400">+{dayItems.length - 4} mas</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {dayModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">OT del dia</h3>
                <p className="text-sm text-slate-500">{selectedDay ? formatDate(selectedDay) : ''}</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setDayModalOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {selectedDayItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
                  <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
                </div>
              ) : (
                selectedDayItems.map((row, index) => {
                  const id = getOtId(row)
                  const codigo = getOtCodigo(row) || 'OT'
                  const cliente = getOtCliente(row)
                  const ruta = getOtRuta(row)
                  const tecnico = getOtTecnico(row)
                  const grupoLabel = ruta || tecnico || codigo
                  return (
                    <button
                      key={`modal-${selectedDay}-${codigo}-${id ?? 'no-id'}`}
                      type="button"
                      onClick={() => handleOpenDetail(row)}
                      disabled={!id}
                      className={`flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left text-sm text-slate-800 transition hover:border-brand-200 hover:bg-brand-50 ${
                        GROUP_STYLES[index % GROUP_STYLES.length]
                      } ${pickAccentClass(grupoLabel)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{codigo}</span>
                        {id ? <span className="text-xs text-slate-400">#{id}</span> : null}
                      </div>
                      {cliente ? <span className="text-xs text-slate-500">{cliente}</span> : null}
                      {ruta ? <span className="text-xs text-slate-400">{ruta}</span> : null}
                      {tecnico ? <span className="text-xs text-slate-400">{tecnico}</span> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}

export default OtListPage
