import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faFloppyDisk, faMagnifyingGlass, faRotateRight } from '@fortawesome/free-solid-svg-icons'
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
    <div className="bento-page digitador-cruce-page">
      <div className="bento-page-head">
        <h2>Cruce de ordenes no finalizadas</h2>
        <p>Completa fecha de ejecucion, estado y observacion de cada orden.</p>
      </div>

      <FormCard title="Consulta" description="Los datos se obtienen de spy_CruceOrdenes_Agenda_vs_Makiro_NO_FINALIZADO.">
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-bold ${vista === 'pendientes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`} onClick={() => { setVista('pendientes'); setPage(1) }}>Pendientes</button>
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-bold ${vista === 'marcados' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`} onClick={() => { setVista('marcados'); setPage(1) }}>Marcados</button>
        </div>
        <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)_auto_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faCalendarDays} className="text-brand-600" /> Fecha desde</span>
            <input className="input-base mt-1" type="date" value={fechaDesde} onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaDesde(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Fecha hasta
            <input className="input-base mt-1" type="date" value={fechaHasta} onChange={(event: ChangeEvent<HTMLInputElement>) => { setFechaHasta(event.target.value); setPage(1); setDrafts({}); setFeedback(null) }} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Buscar
            <div className="relative mt-1">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-base pl-9" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="OT, cliente, tecnico o estado..." />
            </div>
          </label>
          <Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}><FontAwesomeIcon icon={faRotateRight} /> Actualizar</Button>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-bold text-slate-700">{query.data?.total ?? 0} registros</div>
        </div>
      </FormCard>

      {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {query.isError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{getApiErrorMessage(query.error, 'No se pudo cargar el cruce.')}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {query.isLoading ? <div className="px-3 py-8 text-center text-sm text-slate-500">Cargando ordenes...</div> : null}
        {!query.isLoading && rows.length === 0 ? <div className="px-3 py-8 text-center text-sm text-slate-500">No hay ordenes para la fecha seleccionada.</div> : null}
        <div className="space-y-1.5">
          {rows.map((row, index) => {
            const id = rowId(row)
            const draft = drafts[id] ?? { fechaEjecuacionDigitacion: fechaDesde, estadoDigitacion: '', observacionDigitacion: '' }
            const editable = read(row, ['puedeActualizarDigitacion']).toLowerCase() === 'true' || id > 0
            return (
              <article key={`${id}-${index}`} className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 ${vista === 'marcados' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400'}`}>
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${vista === 'marcados' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {vista === 'marcados' ? 'Marcado' : 'Pendiente'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">OT {read(row, ['OT_int', 'OrdenTrabajo']) || '-'}</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 text-sm">
                    {[
                      ['OT', read(row, ['OT_int', 'OrdenTrabajo']) || '-'],
                      ['Cliente', read(row, ['cliente_nro', 'CodigoCliente']) || '-'],
                      ['Tecnico', read(row, ['TECNICO', 'tecnico_nombre']) || '-'],
                      ['Sucursal', read(row, ['Sucursal', 'sucursal']) || '-'],
                      ['Estado actual', read(row, ['estado', 'Estado']) || '-'],
                      ['Tipo cruce', read(row, ['TipoCruce', 'tipoCruce']) || '-'],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-600">{label}</p><p className="break-words text-sm font-bold text-slate-800">{value}</p></div>)}
                  </div>
                  <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2">
                    <label className="text-[11px] font-extrabold text-slate-600">Fecha
                      <input className="input-base mt-1 text-sm" type="date" value={draft.fechaEjecuacionDigitacion} onChange={(event) => updateDraft(id, 'fechaEjecuacionDigitacion', event.target.value)} disabled={!editable} />
                    </label>
                    <label className="text-[11px] font-extrabold text-slate-600">Estado
                      <select className="input-base mt-1 text-sm" value={draft.estadoDigitacion} onChange={(event) => updateDraft(id, 'estadoDigitacion', event.target.value)} disabled={!editable || estadosQuery.isLoading}>
                        <option value="">Selecciona un estado</option>
                        {estadoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] font-extrabold text-slate-600 sm:col-span-2">Obs.
                      <textarea className="input-base mt-1 min-h-20 resize-y text-sm" value={draft.observacionDigitacion} onChange={(event) => updateDraft(id, 'observacionDigitacion', event.target.value)} placeholder="Escribe la observacion" disabled={!editable} />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                      <p className="text-[11px] text-slate-500">Al guardar: actualizado = 1, usuario y fecha se registran automaticamente.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => setDetalle(row)}>Ver detalle</Button>
                        <Button type="button" onClick={() => mutation.mutate({ id, payload: draft })} disabled={!editable || mutation.isPending}><FontAwesomeIcon icon={faFloppyDisk} /> {mutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        {(query.data?.totalPages ?? 1) > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
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
