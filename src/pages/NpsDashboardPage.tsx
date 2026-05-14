import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNpsDashboard, fetchNpsFiltros } from '../api/npsApi'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuilding, faCalendarDays, faChartColumn, faClipboardList, faScrewdriverWrench, faThumbsDown, faThumbsUp, faUserGroup, faUserTie } from '@fortawesome/free-solid-svg-icons'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

type Row = Record<string, unknown>

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const read = (row: Row, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const v = row[key]
      if (v !== undefined && v !== null && v !== '') return v
    }
  }
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.replace(/[_\s]/g, '').toLowerCase()
    for (const target of keys) {
      if (normalized === target.replace(/[_\s]/g, '').toLowerCase()) {
        if (value !== undefined && value !== null && value !== '') return value
      }
    }
  }
  return undefined
}

const toDayLabel = (value: unknown): string => {
  const raw = asText(value)
  if (!raw) return '-'
  const parts = raw.split(' ')[0].split('/')
  if (parts.length === 3) {
    const d = Number(parts[0])
    return Number.isFinite(d) ? `${d} may` : raw
  }
  return raw
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const parseNpsDate = (value: unknown): Date | null => {
  const raw = asText(value)
  if (!raw) return null
  const left = raw.split(' ')[0]
  const parts = left.split('/')
  if (parts.length === 3) {
    const d = Number(parts[0])
    const m = Number(parts[1])
    const y = Number(parts[2])
    if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(y)) {
      const dt = new Date(y, m - 1, d)
      if (!Number.isNaN(dt.getTime())) return dt
    }
  }
  const fallback = new Date(raw)
  if (!Number.isNaN(fallback.getTime())) return fallback
  return null
}

const formatDayMonth = (date: Date): string => `${date.getDate()} ${MONTHS_ES[date.getMonth()] ?? ''}`

const pct = (value: number): string => `${value.toFixed(1)}%`

const today = new Date()
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const startMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const SemiGauge = ({
  value,
  ratio,
  color,
  restColor,
  subtitle,
}: {
  value: string
  ratio: number
  color: string
  restColor: string
  subtitle?: string
}) => {
  const pctValue = Math.max(0, Math.min(100, ratio * 100))
  const data = [pctValue, 100 - pctValue]
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  } as const
  return (
    <div className="relative h-32 w-44">
      <Doughnut data={{ datasets: [{ data, backgroundColor: [color, restColor], borderWidth: 0 }] }} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-8">
        <p className="text-4xl font-semibold leading-none text-blue-900">{value}</p>
        {subtitle ? <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  )
}

const NpsDashboardPage = () => {
  const { usuario, roleName } = useAuth()
  const role = (roleName || usuario?.rol || '').trim().toLowerCase()
  const isCentral = role.includes('central') || role.includes('sistema') || role.includes('admin')

  const [fechaInicio, setFechaInicio] = useState<string>(isoDate(startMonth))
  const [fechaFin, setFechaFin] = useState<string>(isoDate(today))
  const [idSucursal, setIdSucursal] = useState<number | undefined>(isCentral ? undefined : usuario?.idSucursal)
  const [idSupervisor, setIdSupervisor] = useState<number | undefined>(undefined)
  const [idTecnico, setIdTecnico] = useState<number | undefined>(undefined)
  const [supervisorNombre, setSupervisorNombre] = useState<string | undefined>(undefined)
  const [tecnicoNombre, setTecnicoNombre] = useState<string | undefined>(undefined)
  const [tecnicoSearch, setTecnicoSearch] = useState('')
  const [currentMonthPage, setCurrentMonthPage] = useState(0)

  const sucursalesQuery = useQuery({ queryKey: ['auth-sucursales-nps'], queryFn: fetchSucursales })
  const filtrosQuery = useQuery({
    queryKey: ['nps-filtros', idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre, role, usuario?.idUsuario],
    queryFn: () => fetchNpsFiltros({ idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre }),
    enabled: Boolean(idSucursal || !isCentral),
  })
  const dashboardQuery = useQuery({
    queryKey: ['nps-dashboard', fechaInicio, fechaFin, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre, role, usuario?.idUsuario],
    queryFn: () => fetchNpsDashboard({ fechaInicio, fechaFin, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre }),
    enabled: Boolean(idSucursal || !isCentral),
  })

  const sucursales = useMemo(() => sucursalesQuery.data?.data ?? [], [sucursalesQuery.data])
  const supervisores = useMemo(() => filtrosQuery.data?.filtros?.supervisores ?? [], [filtrosQuery.data])
  const tecnicos = useMemo(() => filtrosQuery.data?.filtros?.tecnicos ?? [], [filtrosQuery.data])
  const rows = useMemo(() => dashboardQuery.data?.rows ?? [], [dashboardQuery.data])

  useEffect(() => {
    setIdTecnico(undefined)
    setTecnicoNombre(undefined)
  }, [idSupervisor, supervisorNombre, idSucursal])

  const metrics = useMemo(() => {
    const total = rows.length
    let prom = 0
    let det = 0
    let pas = 0
    let agendaOk = 0
    let agendaNo = 0

    const byDay = new Map<string, { prom: number; det: number; pas: number; date: Date | null }>()
    const byTech = new Map<string, { prom: number; det: number; pas: number }>()
    const byCity = new Map<string, { prom: number; det: number; pas: number }>()
    const byTecnico = new Map<string, { prom: number; det: number; pas: number; total: number }>()

    const add = (map: Map<string, { prom: number; det: number; pas: number; date: Date | null }>, key: string, tipo: string, date: Date | null) => {
      const k = key || '-'
      const cur = map.get(k) || { prom: 0, det: 0, pas: 0, date }
      if (tipo === 'PROMOTOR') cur.prom += 1
      else if (tipo === 'DETRACTOR') cur.det += 1
      else cur.pas += 1
      if (!cur.date && date) cur.date = date
      map.set(k, cur)
    }

    const addSimple = (map: Map<string, { prom: number; det: number; pas: number }>, key: string, tipo: string) => {
      const k = key || '-'
      const cur = map.get(k) || { prom: 0, det: 0, pas: 0 }
      if (tipo === 'PROMOTOR') cur.prom += 1
      else if (tipo === 'DETRACTOR') cur.det += 1
      else cur.pas += 1
      map.set(k, cur)
    }

    for (const row of rows) {
      const tipo = asText(read(row, ['nps_tipo'])).toUpperCase()
      if (tipo === 'PROMOTOR') prom += 1
      else if (tipo === 'DETRACTOR') det += 1
      else pas += 1

      const agenda = asText(read(row, ['cumplimiento_de_agenda'])).toUpperCase()
      if (agenda === 'YES' || agenda === 'SI' || agenda === 'SÍ') agendaOk += 1
      else if (agenda === 'NO') agendaNo += 1

      const respDate = parseNpsDate(read(row, ['fecha_de_respuesta']))
      const dateKey = respDate ? `${respDate.getFullYear()}-${String(respDate.getMonth() + 1).padStart(2, '0')}-${String(respDate.getDate()).padStart(2, '0')}` : toDayLabel(read(row, ['fecha_de_respuesta']))
      add(byDay, dateKey, tipo, respDate)
      addSimple(byTech, asText(read(row, ['tecnologia'])), tipo)
      addSimple(byCity, asText(read(row, ['ciudad'])), tipo)

      const t = asText(read(row, ['tecnico_nombre']))
      const tt = byTecnico.get(t) || { prom: 0, det: 0, pas: 0, total: 0 }
      if (tipo === 'PROMOTOR') tt.prom += 1
      else if (tipo === 'DETRACTOR') tt.det += 1
      else tt.pas += 1
      tt.total += 1
      byTecnico.set(t, tt)
    }

    const npsPct = total > 0 ? ((prom / total) * 100 - (det / total) * 100) : 0
    const agendaPct = total > 0 ? (agendaOk / total) * 100 : 0

    const daySeries = Array.from(byDay.entries()).map(([key, v]) => {
      const label = v.date ? formatDayMonth(v.date) : key
      const monthKey = v.date ? `${v.date.getFullYear()}-${String(v.date.getMonth() + 1).padStart(2, '0')}` : 'sin-fecha'
      return { key, label, monthKey, monthLabel: v.date ? `${MONTHS_ES[v.date.getMonth()]} ${v.date.getFullYear()}` : 'Sin fecha', ...v, total: v.prom + v.det + v.pas }
    })
    const techSeries = Array.from(byTech.entries()).map(([label, v]) => ({ label, ...v, total: v.prom + v.det + v.pas }))
    const citySeries = Array.from(byCity.entries()).map(([label, v]) => ({ label, ...v, total: v.prom + v.det + v.pas }))
    const tableRows = Array.from(byTecnico.entries()).map(([tecnico, v]) => ({ tecnico, ...v }))

    daySeries.sort((a, b) => {
      if (a.date && b.date) return a.date.getTime() - b.date.getTime()
      return a.label.localeCompare(b.label, undefined, { numeric: true })
    })
    techSeries.sort((a, b) => b.total - a.total)
    citySeries.sort((a, b) => b.total - a.total)
    tableRows.sort((a, b) => b.total - a.total)

    return { total, prom, det, pas, npsPct, agendaPct, agendaOk, agendaNo, daySeries, techSeries, citySeries, tableRows }
  }, [rows])

  const monthPages = useMemo(() => {
    const groups = new Map<string, { monthLabel: string; items: typeof metrics.daySeries }>()
    for (const item of metrics.daySeries) {
      const cur = groups.get(item.monthKey) || { monthLabel: item.monthLabel, items: [] as typeof metrics.daySeries }
      cur.items.push(item)
      groups.set(item.monthKey, cur)
    }
    return Array.from(groups.entries()).map(([monthKey, value]) => ({ monthKey, monthLabel: value.monthLabel, items: value.items }))
  }, [metrics.daySeries])

  useEffect(() => {
    if (monthPages.length === 0) {
      setCurrentMonthPage(0)
      return
    }
    if (currentMonthPage > monthPages.length - 1) setCurrentMonthPage(0)
  }, [monthPages, currentMonthPage])

  const visibleDaySeries = useMemo(() => {
    if (monthPages.length <= 1) return metrics.daySeries
    return monthPages[currentMonthPage]?.items ?? []
  }, [monthPages, currentMonthPage, metrics.daySeries])

  const maxDay = useMemo(() => Math.max(1, ...visibleDaySeries.map((x) => x.total)), [visibleDaySeries])
  const maxTech = useMemo(() => Math.max(1, ...metrics.techSeries.map((x) => x.total)), [metrics.techSeries])
  const maxCity = useMemo(() => Math.max(1, ...metrics.citySeries.map((x) => x.total)), [metrics.citySeries])
  const tecnicoSuggestions = useMemo(
    () =>
      metrics.tableRows
        .map((r) => r.tecnico)
        .filter((name) => !!name)
        .filter((name, idx, arr) => arr.indexOf(name) === idx)
        .filter((name) => name.toLowerCase().includes(tecnicoSearch.trim().toLowerCase()))
        .slice(0, 8),
    [metrics.tableRows, tecnicoSearch]
  )

  const filteredTableRows = useMemo(() => {
    const q = tecnicoSearch.trim().toLowerCase()
    if (!q) return metrics.tableRows
    return metrics.tableRows.filter((r) => (r.tecnico || '').toLowerCase().includes(q))
  }, [metrics.tableRows, tecnicoSearch])

  const detractoresRows = useMemo(() => {
    const q = tecnicoSearch.trim().toLowerCase()
    return rows
      .filter((row) => asText(read(row, ['nps_tipo'])).toUpperCase() === 'DETRACTOR')
      .map((row) => {
        const comentario =
          asText(read(row, ['likelihood_to_recommend_come'])) ||
          asText(read(row, ['fcr_comment_export'])) ||
          asText(read(row, ['ta_topicos_ltr'])) ||
          asText(read(row, ['observacion'])) ||
          '-'
        return {
          fecha: asText(read(row, ['fecha_de_respuesta'])),
          idTransaccion: asText(read(row, ['id_transaccion'])) || '-',
          cliente: asText(read(row, ['nombre_cliente'])) || '-',
          tecnico: asText(read(row, ['tecnico_nombre'])) || '-',
          ciudad: asText(read(row, ['ciudad'])) || '-',
          ltr: asText(read(row, ['ltr'])) || '-',
          comentario,
        }
      })
      .filter((r) => !q || r.tecnico.toLowerCase().includes(q))
  }, [rows, tecnicoSearch])

  const trendChartData = useMemo(
    () => ({
      labels: visibleDaySeries.map((d) => d.label),
      datasets: [
        {
          label: 'Promotores',
          data: visibleDaySeries.map((d) => d.prom),
          backgroundColor: '#2563eb',
          borderRadius: 6,
          barThickness: 20,
        },
        {
          label: 'Detractores',
          data: visibleDaySeries.map((d) => d.det),
          backgroundColor: '#dc2626',
          borderRadius: 6,
          barThickness: 20,
        },
      ],
    }),
    [visibleDaySeries]
  )

  const trendChartOptions = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          y: { beginAtZero: true, max: Math.ceil(maxDay * 1.3), ticks: { color: '#94a3b8', stepSize: 4 }, grid: { color: '#e2e8f0' } },
        },
        plugins: {
          legend: { position: 'top' as const, align: 'end' as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        },
      }) as const,
    [maxDay]
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">NPS - Calificaciones</h1>
        <p className="text-sm text-slate-500">Tigo Hogar</p>
      </div>

      <div className="sticky top-3 z-30 rounded-3xl border border-slate-200/70 bg-gradient-to-r from-white/95 via-white/90 to-slate-50/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-sm text-slate-700">
          <span className="mb-1 inline-flex items-center gap-2 font-medium"><FontAwesomeIcon icon={faCalendarDays} className="text-slate-400" />Fecha inicio</span>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-base mt-1 w-full rounded-2xl border-slate-200 bg-white/90 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 inline-flex items-center gap-2 font-medium"><FontAwesomeIcon icon={faCalendarDays} className="text-slate-400" />Fecha fin</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-base mt-1 w-full rounded-2xl border-slate-200 bg-white/90 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 inline-flex items-center gap-2 font-medium"><FontAwesomeIcon icon={faBuilding} className="text-slate-400" />Sucursal</span>
          <select value={idSucursal ?? ''} onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : undefined)} className="input-base mt-1 w-full rounded-2xl border-slate-200 bg-white/90 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100" disabled={!isCentral}>
            <option value="">Selecciona sucursal</option>
            {sucursales.map((s) => <option key={s.idSucursal} value={s.idSucursal}>{s.sucursal}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 inline-flex items-center gap-2 font-medium"><FontAwesomeIcon icon={faUserTie} className="text-slate-400" />Encargado/Supervisor</span>
          <select
            value={isCentral ? (idSupervisor ? `ID:${idSupervisor}` : (supervisorNombre ? `NM:${supervisorNombre}` : '')) : (idSupervisor ?? '')}
            onChange={(e) => {
              const raw = e.target.value
              const selectedLabel = e.target.selectedOptions?.[0]?.text?.trim() || undefined
              if (isCentral) {
                if (!raw) {
                  setIdSupervisor(undefined)
                  setSupervisorNombre(undefined)
                } else if (raw.startsWith('ID:')) {
                  const id = Number(raw.slice(3))
                  setIdSupervisor(Number.isFinite(id) ? id : undefined)
                  setSupervisorNombre(selectedLabel && selectedLabel !== 'Todos' ? selectedLabel : undefined)
                } else if (raw.startsWith('NM:')) {
                  setIdSupervisor(undefined)
                  setSupervisorNombre(raw.slice(3) || undefined)
                } else {
                  setIdSupervisor(undefined)
                  setSupervisorNombre(raw || undefined)
                }
              } else {
                setIdSupervisor(e.target.value ? Number(e.target.value) : undefined)
              }
            }}
            className="input-base mt-1 w-full rounded-2xl border-slate-200 bg-white/90 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            disabled={filtrosQuery.isLoading}
          >
            <option value="">Todos</option>
            {supervisores.map((row, idx) => {
              const nombre = asText(read(row, ['supervisor', 'nombre', 'idSupervisor']))
              const id = asNumber(read(row, ['idSupervisor', 'idUsuarioSupervisor']))
              if (isCentral) {
                if (id) return <option key={`sup-id-${idx}-${id}`} value={`ID:${id}`}>{nombre || `Supervisor ${id}`}</option>
                return nombre ? <option key={`sup-n-${idx}-${nombre}`} value={`NM:${nombre}`}>{nombre}</option> : null
              }
              return id ? <option key={`sup-${idx}-${id}`} value={id}>{nombre || `Supervisor ${id}`}</option> : null
            })}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 inline-flex items-center gap-2 font-medium"><FontAwesomeIcon icon={faScrewdriverWrench} className="text-slate-400" />Técnico</span>
          <select
            value={isCentral ? (tecnicoNombre ?? '') : (idTecnico ? `ID:${idTecnico}` : (tecnicoNombre ? `NM:${tecnicoNombre}` : ''))}
            onChange={(e) => {
              const raw = e.target.value
              const selectedLabel = e.target.selectedOptions?.[0]?.text?.trim() || undefined
              if (isCentral) {
                setTecnicoNombre(raw || undefined)
                setIdTecnico(undefined)
              } else {
                if (!raw) {
                  setIdTecnico(undefined)
                  setTecnicoNombre(undefined)
                } else if (raw.startsWith('ID:')) {
                  const id = Number(raw.slice(3))
                  setIdTecnico(Number.isFinite(id) ? id : undefined)
                  setTecnicoNombre(selectedLabel && selectedLabel !== 'Todos' ? selectedLabel : undefined)
                } else if (raw.startsWith('NM:')) {
                  setIdTecnico(undefined)
                  setTecnicoNombre(raw.slice(3) || undefined)
                } else {
                  setIdTecnico(undefined)
                  setTecnicoNombre(raw || undefined)
                }
              }
            }}
            className="input-base mt-1 w-full rounded-2xl border-slate-200 bg-white/90 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            disabled={filtrosQuery.isLoading}
          >
            <option value="">Todos</option>
            {tecnicos.map((row, idx) => {
              const nombre = asText(read(row, ['tecnico', 'nombre', 'idTecnico']))
              const id = asNumber(read(row, ['idTecnico', 'id_tecnico']))
              if (isCentral) return nombre ? <option key={`tec-n-${idx}-${nombre}`} value={nombre}>{nombre}</option> : null
              if (id) return <option key={`tec-${idx}-${id}`} value={`ID:${id}`}>{nombre || `Tecnico ${id}`}</option>
              return nombre ? <option key={`tec-nm-${idx}-${nombre}`} value={`NM:${nombre}`}>{nombre}</option> : null
            })}
          </select>
        </label>
      </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-blue-100 p-2 text-blue-600"><FontAwesomeIcon icon={faClipboardList} /></span>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total encuestas</p>
          </div>
          <p className="text-5xl leading-none text-slate-800">{metrics.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-blue-100 p-2 text-blue-600"><FontAwesomeIcon icon={faThumbsUp} /></span>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Promotores</p>
          </div>
          <p className="text-5xl leading-none text-blue-800">{metrics.prom}</p>
          <p className="mt-2 text-sm text-slate-400">{pct(metrics.total ? (metrics.prom / metrics.total) * 100 : 0)} del total</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-red-100 p-2 text-red-600"><FontAwesomeIcon icon={faThumbsDown} /></span>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detractores</p>
          </div>
          <p className="text-5xl leading-none text-red-700">{metrics.det}</p>
          <p className="mt-2 text-sm text-slate-400">{pct(metrics.total ? (metrics.det / metrics.total) * 100 : 0)} del total</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-slate-100 p-2 text-slate-500"><FontAwesomeIcon icon={faUserGroup} /></span>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pasivos</p>
          </div>
          <p className="text-5xl leading-none text-slate-600">{metrics.pas}</p>
          <p className="mt-2 text-sm text-slate-400">{pct(metrics.total ? (metrics.pas / metrics.total) * 100 : 0)} del total</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">NPS Score</p>
          <SemiGauge
            value={pct(metrics.npsPct)}
            ratio={Math.max(0, Math.min(1, metrics.npsPct / 100))}
            color="#2753c7"
            restColor="#dbe6ff"
            subtitle="Excelente"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-100 p-2 text-amber-500"><FontAwesomeIcon icon={faChartColumn} /></span>
            <div>
              <p className="text-xl font-semibold text-slate-700">Tasa de Cumplimiento de Citas</p>
              <p className="text-sm text-slate-400">Proporción de citas completadas sobre las programadas</p>
            </div>
          </div>
          <p className="text-4xl font-semibold text-blue-600">{pct(metrics.agendaPct)}</p>
        </div>
        <div className="h-3 rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, metrics.agendaPct))}%` }} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-blue-100 p-2 text-blue-600"><FontAwesomeIcon icon={faBuilding} /></span>
            <p className="text-2xl font-semibold text-slate-800">Sucursales</p>
          </div>
          <div className="space-y-4">
            {metrics.citySeries.slice(0, 3).map((c, idx) => {
              const color = idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-amber-500' : 'bg-violet-500'
              return (
                <div key={c.label}>
                  <div className="mb-1 flex justify-between text-lg text-slate-700">
                    <span>{c.label || '-'}</span>
                    <span>{c.total} <span className="text-sm text-slate-400">({pct(metrics.total ? (c.total / metrics.total) * 100 : 0)})</span></span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200"><div className={`h-3 rounded-full ${color}`} style={{ width: `${(c.total / maxCity) * 100}%` }} /></div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 flex items-center justify-between text-xl text-slate-700">
            <span>Total general</span><span>{metrics.total}</span>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-100 p-2 text-blue-600"><FontAwesomeIcon icon={faChartColumn} /></span>
              <p className="text-2xl font-semibold text-slate-800">Tendencia Diaria</p>
            </div>
            {monthPages.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonthPage((p) => Math.max(0, p - 1))}
                  disabled={currentMonthPage === 0}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs font-medium text-slate-500">{monthPages[currentMonthPage]?.monthLabel}</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthPage((p) => Math.min(monthPages.length - 1, p + 1))}
                  disabled={currentMonthPage >= monthPages.length - 1}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
          <div className="h-[260px]">
            <Bar data={trendChartData} options={trendChartOptions} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Tecnología</p>
          <div className="space-y-2">
            {metrics.techSeries.map((t) => (
              <div key={t.label}>
                <div className="mb-1 flex justify-between text-xs"><span>{t.label || '-'}</span><span>{t.total}</span></div>
                <div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-blue-600" style={{ width: `${(t.total / maxTech) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Sucursales / Ciudad</p>
          <div className="space-y-2">
            {metrics.citySeries.slice(0, 8).map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex justify-between text-xs"><span>{c.label || '-'}</span><span>{c.total}</span></div>
                <div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-emerald-600" style={{ width: `${(c.total / maxCity) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Detalle por técnico</p>
          <div className="relative w-full md:w-[420px]">
            <input
              value={tecnicoSearch}
              onChange={(e) => setTecnicoSearch(e.target.value)}
              placeholder="Buscar técnico..."
              className="input-base w-full pr-8 text-sm"
            />
            {tecnicoSearch.trim() && tecnicoSuggestions.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow">
                {tecnicoSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTecnicoSearch(name)}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-100"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="max-h-[520px] overflow-auto rounded-md border border-slate-100">
          {filteredTableRows.map((r, index) => {
            const total = Math.max(1, r.total || 0)
            const promPct = ((r.prom || 0) / total) * 100
            const detPct = ((r.det || 0) / total) * 100
            const rankBg =
              index === 0 ? 'bg-amber-400 text-slate-800' :
              index === 1 ? 'bg-slate-300 text-slate-700' :
              index === 2 ? 'bg-amber-300 text-slate-700' : 'bg-slate-100 text-slate-500'
            return (
              <div key={`${r.tecnico}-${index}`} className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${rankBg}`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-base font-medium uppercase text-slate-700">{r.tecnico || '-'}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-blue-600">P: <b>{r.prom}</b></span>
                        <span className="text-red-600">D: <b>{r.det}</b></span>
                        <span className="text-fuchsia-600">Pa: <b>{r.pas}</b></span>
                        <span className="text-slate-700">T: <b>{r.total}</b></span>
                        {r.det > 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                            {r.det} detr.
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="h-2 w-40 rounded-full bg-slate-200">
                      <div className="relative h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(8, promPct)}%` }}>
                        {r.det > 0 ? (
                          <span
                            className="absolute right-0 top-0 h-2 rounded-r-full bg-red-500"
                            style={{ width: `${Math.min(100, (detPct / Math.max(promPct, 1)) * 100)}%` }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {filteredTableRows.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No hay técnicos para el filtro actual.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Detalle de Detractores</p>
          <p className="text-xs text-slate-500">Total: {detractoresRows.length}</p>
        </div>
        <div className="max-h-[340px] overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-left text-slate-600">
                <th className="p-2">Fecha</th>
                <th className="p-2">Id Transacción</th>
                <th className="p-2">Cliente</th>
                <th className="p-2">Técnico</th>
                <th className="p-2">Ciudad</th>
                <th className="p-2">LTR</th>
                <th className="p-2 min-w-[420px]">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {detractoresRows.map((r, idx) => (
                <tr key={`${r.fecha}-${r.tecnico}-${idx}`} className="border-b align-top">
                  <td className="p-2 whitespace-nowrap">{r.fecha || '-'}</td>
                  <td className="p-2 whitespace-nowrap">{r.idTransaccion}</td>
                  <td className="p-2 whitespace-nowrap">{r.cliente}</td>
                  <td className="p-2 whitespace-nowrap">{r.tecnico}</td>
                  <td className="p-2 whitespace-nowrap">{r.ciudad}</td>
                  <td className="p-2 text-red-700 font-semibold whitespace-nowrap">{r.ltr}</td>
                  <td className="p-2 min-w-[420px] text-[14px] leading-6 text-slate-700">{r.comentario}</td>
                </tr>
              ))}
              {detractoresRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={7}>No hay detractores para el filtro actual.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {(dashboardQuery.isLoading || filtrosQuery.isLoading) ? <p className="text-sm text-slate-500">Cargando NPS...</p> : null}
      {dashboardQuery.isError ? <p className="text-sm text-red-600">No se pudo cargar NPS.</p> : null}
    </div>
  )
}

export default NpsDashboardPage
