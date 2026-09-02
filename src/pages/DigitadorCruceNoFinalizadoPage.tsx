import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDay, faFilter, faFloppyDisk, faRotateRight, faTableList } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'
import {
  fetchDigitadorCruceNoFinalizado,
  fetchDigitadorCruceNoFinalizadoEstados,
  guardarDigitadorCruceNoFinalizado,
  type DigitadorCruceNoFinalizadoPayload,
  type DigitadorCruceNoFinalizadoRow,
} from '../api/digitadorCruceNoFinalizadoApi'

type Draft = DigitadorCruceNoFinalizadoPayload

const today = () => new Date().toISOString().slice(0, 10)

const read = (row: DigitadorCruceNoFinalizadoRow, keys: string[]): string => {
  for (const key of keys) {
    const found = Object.entries(row).find(([name]) => name.toLowerCase() === key.toLowerCase())
    if (found?.[1] !== null && found?.[1] !== undefined && String(found[1]).trim() !== '') return String(found[1])
  }
  return ''
}

const formatDate = (value: string) => {
  if (!value) return '-'
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? value
}

const rowId = (row: DigitadorCruceNoFinalizadoRow) => Number(read(row, ['Id_BO_CITA_MAKIRO_Historial', 'idHistorial']))

const vistaTabs = [
  { key: 'pendientes' as const, label: 'Pendientes' },
  { key: 'marcados' as const, label: 'Marcados' },
]

const DigitadorCruceNoFinalizadoPage = () => {
  const { roleId, roleName } = useAuth()
  const isDigitador = roleId === 7 || ['digitador', 'sistemas', 'admin', 'central'].includes(roleName.trim().toLowerCase())
  const queryClient = useQueryClient()
  const [fechaDesde, setFechaDesde] = useState(today)
  const [fechaHasta, setFechaHasta] = useState(today)
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [vista, setVista] = useState<'pendientes' | 'marcados'>('pendientes')
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<DigitadorCruceNoFinalizadoRow | null>(null)

  const query = useQuery({
    queryKey: ['digitador-cruce-no-finalizado', fechaDesde, fechaHasta, vista, page],
    queryFn: () => fetchDigitadorCruceNoFinalizado(fechaDesde, fechaHasta, vista === 'marcados', page),
    enabled: isDigitador && Boolean(fechaDesde) && Boolean(fechaHasta),
  })

  const pendientesCountQuery = useQuery({
    queryKey: ['digitador-cruce-no-finalizado-count', fechaDesde, fechaHasta, false],
    queryFn: () => fetchDigitadorCruceNoFinalizado(fechaDesde, fechaHasta, false, 1, 1),
    enabled: isDigitador && Boolean(fechaDesde) && Boolean(fechaHasta),
  })

  const marcadosCountQuery = useQuery({
    queryKey: ['digitador-cruce-no-finalizado-count', fechaDesde, fechaHasta, true],
    queryFn: () => fetchDigitadorCruceNoFinalizado(fechaDesde, fechaHasta, true, 1, 1),
    enabled: isDigitador && Boolean(fechaDesde) && Boolean(fechaHasta),
  })

  const tabCounts: Record<'pendientes' | 'marcados', number> = {
    pendientes: pendientesCountQuery.data?.total ?? 0,
    marcados: marcadosCountQuery.data?.total ?? 0,
  }

  const estadosQuery = useQuery({
    queryKey: ['digitador-cruce-no-finalizado-estados'],
    queryFn: fetchDigitadorCruceNoFinalizadoEstados,
    enabled: isDigitador,
    staleTime: 300_000,
  })

  useEffect(() => {
    if (!query.data?.items) return
    setDrafts((current) => {
      const next = { ...current }
      for (const row of query.data.items) {
        const id = rowId(row)
        if (!Number.isFinite(id) || id <= 0 || next[id]) continue
        next[id] = {
          fechaEjecuacionDigitacion: formatDate(read(row, ['fecha_Ejecuacion_DIGITACION', 'fechaEjecucionDigitacion'])) === '-'
            ? fechaDesde
            : formatDate(read(row, ['fecha_Ejecuacion_DIGITACION', 'fechaEjecucionDigitacion'])),
          estadoDigitacion: read(row, ['Estado_DIGITACION', 'estadoDigitacion']),
          observacionDigitacion: read(row, ['Observacion_DIGITACION', 'observacionDigitacion']),
        }
      }
      return next
    })
  }, [fechaDesde, query.data])

  const rows = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return query.data?.items ?? []
    return (query.data?.items ?? []).filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)))
  }, [busqueda, query.data])

  const estadoOptions = useMemo(
    () => (estadosQuery.data ?? []).map((row) => read(row, ['estado', 'nombre', 'descripcion'])).filter(Boolean),
    [estadosQuery.data],
  )

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Draft }) => guardarDigitadorCruceNoFinalizado(id, payload),
    onSuccess: () => {
      setFeedback('Registro de digitacion guardado correctamente.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['digitador-cruce-no-finalizado', fechaDesde, fechaHasta, vista] })
      queryClient.invalidateQueries({ queryKey: ['digitador-cruce-no-finalizado-count', fechaDesde, fechaHasta] })
    },
    onError: (value) => {
      setError(getApiErrorMessage(value, 'No se pudo guardar la digitacion.'))
      setFeedback(null)
    },
  })

  const updateDraft = (id: number, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  if (!isDigitador) {
    return <FormCard title="Cruce para digitacion" description="Esta opcion esta disponible unicamente para digitadores."><div /></FormCard>
  }

  return (
    <div className="-mt-2 space-y-3 px-3 py-3 text-[13px] sm:px-4 sm:py-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3 text-blue-700">
            <FontAwesomeIcon icon={faTableList} className="shrink-0" />
            <h1 className="min-w-0 text-xl font-bold text-slate-900 sm:text-2xl">Cruce de ordenes no finalizadas</h1>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-2 text-xs"
            onClick={() => { query.refetch(); pendientesCountQuery.refetch(); marcadosCountQuery.refetch() }}
            disabled={query.isFetching}
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Actualizar
          </Button>
        </div>

        <div className="flex items-center gap-1 border-t border-slate-200 px-1 pt-3 mt-3">
          {vistaTabs.map((item) => {
            const active = vista === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { setVista(item.key); setPage(1) }}
                className={`inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-bold transition ${
                  active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {tabCounts[item.key]}
                </span>
              </button>
            )
          })}
        </div>

        <details className="group mt-2 border-t border-slate-200 pt-1" open>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-200">
            <span className="group-open:hidden">Mostrar filtros</span>
            <span className="hidden group-open:inline">Ocultar filtros</span>
            <span className="text-lg leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="grid gap-2 pt-2 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              Fecha desde
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                <FontAwesomeIcon icon={faCalendarDay} className="text-blue-600" />
                <input
                  type="date"
                  className="w-full bg-transparent text-xs outline-none"
                  value={fechaDesde}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaDesde(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }}
                />
              </div>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Fecha hasta
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                <FontAwesomeIcon icon={faCalendarDay} className="text-blue-600" />
                <input
                  type="date"
                  className="w-full bg-transparent text-xs outline-none"
                  value={fechaHasta}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaHasta(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }}
                />
              </div>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Buscar
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
                <input
                  className="w-full bg-transparent text-xs outline-none"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="OT, cliente, tecnico o estado..."
                />
              </div>
            </label>
          </div>
        </details>
      </section>

      {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {query.isError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{getApiErrorMessage(query.error, 'No se pudo cargar el cruce.')}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">Listado de ordenes</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{query.data?.total ?? 0} registros</span>
          </div>
        </div>
        <div className="space-y-1.5 p-2 sm:p-3">
          {query.isLoading ? <div className="px-3 py-8 text-center text-sm text-slate-500">Cargando ordenes...</div> : null}
          {!query.isLoading && rows.length === 0 ? <div className="px-3 py-8 text-center text-sm text-slate-500">No hay ordenes para la fecha seleccionada.</div> : null}
          {rows.map((row, index) => {
            const id = rowId(row)
            const draft = drafts[id] ?? { fechaEjecuacionDigitacion: fechaDesde, estadoDigitacion: '', observacionDigitacion: '' }
            const editable = vista === 'pendientes' && (read(row, ['puedeActualizarDigitacion']).toLowerCase() === 'true' || id > 0)
            return (
              <article key={`${id}-${index}`} className={`rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3 ${vista === 'marcados' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400'}`}>
                <div className="grid gap-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.4fr)]">
                  <div className="grid min-w-0 grid-cols-1 gap-y-1 text-xs">
                    {[
                      ['OT', read(row, ['OT_int', 'OrdenTrabajo']) || '-'],
                      ['Cliente', read(row, ['cliente_nro', 'CodigoCliente']) || '-'],
                      ['Tecnico', read(row, ['TECNICO', 'tecnico_nombre']) || '-'],
                      ['Sucursal', read(row, ['Sucursal', 'sucursal']) || '-'],
                      ['Estado actual', read(row, ['estado', 'Estado']) || '-'],
                      ['Tipo cruce', read(row, ['TipoCruce', 'tipoCruce']) || '-'],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><p className="truncate text-[7px] font-extrabold uppercase tracking-wide text-slate-600">{label}</p><p className="truncate text-[11px] font-bold text-slate-800" title={value}>{value}</p></div>)}
                  </div>
                  <div className="grid gap-0 rounded-xl border border-slate-200 bg-slate-50/70 p-0 sm:grid-cols-2">
                    <label className="text-[10px] font-extrabold text-slate-600">Fecha
                      <input className="input-base mt-1 text-xs" type="date" value={draft.fechaEjecuacionDigitacion} onChange={(event) => updateDraft(id, 'fechaEjecuacionDigitacion', event.target.value)} disabled={!editable} />
                    </label>
                    <label className="text-[10px] font-extrabold text-slate-600">Estado
                      <select className="input-base mt-1 text-xs" value={draft.estadoDigitacion} onChange={(event) => updateDraft(id, 'estadoDigitacion', event.target.value)} disabled={!editable || estadosQuery.isLoading}>
                        <option value="">Selecciona un estado</option>
                        {estadoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="-mt-2 text-[10px] font-extrabold text-slate-600 sm:col-span-2">Obs.
                      <textarea className="input-base mt-0 min-h-12 resize-y text-xs" value={draft.observacionDigitacion} onChange={(event) => updateDraft(id, 'observacionDigitacion', event.target.value)} placeholder="Escribe la observacion" disabled={!editable} />
                    </label>
                    <div className="-mt-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" className="!rounded-xl !px-3 !py-1.5 !text-xs" onClick={() => setDetalle(row)}>Ver detalle</Button>
                        {vista === 'pendientes' ? (
                          <Button type="button" className="!rounded-xl !px-3 !py-1.5 !text-xs" onClick={() => mutation.mutate({ id, payload: draft })} disabled={!editable || mutation.isPending}><FontAwesomeIcon icon={faFloppyDisk} /> {mutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        {(query.data?.totalPages ?? 1) > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 sm:px-4">
            <p className="text-xs text-slate-500">Pagina {query.data?.page ?? page} de {query.data?.totalPages ?? 1}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || query.isFetching}>Anterior</Button>
              <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.min(query.data?.totalPages ?? current, current + 1))} disabled={page >= (query.data?.totalPages ?? 1) || query.isFetching}>Siguiente</Button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal open={Boolean(detalle)} title="Detalle de orden" onClose={() => setDetalle(null)}>
        <div className="grid gap-3 sm:grid-cols-2">
          {detalle ? Object.entries(detalle)
            .filter(([key]) => !['puedeActualizarDigitacion', 'Id_BO_CITA_MAKIRO_Historial'].includes(key))
            .map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="break-all text-[9px] font-bold uppercase tracking-wide text-slate-500">{key}</p>
                <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-sm font-semibold text-slate-700">{String(value ?? '-')}</p>
              </div>
            )) : null}
        </div>
      </Modal>
    </div>
  )
}

export default DigitadorCruceNoFinalizadoPage
