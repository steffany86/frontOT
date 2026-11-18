import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import FormCard from '../components/common/FormCard'
import PageLayout, { PageTabs } from '../components/common/PageLayout'
import {
  fetchActividadesSantiago,
  guardarNotaDia,
  guardarRegistroActividad,
  importarActividadesSantiago,
  type DatosActividades,
  type NotaDia,
  type RegistroActividad,
} from '../api/actividadesSantiagoApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'
import {
  FECHA_NACIMIENTO,
  HABILIDADES,
  NIVELES,
  PEDAGOGIAS,
  SEMANAS,
  actividadId,
  type DiaPlan,
  type HabilidadKey,
  type PasoActividad,
  type SemanaPlan,
} from '../data/actividadesSantiago'

type Tab = 'plan' | 'dia' | 'semana' | 'progreso' | 'historial'
const TABS: { key: Tab; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'progreso', label: 'Progreso' },
  { key: 'historial', label: 'Historial' },
]
const ANIMOS = ['', '😄 Muy contento', '🙂 Tranquilo', '😐 Regular', '😴 Cansado/sueño', '😢 Irritable']

// ---------- Fechas ----------
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseIso = (s: string) => {
  const [a, b, c] = s.split('-').map(Number)
  return new Date(a, b - 1, c)
}
const shift = (s: string, n: number) => {
  const d = parseIso(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
const lunesDe = (s: string) => {
  const d = parseIso(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}
const fmtLargo = (s: string) => parseIso(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtCorto = (s: string) => parseIso(s).toLocaleDateString('es', { day: 'numeric', month: 'short' })

const avg = (a: number[]): number | null => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

// ---------- Actividades (id -> paso) ----------
type InfoActividad = { id: string; semana: number; dia: DiaPlan; paso: PasoActividad }
const ACTIVIDADES: Record<string, InfoActividad> = {}
SEMANAS.forEach((s) => s.dias.forEach((d) => d.p.forEach((paso, i) => { const id = actividadId(s.n, d.d, i); ACTIVIDADES[id] = { id, semana: s.n, dia: d, paso } })))

const semanaDe = (fecha: string): SemanaPlan | undefined => SEMANAS.find((s) => s.ini === lunesDe(fecha))

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: color }}>{children}</span>
)

type Registrado = { fecha: string; id: string; nivel: number; minutos: number | null; observacion: string }

const SistemasActividadesSantiagoPage = () => {
  const { usuario, roleName } = useAuth()
  const queryClient = useQueryClient()
  const esSistemas = (roleName || usuario?.rol || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'sistemas'

  const [tab, setTab] = useState<Tab>('dia')
  const [fecha, setFecha] = useState(iso(new Date()))
  const [sel, setSel] = useState(Object.keys(ACTIVIDADES)[0])
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError, error: errorCarga } = useQuery({ queryKey: ['actividades-santiago'], queryFn: fetchActividadesSantiago, enabled: esSistemas, retry: false })
  const datos: DatosActividades = data ?? { registros: {}, dias: {} }

  const registrados = useMemo<Registrado[]>(
    () =>
      Object.entries(datos.registros)
        .map(([k, r]) => {
          const [f, id] = k.split('|')
          return { fecha: f, id, nivel: r.nivel, minutos: r.minutos, observacion: r.observacion }
        })
        .filter((r): r is Registrado => r.nivel !== null && !!ACTIVIDADES[r.id])
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [datos],
  )

  // El backend solo deja entrar a los usuarios autorizados; aqui se muestra su rechazo.
  if (!esSistemas || isError) {
    return (
      <FormCard title="Actividades">
        <p className="text-sm font-semibold text-red-600">{isError ? getApiErrorMessage(errorCarga) : 'No tienes acceso a esta sección.'}</p>
      </FormCard>
    )
  }

  const actualizarCache = (fn: (d: DatosActividades) => DatosActividades) =>
    queryClient.setQueryData<DatosActividades>(['actividades-santiago'], (old) => fn(old ?? { registros: {}, dias: {} }))

  const guardarRegistro = (f: string, id: string, cambios: Partial<RegistroActividad>) => {
    const actual = datos.registros[`${f}|${id}`] ?? { nivel: null, minutos: null, observacion: '' }
    const nuevo = { ...actual, ...cambios }
    actualizarCache((d) => ({ ...d, registros: { ...d.registros, [`${f}|${id}`]: nuevo } }))
    guardarRegistroActividad(f, id, nuevo)
      .then(() => setError(''))
      .catch((e) => setError(getApiErrorMessage(e)))
  }

  const guardarDia = (f: string, cambios: Partial<NotaDia>) => {
    const nuevo = { ...(datos.dias[f] ?? { animo: '', observacion: '' }), ...cambios }
    actualizarCache((d) => ({ ...d, dias: { ...d.dias, [f]: nuevo } }))
    guardarNotaDia(f, nuevo)
      .then(() => setError(''))
      .catch((e) => setError(getApiErrorMessage(e)))
  }

  const importarJson = async (file?: File) => {
    if (!file) return
    try {
      const json = JSON.parse(await file.text()) as { reg?: Record<string, { n?: number | null; min?: number | null; obs?: string }> }
      const lista = Object.entries(json.reg ?? {})
        .map(([k, v]) => {
          const [f, id] = k.split('|')
          return { fecha: f, id, nivel: v.n ?? null, minutos: v.min ?? null, observacion: v.obs ?? '' }
        })
        .filter((r) => r.nivel !== null)
      const n = await importarActividadesSantiago(lista)
      await queryClient.invalidateQueries({ queryKey: ['actividades-santiago'] })
      setError('')
      window.alert(`${n} registros importados.`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ---------- Plan ----------
  const hoy = new Date()
  const nac = parseIso(FECHA_NACIMIENTO)
  const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + hoy.getMonth() - nac.getMonth() - (hoy.getDate() < nac.getDate() ? 1 : 0)

  const vPlan = () => (
    <div className="space-y-3">
      <div className="glass-panel p-4">
        <h3 className="text-base font-semibold text-slate-900">Santiago · nació el 7/11/2025 · {meses} meses</h3>
        <p className="mt-1 text-xs text-slate-600">
          Entre los 11 y 13 meses es habitual que se ponga de pie con apoyo, se desplace sujeto a muebles y algunos den sus primeros pasos. También suelen aparecer la pinza fina, el señalar,
          imitar gestos y las primeras palabras con sentido. Cada niño tiene su ritmo: este plan es una guía, no una evaluación. Ante dudas, consultar al pediatra.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ['M', 'Ambiente preparado y seguro, materiales reales a su alcance, libertad de movimiento y ayudarle a hacer por sí mismo. Se observa más de lo que se interviene.'],
          ['W', 'Ritmo y repetición diaria, canciones y gestos, materiales naturales, imitación del adulto y juego sencillo, sin pantallas.'],
          ['R', 'Niño explorador con «cien lenguajes»: luz, sombras, materiales sueltos, cestas de tesoros. Se documenta lo que hace con fotos y notas.'],
        ] as const).map(([k, txt]) => (
          <div key={k} className="glass-panel p-4" style={{ borderTop: `4px solid ${PEDAGOGIAS[k].c}` }}>
            <h4 className="text-sm font-semibold text-slate-900">{PEDAGOGIAS[k].n}</h4>
            <p className="mt-1 text-xs text-slate-600">{txt}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel p-4 text-xs text-slate-600">
        <b className="text-slate-900">Seguridad:</b> supervisión constante, sin piezas menores a 4 cm, sin bolsas ni cuerdas, muebles anclados y superficies bajas. Si algo no le interesa, déjalo y vuelve otro día.
      </div>
      {SEMANAS.map((s) => (
        <div key={s.n} className="glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">Semana {s.n} · {s.tema}</h4>
            <span className="text-xs text-slate-500">{fmtCorto(s.ini)} – {fmtCorto(shift(s.ini, 4))}</span>
          </div>
          <p className="text-xs text-slate-600">{s.foco}</p>
          <ul className="mt-2 text-xs text-slate-700">
            {s.dias.map((d) => <li key={d.d}><b>{d.n}:</b> {d.t}</li>)}
          </ul>
          <button type="button" className="mt-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => { setFecha(s.ini); setTab('semana') }}>Ver semana</button>
        </div>
      ))}
    </div>
  )

  // ---------- Día ----------
  const vDia = () => {
    const s = semanaDe(fecha)
    const dow = parseIso(fecha).getDay()
    const d = s?.dias.find((x) => x.d === dow)
    const nota = datos.dias[fecha] ?? { animo: '', observacion: '' }
    return (
      <div className="space-y-3">
        <div className="glass-panel flex flex-wrap items-center gap-2 p-3">
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setFecha(shift(fecha, -1))}>◀</button>
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setFecha(shift(fecha, 1))}>▶</button>
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setFecha(iso(new Date()))}>Hoy</button>
        </div>
        <h3 className="text-lg font-semibold capitalize text-slate-900">{fmtLargo(fecha)}</h3>
        {!s ? (
          <div className="glass-panel p-4 text-sm text-slate-700">No hay plan cargado para esta semana (el plan va del {fmtCorto(SEMANAS[0].ini)} al {fmtCorto(shift(SEMANAS[SEMANAS.length - 1].ini, 4))}).</div>
        ) : !d ? (
          <div className="glass-panel p-4 text-sm text-slate-700">Fin de semana: no hay actividades programadas.</div>
        ) : (
          <>
            <div className="glass-panel p-4">
              <p className="text-xs text-slate-500">Semana {s.n} · {s.tema}</p>
              <h4 className="text-base font-semibold text-slate-900">{d.t}</h4>
              <p className="text-xs text-slate-600">{d.obj}<br />⏱ {d.dur} · 🧰 {d.mat}</p>
              <p className="mt-1 text-xs text-slate-500">🕯 Ritual Waldorf: empieza y termina el día con la misma canción corta y un abrazo.</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">
                {d.p.filter((_, i) => datos.registros[`${fecha}|${actividadId(s.n, d.d, i)}`]?.nivel != null).length}/{d.p.length} registradas
              </p>
            </div>
            {d.p.map((paso, i) => {
              const id = actividadId(s.n, d.d, i)
              const r = datos.registros[`${fecha}|${id}`] ?? { nivel: null, minutos: null, observacion: '' }
              return (
                <div key={id} className="glass-panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="flex-1 text-sm font-semibold text-slate-900">{i + 1}. {paso.nom}</h4>
                    <Chip color={PEDAGOGIAS[paso.ped].c}>{PEDAGOGIAS[paso.ped].n}</Chip>
                    <Chip color={HABILIDADES[paso.hab].c}>{HABILIDADES[paso.hab].n}</Chip>
                  </div>
                  <p className="text-xs text-slate-500">Sugerido: {paso.min} min</p>
                  <details className="text-xs text-slate-600"><summary className="cursor-pointer">Ver instrucciones</summary><p className="mt-1">{paso.desc}</p></details>
                  <div className="my-2 flex flex-wrap gap-1.5">
                    {NIVELES.map((n) => (
                      <button
                        key={n.v}
                        type="button"
                        onClick={() => guardarRegistro(fecha, id, { nivel: r.nivel === n.v ? null : n.v })}
                        className="min-w-[110px] flex-1 rounded-lg border px-2 py-2 text-xs"
                        style={r.nivel === n.v ? { background: n.c, color: '#fff', borderColor: n.c, fontWeight: 600 } : { borderColor: '#cbd5e1' }}
                      >
                        {n.t}
                      </button>
                    ))}
                  </div>
                  <label className="text-xs text-slate-600">
                    Minutos reales{' '}
                    <input
                      key={`${fecha}${id}min${r.minutos ?? ''}`}
                      type="number"
                      min={0}
                      max={1440}
                      defaultValue={r.minutos ?? ''}
                      onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== r.minutos) guardarRegistro(fecha, id, { minutos: v }) }}
                      className="ml-1 w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <textarea
                    key={`${fecha}${id}obs`}
                    defaultValue={r.observacion}
                    maxLength={4000}
                    placeholder="Observaciones: qué le gustó, qué le costó, cómo reaccionó…"
                    onBlur={(e) => { if (e.target.value !== r.observacion) guardarRegistro(fecha, id, { observacion: e.target.value }) }}
                    className="mt-2 min-h-[60px] w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </div>
              )
            })}
            <div className="glass-panel p-4">
              <h4 className="text-sm font-semibold text-slate-900">Notas generales del día</h4>
              <label className="text-xs text-slate-600">
                Ánimo{' '}
                <select value={nota.animo} onChange={(e) => guardarDia(fecha, { animo: e.target.value })} className="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm">
                  {ANIMOS.map((a) => <option key={a} value={a}>{a || '—'}</option>)}
                </select>
              </label>
              <textarea
                key={`${fecha}dia`}
                defaultValue={nota.observacion}
                maxLength={4000}
                placeholder="Notas del día…"
                onBlur={(e) => { if (e.target.value !== nota.observacion) guardarDia(fecha, { observacion: e.target.value }) }}
                className="mt-2 min-h-[60px] w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------- Semana ----------
  const vSemana = () => {
    const L = lunesDe(fecha)
    const s = semanaDe(L)
    return (
      <div className="space-y-3">
        <div className="glass-panel flex flex-wrap items-center gap-2 p-3">
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setFecha(shift(L, -7))}>◀ Semana anterior</button>
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setFecha(shift(L, 7))}>Semana siguiente ▶</button>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Semana del {fmtCorto(L)}</h3>
        {!s ? <div className="glass-panel p-4 text-sm text-slate-700">No hay plan cargado para esta semana.</div> : (
          <>
            <p className="text-xs text-slate-500">Semana {s.n} · {s.tema}</p>
            {s.dias.map((d) => {
              const f = shift(L, d.d - 1)
              return (
                <div key={d.d} className="glass-panel p-4">
                  <h4 className="text-sm font-semibold text-slate-900">{d.n} {fmtCorto(f)} — {d.t}</h4>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {d.p.map((paso, i) => {
                        const nivel = datos.registros[`${f}|${actividadId(s.n, d.d, i)}`]?.nivel
                        const n = nivel != null ? NIVELES.find((x) => x.v === nivel) : undefined
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 pr-2">{paso.nom}</td>
                            <td className="py-1.5 pr-2"><Chip color={HABILIDADES[paso.hab].c}>{HABILIDADES[paso.hab].n}</Chip></td>
                            <td className="py-1.5">{n ? <Chip color={n.c}>{n.t}</Chip> : <span className="text-slate-400">pendiente</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <button type="button" className="mt-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => { setFecha(f); setTab('dia') }}>Abrir día</button>
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  // ---------- Progreso ----------
  const vProgreso = () => {
    if (!registrados.length) return <div className="glass-panel p-4 text-sm text-slate-700">Aún no hay registros. Registra el nivel de logro en la pestaña «Día» para ver las gráficas.</div>
    const semanas = [...new Set(registrados.map((r) => lunesDe(r.fecha)))].sort()
    const claves = Object.keys(HABILIDADES) as HabilidadKey[]
    const filas = semanas.map((w) => {
      const fila: Record<string, string | number | null> = { semana: fmtCorto(w) }
      claves.forEach((k) => {
        const v = avg(registrados.filter((r) => ACTIVIDADES[r.id].paso.hab === k && lunesDe(r.fecha) === w).map((r) => r.nivel))
        fila[k] = v === null ? null : Number(v.toFixed(2))
      })
      return fila
    })
    const solo = registrados.filter((r) => r.nivel === 3).length
    const totalMin = registrados.reduce((t, r) => t + (r.minutos ?? 0), 0)
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Progreso por habilidad</h3>
        <p className="text-xs text-slate-600">Promedio semanal del nivel de logro (0 = no lo intentó · 3 = lo logró solo).</p>
        <div className="glass-panel p-4">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={filas} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {claves.map((k) => <Line key={k} type="monotone" dataKey={k} name={HABILIDADES[k].n} stroke={HABILIDADES[k].c} strokeWidth={2.5} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {semanas.length < 2 ? <p className="text-xs text-slate-500">Con una sola semana se ven puntos; las líneas aparecen desde la segunda semana.</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {claves.map((k) => {
            const rs = registrados.filter((r) => ACTIVIDADES[r.id].paso.hab === k)
            const a = avg(rs.map((r) => r.nivel))
            const ult = rs.filter((r) => lunesDe(r.fecha) === semanas[semanas.length - 1]).map((r) => r.nivel)
            const ant = semanas.length > 1 ? rs.filter((r) => lunesDe(r.fecha) === semanas[semanas.length - 2]).map((r) => r.nivel) : []
            const dif = ult.length && ant.length ? (avg(ult) ?? 0) - (avg(ant) ?? 0) : null
            return (
              <div key={k} className="glass-panel p-4" style={{ borderTop: `4px solid ${HABILIDADES[k].c}` }}>
                <h4 className="text-sm font-semibold text-slate-900">{HABILIDADES[k].n}</h4>
                <p className="text-2xl font-bold text-slate-900">{a === null ? '—' : a.toFixed(1)}<span className="text-sm font-normal text-slate-500"> / 3</span></p>
                <p className="text-xs text-slate-500">{rs.length} registros{dif !== null ? ` · ${dif > 0.05 ? '▲ mejora' : dif < -0.05 ? '▼ baja' : '= estable'} vs. semana anterior` : ''}</p>
              </div>
            )
          })}
        </div>
        <div className="glass-panel p-4 text-xs text-slate-600">
          <b className="text-slate-900">Resumen global:</b> {registrados.length} actividades registradas · {solo} logradas solo ({Math.round((solo / registrados.length) * 100)}%) · {totalMin} min de práctica real
        </div>
      </div>
    )
  }

  // ---------- Historial ----------
  const vHistorial = () => {
    const info = ACTIVIDADES[sel]
    const rs = registrados.filter((r) => r.id === sel)
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Historial por actividad</h3>
        <div className="glass-panel p-4">
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {SEMANAS.map((s) => s.dias.map((d) => (
              <optgroup key={`${s.n}-${d.d}`} label={`Sem ${s.n} · ${d.n} — ${d.t}`}>
                {d.p.map((p, i) => <option key={i} value={actividadId(s.n, d.d, i)}>{p.nom}</option>)}
              </optgroup>
            )))}
          </select>
          <p className="mt-2 text-xs text-slate-600">{info.paso.desc}</p>
        </div>
        {!rs.length ? <div className="glass-panel p-4 text-sm text-slate-700">Sin registros para esta actividad todavía.</div> : (
          <>
            <div className="glass-panel p-4">
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={rs.map((r) => ({ fecha: fmtCorto(r.fecha), nivel: r.nivel }))} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="nivel" name="Nivel" stroke={HABILIDADES[info.paso.hab].c} strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-panel overflow-x-auto p-4">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500"><th className="py-1">Fecha</th><th>Nivel</th><th>Min</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {[...rs].reverse().map((r) => {
                    const n = NIVELES.find((x) => x.v === r.nivel)
                    return (
                      <tr key={r.fecha} className="border-t border-slate-100 align-top">
                        <td className="py-1.5 pr-2">{fmtCorto(r.fecha)}</td>
                        <td className="pr-2">{n ? <Chip color={n.c}>{n.t}</Chip> : null}</td>
                        <td className="pr-2">{r.minutos ?? ''}</td>
                        <td>{r.observacion}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <PageLayout
      title="Actividades de Santiago"
      actions={
        <>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => importarJson(e.target.files?.[0])} />
          <button type="button" className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-slate-600 hover:bg-slate-50" onClick={() => fileRef.current?.click()}>Importar respaldo .json</button>
        </>
      }
      tabs={<PageTabs items={TABS.map((t) => ({ id: t.key, label: t.label }))} activeId={tab} onChange={(id) => setTab(id as typeof tab)} />}
    >
      {error ? <p className="font-semibold text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-slate-600">Cargando…</p> : null}
      {tab === 'plan' ? vPlan() : tab === 'dia' ? vDia() : tab === 'semana' ? vSemana() : tab === 'progreso' ? vProgreso() : vHistorial()}
    </PageLayout>
  )
}

export default SistemasActividadesSantiagoPage
