import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDay, faFilter, faFloppyDisk, faRotateRight } from '@fortawesome/free-solid-svg-icons'
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
    <div className="bento-page sup-v2-fs gap-2">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate page-title">Cruce de ordenes no finalizadas</h1>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={() => { query.refetch(); pendientesCountQuery.refetch(); marcadosCountQuery.refetch() }}
            disabled={query.isFetching}
          >
            <FontAwesomeIcon icon={faRotateRight} />
            Actualizar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 px-2 py-1.5 sm:px-3">
          {vistaTabs.map((item) => {
            const active = vista === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { setVista(item.key); setPage(1) }}
                className={`inline-flex items-center gap-1.5 rounded-t-lg px-2.5 py-1.5 text-xs font-bold transition ${
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

        <details className="group border-t border-slate-200 px-2 py-1 sm:px-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
            <span className="group-open:hidden">Mostrar filtros</span>
            <span className="hidden group-open:inline">Ocultar filtros</span>
            <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="grid items-end gap-2 pb-1 pt-1.5 md:grid-cols-3">
            <label className="flex w-full flex-col gap-0.5 font-medium text-slate-500">
              Fecha desde
              <div className="flex h-8 items-center gap-2 rounded-md bg-slate-100 px-2.5">
                <FontAwesomeIcon icon={faCalendarDay} className="text-slate-400" />
                <input
                  type="date"
                  className="w-full bg-transparent text-slate-800 outline-none"
                  value={fechaDesde}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaDesde(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }}
                />
              </div>
            </label>
            <label className="flex w-full flex-col gap-0.5 font-medium text-slate-500">
              Fecha hasta
              <div className="flex h-8 items-center gap-2 rounded-md bg-slate-100 px-2.5">
                <FontAwesomeIcon icon={faCalendarDay} className="text-slate-400" />
                <input
                  type="date"
                  className="w-full bg-transparent text-slate-800 outline-none"
                  value={fechaHasta}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaHasta(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }}
                />
              </div>
            </label>
            <label className="flex w-full flex-col gap-0.5 font-medium text-slate-500">
              Buscar
              <div className="flex h-8 items-center gap-2 rounded-md bg-slate-100 px-2.5">
                <FontAwesomeIcon icon={faFilter} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-slate-800 outline-none"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="OT, cliente, tecnico o estado..."
                />
              </div>
            </label>
          </div>
        </details>
      </section>

      {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div> : null}
      {query.isError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{getApiErrorMessage(query.error, 'No se pudo cargar el cruce.')}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3 py-1.5 sm:px-4">
          <h2 className="page-title">Listado de Ordenes</h2>
          <p className="text-xs text-slate-600">{query.data?.total ?? 0} registro(s)</p>
        </div>
        <div className="space-y-1.5 p-2 sm:p-3">
          {query.isLoading ? <div className="px-3 py-4 text-center text-slate-500">Cargando ordenes...</div> : null}
          {!query.isLoading && rows.length === 0 ? <div className="px-3 py-4 text-center text-slate-500">No hay ordenes para la fecha seleccionada.</div> : null}
          {rows.map((row, index) => {
            const id = rowId(row)
            const draft = drafts[id] ?? { fechaEjecuacionDigitacion: fechaDesde, estadoDigitacion: '', observacionDigitacion: '' }
            const editable = vista === 'pendientes' && (read(row, ['puedeActualizarDigitacion']).toLowerCase() === 'true' || id > 0)
            return (
              <article key={`${id}-${index}`} className={`rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${vista === 'marcados' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400'}`}>
                <div className="grid gap-2 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.4fr)]">
                  <div className="grid min-w-0 grid-cols-1 gap-y-0.5">
                    {[
                      ['OT', read(row, ['OT_int', 'OrdenTrabajo']) || '-'],
                      ['Cliente', read(row, ['cliente_nro', 'CodigoCliente']) || '-'],
                      ['Tecnico', read(row, ['TECNICO', 'tecnico_nombre']) || '-'],
                      ['Sucursal', read(row, ['Sucursal', 'sucursal']) || '-'],
                      ['Estado actual', read(row, ['estado', 'Estado']) || '-'],
                      ['Tipo cruce', read(row, ['TipoCruce', 'tipoCruce']) || '-'],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><p className="truncate text-[10px] font-medium uppercase text-slate-500">{label}</p><p className="truncate font-semibold text-slate-800" title={value}>{value}</p></div>)}
                  </div>
                  <div className="grid gap-0 rounded-xl border border-slate-200 bg-slate-50/70 p-0 sm:grid-cols-2">
                    <label className="font-medium text-slate-500">Fecha
                      <input className="input-base mt-0.5" type="date" value={draft.fechaEjecuacionDigitacion} onChange={(event) => updateDraft(id, 'fechaEjecuacionDigitacion', event.target.value)} disabled={!editable} />
                    </label>
                    <label className="font-medium text-slate-500">Estado
                      <select className="input-base mt-0.5" value={draft.estadoDigitacion} onChange={(event) => updateDraft(id, 'estadoDigitacion', event.target.value)} disabled={!editable || estadosQuery.isLoading}>
                        <option value="">Selecciona un estado</option>
                        {estadoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="-mt-2 font-medium text-slate-500 sm:col-span-2">Obs.
                      <textarea className="input-base mt-0 min-h-12 resize-y" value={draft.observacionDigitacion} onChange={(event) => updateDraft(id, 'observacionDigitacion', event.target.value)} placeholder="Escribe la observacion" disabled={!editable} />
                    </label>
                    <div className="-mt-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" className="!rounded-lg !px-3 !py-1" onClick={() => setDetalle(row)}>Ver detalle</Button>
                        {vista === 'pendientes' ? (
                          <Button type="button" className="!rounded-lg !px-3 !py-1" onClick={() => mutation.mutate({ id, payload: draft })} disabled={!editable || mutation.isPending}><FontAwesomeIcon icon={faFloppyDisk} /> {mutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 sm:px-4">
            <p className="text-xs text-slate-500">Pagina {query.data?.page ?? page} de {query.data?.totalPages ?? 1}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || query.isFetching}>Anterior</Button>
              <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.min(query.data?.totalPages ?? current, current + 1))} disabled={page >= (query.data?.totalPages ?? 1) || query.isFetching}>Siguiente</Button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal open={Boolean(detalle)} title="Detalle de orden" onClose={() => setDetalle(null)} compactText>
        <div className="grid gap-2 sm:grid-cols-2">
          {detalle ? Object.entries(detalle)
            .filter(([key]) => !['puedeActualizarDigitacion', 'Id_BO_CITA_MAKIRO_Historial'].includes(key))
            .map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <p className="break-all text-[10px] font-medium uppercase text-slate-500">{key}</p>
                <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-semibold text-slate-700">{String(value ?? '-')}</p>
              </div>
            )) : null}
        </div>
      </Modal>
    </div>
  )
}

export default DigitadorCruceNoFinalizadoPage
