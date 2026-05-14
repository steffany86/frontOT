import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNpsDashboard, fetchNpsFiltros } from '../api/npsApi'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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
  const datePart = raw.split(' ')[0]
  const slash = datePart.split('/')
  if (slash.length === 3) {
    const d = Number(slash[0])
    const m = Number(slash[1])
    if (Number.isFinite(d) && Number.isFinite(m)) {
      const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
      const month = monthNames[m - 1] ?? ''
      return month ? `${d} ${month}` : String(d)
    }
  }
  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = Number(iso[3])
    const m = Number(iso[2])
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const month = monthNames[m - 1] ?? ''
    return month ? `${d} ${month}` : String(d)
  }
  return raw
}

const pct = (value: number): string => `${value.toFixed(1)}%`
const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const donutStyle = (a: number, b: number, c: number): React.CSSProperties => {
  const total = Math.max(1, a + b + c)
  const pa = (a / total) * 100
  const pb = (b / total) * 100
  const pc = (c / total) * 100
  return {
    background: `conic-gradient(#2563eb 0 ${pa}%, #f97316 ${pa}% ${pa + pb}%, #14b8a6 ${pa + pb}% ${pa + pb + pc}%, #e5e7eb ${pa + pb + pc}% 100%)`,
  }
}

const today = new Date()
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const startMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const HalfGauge = ({
  title,
  subtitle,
  value,
  ratio,
  color,
  restColor,
}: {
  title: string
  subtitle: string
  value: string
  ratio: number
  color: string
  restColor: string
}) => {
  const pctValue = Math.max(0, Math.min(100, ratio * 100))
  const data = [{ value: pctValue }, { value: 100 - pctValue }]
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      <div className="relative h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" startAngle={180} endAngle={0} innerRadius="58%" outerRadius="95%" stroke="none">
              <Cell fill={color} />
              <Cell fill={restColor} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-6">
          <div className="text-center">
            <p className="text-xs text-slate-600">{subtitle}</p>
            <p className="text-4xl leading-none text-slate-900">{value}</p>
          </div>
        </div>
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
  const [monthPageIndex, setMonthPageIndex] = useState(0)

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

    const byDay = new Map<string, { prom: number; det: number; pas: number }>()
    const byTech = new Map<string, { prom: number; det: number; pas: number }>()
    const byCity = new Map<string, { prom: number; det: number; pas: number }>()
    const byTecnico = new Map<string, { prom: number; det: number; pas: number; total: number }>()

    const add = (map: Map<string, { prom: number; det: number; pas: number }>, key: string, tipo: string) => {
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

      add(byDay, toDayLabel(read(row, ['fecha_de_respuesta'])), tipo)
      add(byTech, asText(read(row, ['tecnologia'])), tipo)
      add(byCity, asText(read(row, ['ciudad'])), tipo)

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

    const daySeries = Array.from(byDay.entries()).map(([label, v]) => ({ label, ...v, total: v.prom + v.det + v.pas }))
    const techSeries = Array.from(byTech.entries()).map(([label, v]) => ({ label, ...v, total: v.prom + v.det + v.pas }))
    const citySeries = Array.from(byCity.entries()).map(([label, v]) => ({ label, ...v, total: v.prom + v.det + v.pas }))
    const tableRows = Array.from(byTecnico.entries()).map(([tecnico, v]) => ({ tecnico, ...v }))

    const monthIndexFromLabel = (label: string): number => {
      const mon = (label.split(' ')[1] ?? '').trim().toLowerCase()
      const idx = monthNames.indexOf(mon)
      return idx >= 0 ? idx : 99
    }
    const dayFromLabel = (label: string): number => {
      const day = Number((label.split(' ')[0] ?? '').trim())
      return Number.isFinite(day) ? day : 99
    }
    daySeries.sort((a, b) => {
      const monthDiff = monthIndexFromLabel(a.label) - monthIndexFromLabel(b.label)
      if (monthDiff !== 0) return monthDiff
      return dayFromLabel(a.label) - dayFromLabel(b.label)
    })
    techSeries.sort((a, b) => b.total - a.total)
    citySeries.sort((a, b) => b.total - a.total)
    tableRows.sort((a, b) => b.total - a.total)

    return { total, prom, det, pas, npsPct, agendaPct, agendaOk, agendaNo, daySeries, techSeries, citySeries, tableRows }
  }, [rows])

  const daySeriesByMonth = useMemo(() => {
    const grouped = new Map<string, typeof metrics.daySeries>()
    for (const item of metrics.daySeries) {
      const monthLabel = (item.label.split(' ')[1] ?? item.label).toLowerCase()
      const key = monthLabel || '-'
      const list = grouped.get(key) ?? []
      list.push(item)
      grouped.set(key, list)
    }
    return Array.from(grouped.entries()).map(([month, items]) => ({ month, items }))
  }, [metrics.daySeries])
  const activeMonthPage = useMemo(() => {
    if (daySeriesByMonth.length === 0) {
      return { month: '-', items: [] as typeof metrics.daySeries }
    }
    const safeIndex = Math.min(monthPageIndex, daySeriesByMonth.length - 1)
    return daySeriesByMonth[safeIndex]
  }, [daySeriesByMonth, monthPageIndex, metrics.daySeries])
  const maxDayActiveMonth = useMemo(() => Math.max(1, ...activeMonthPage.items.map((x) => x.total)), [activeMonthPage.items])
  const maxTech = useMemo(() => Math.max(1, ...metrics.techSeries.map((x) => x.total)), [metrics.techSeries])
  const maxCity = useMemo(() => Math.max(1, ...metrics.citySeries.map((x) => x.total)), [metrics.citySeries])

  useEffect(() => {
    setMonthPageIndex(0)
  }, [fechaInicio, fechaFin, idSucursal, idSupervisor, idTecnico, supervisorNombre, tecnicoNombre, role, usuario?.idUsuario])
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
          nroCliente: asText(read(row, ['numero_cliente', 'nro_cliente', 'cliente_nro', 'codigo_cliente'])) || '-',
          cliente: asText(read(row, ['nombre_cliente'])) || '-',
          tecnico: asText(read(row, ['tecnico_nombre'])) || '-',
          ltr: asText(read(row, ['ltr'])) || '-',
          comentario,
        }
      })
      .filter((r) => !q || r.tecnico.toLowerCase().includes(q))
  }, [rows, tecnicoSearch])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">NPS - Calificaciones</h1>
        <p className="text-sm text-slate-500">Tigo Hogar</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-sm text-slate-700">Fecha inicio<input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-base mt-1 w-full" /></label>
        <label className="text-sm text-slate-700">Fecha fin<input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-base mt-1 w-full" /></label>
        <label className="text-sm text-slate-700">Sucursal
          <select value={idSucursal ?? ''} onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : undefined)} className="input-base mt-1 w-full" disabled={!isCentral}>
            <option value="">Selecciona sucursal</option>
            {sucursales.map((s) => <option key={s.idSucursal} value={s.idSucursal}>{s.sucursal}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">Encargado/Supervisor
          <select
            value={isCentral ? (supervisorNombre ?? '') : (idSupervisor ?? '')}
            onChange={(e) => {
              if (isCentral) {
                setSupervisorNombre(e.target.value || undefined)
                setIdSupervisor(undefined)
              } else {
                setIdSupervisor(e.target.value ? Number(e.target.value) : undefined)
              }
            }}
            className="input-base mt-1 w-full"
            disabled={filtrosQuery.isLoading}
          >
            <option value="">Todos</option>
            {supervisores.map((row, idx) => {
              const nombre = asText(read(row, ['supervisor', 'nombre', 'idSupervisor']))
              const id = asNumber(read(row, ['idSupervisor', 'idUsuarioSupervisor']))
              if (isCentral) return nombre ? <option key={`sup-n-${idx}-${nombre}`} value={nombre}>{nombre}</option> : null
              return id ? <option key={`sup-${idx}-${id}`} value={id}>{nombre || `Supervisor ${id}`}</option> : null
            })}
          </select>
        </label>
        <label className="text-sm text-slate-700">Tecnico
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
            className="input-base mt-1 w-full"
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

      <div className="grid gap-3 md:grid-cols-5">
        <HalfGauge title="TOTAL ENCUESTAS NPS" subtitle="Total Encuestas" value={String(metrics.total)} ratio={1} color="#1976d2" restColor="#d1d5db" />
        <HalfGauge title="PROMOTORES" subtitle="Promotor" value={String(metrics.prom)} ratio={metrics.total ? metrics.prom / metrics.total : 0} color="#2e7d32" restColor="#b7d9bc" />
        <HalfGauge title="DETRACTORES" subtitle="Detractor" value={String(metrics.det)} ratio={metrics.total ? metrics.det / metrics.total : 0} color="#c62828" restColor="#efc0b4" />
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">% NPS</p><p className="text-3xl font-bold text-emerald-700">{pct(metrics.npsPct)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Cumplimiento Agenda</p><p className="text-3xl font-bold text-sky-700">{pct(metrics.agendaPct)}</p><p className="mt-1 text-xs text-slate-500">SI: {metrics.agendaOk} | NO: {metrics.agendaNo}</p></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Tendencia diaria (2 columnas)</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-600" />Promotor</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-600" />Detractor</span>
              {daySeriesByMonth.length > 1 ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                    onClick={() => setMonthPageIndex((p) => Math.max(0, p - 1))}
                    disabled={monthPageIndex <= 0}
                  >
                    {'<'}
                  </button>
                  <span className="text-[10px] uppercase">{activeMonthPage.month}</span>
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                    onClick={() => setMonthPageIndex((p) => Math.min(daySeriesByMonth.length - 1, p + 1))}
                    disabled={monthPageIndex >= daySeriesByMonth.length - 1}
                  >
                    {'>'}
                  </button>
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-10 gap-2">
            {activeMonthPage.items.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1">
                <div className="w-full rounded bg-slate-100 p-1" style={{ height: 150 }}>
                    <div className="flex h-full items-end gap-1">
                    <div className="relative flex h-full flex-1 items-end">
                      <div className="relative w-full rounded bg-blue-600" style={{ height: `${(d.prom / maxDayActiveMonth) * 100}%` }} title={`Promotor: ${d.prom}`}>
                        {d.prom > 0 ? <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-semibold text-black">{d.prom}</span> : null}
                      </div>
                    </div>
                    <div className="relative flex h-full flex-1 items-end">
                      <div className="relative w-full rounded bg-red-600" style={{ height: `${(d.det / maxDayActiveMonth) * 100}%` }} title={`Detractor: ${d.det}`}>
                        {d.det > 0 ? <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-semibold text-black">{d.det}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600">P:{d.prom} D:{d.det}</div>
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Composición NPS</p>
          <div className="mx-auto h-40 w-40 rounded-full" style={donutStyle(metrics.prom, metrics.det, metrics.pas)} />
          <div className="mt-3 text-xs text-slate-600">
            <p>Promotor: {metrics.prom} ({pct(metrics.total ? (metrics.prom / metrics.total) * 100 : 0)})</p>
            <p>Detractor: {metrics.det} ({pct(metrics.total ? (metrics.det / metrics.total) * 100 : 0)})</p>
            <p>Pasivo: {metrics.pas} ({pct(metrics.total ? (metrics.pas / metrics.total) * 100 : 0)})</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Cumplimiento de Agenda</p>
          <div className="relative mx-auto h-40 w-40 rounded-full" style={donutStyle(metrics.agendaOk, metrics.agendaNo, 0)}>
            <span className="absolute left-1/2 -top-2 -translate-x-1/2 rounded bg-white/90 px-2 py-1 text-sm font-bold text-black">
              {pct(metrics.agendaPct)}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            <p>SI: {metrics.agendaOk}</p>
            <p>NO: {metrics.agendaNo}</p>
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
          <p className="text-sm font-semibold text-slate-800">Detalle por técnico</p>
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
        <div className="max-h-[420px] overflow-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-left text-slate-600">
                <th className="p-2">Técnico</th>
                <th className="p-2">Promotor</th>
                <th className="p-2">Detractor</th>
                <th className="p-2">Pasivo</th>
                <th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableRows.map((r) => (
                <tr key={r.tecnico} className="border-b"><td className="p-2">{r.tecnico || '-'}</td><td className="p-2 text-blue-600">{r.prom}</td><td className="p-2 text-red-600">{r.det}</td><td className="p-2 text-fuchsia-600">{r.pas}</td><td className="p-2 font-semibold">{r.total}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Detalle de Detractores</p>
          <p className="text-xs text-slate-500">Total: {detractoresRows.length}</p>
        </div>
        <div className="max-h-[340px] overflow-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-left text-slate-600">
                <th className="p-2">Fecha</th>
                <th className="p-2">Nro Cliente</th>
                <th className="p-2">Cliente</th>
                <th className="p-2">Técnico</th>
                <th className="p-2">LTR</th>
                <th className="p-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {detractoresRows.map((r, idx) => (
                <tr key={`${r.fecha}-${r.tecnico}-${idx}`} className="border-b align-top">
                  <td className="p-2 whitespace-nowrap">{r.fecha || '-'}</td>
                  <td className="p-2 whitespace-nowrap">{r.nroCliente}</td>
                  <td className="p-2 whitespace-nowrap">{r.cliente}</td>
                  <td className="p-2 whitespace-nowrap">{r.tecnico}</td>
                  <td className="p-2 text-red-700 font-semibold whitespace-nowrap">{r.ltr}</td>
                  <td className="p-2">{r.comentario}</td>
                </tr>
              ))}
              {detractoresRows.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={6}>No hay detractores para el filtro actual.</td>
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
