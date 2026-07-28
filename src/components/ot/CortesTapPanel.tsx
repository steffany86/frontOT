import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faEye, faRotate, faTowerBroadcast } from '@fortawesome/free-solid-svg-icons'
import { fetchCortesTap, finalizarCorteTap, type CorteTapRow } from '../../api/corteTapApi'
import CorteTapDetailModal from './CorteTapDetailModal'
import { getApiErrorMessage } from '../../services/httpClient'

const readValue = (row: CorteTapRow, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return null
}

const readText = (row: CorteTapRow, keys: string[]): string => {
  const value = readValue(row, keys)
  return value === null ? '' : String(value).trim()
}

const formatDateTime = (value: unknown): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '-'
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const getSearchableText = (row: CorteTapRow): string =>
  Object.values(row)
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(' ')
    .toLowerCase()

type Props = {
  mode?: 'digitador' | 'tecnico'
}

const CortesTapPanel = ({ mode = 'tecnico' }: Props) => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [tecnicoFilter, setTecnicoFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cortesQuery = useQuery({
    queryKey: [mode === 'digitador' ? 'digitador-cortes-tap' : 'ot-dashboard-cortes-tap'],
    queryFn: fetchCortesTap,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const rows = cortesQuery.data ?? []
  const tecnicos = useMemo(
    () => rows
      .map((row) => readText(row, ['Tecnico1_OT1', 'Tecnico', 'tecnico']))
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  )
  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !normalized || getSearchableText(row).includes(normalized)
      const matchesTecnico = !tecnicoFilter
        || readText(row, ['Tecnico1_OT1', 'Tecnico', 'tecnico']) === tecnicoFilter
      return matchesSearch && matchesTecnico
    })
  }, [rows, search, tecnicoFilter])

  const finalizacionMutation = useMutation({
    mutationFn: finalizarCorteTap,
    onSuccess: async () => {
      setError(null)
      setFeedback('Corte TAP finalizado correctamente.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['digitador-cortes-tap'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-cortes-tap'] }),
      ])
    },
    onError: (value) => {
      setFeedback(null)
      setError(getApiErrorMessage(value, 'No se pudo finalizar el Corte TAP.'))
    },
  })

  const handleFinalizar = (id: number) => {
    if (!window.confirm('¿Confirmas que deseas finalizar este Corte TAP?')) return
    setFeedback(null)
    setError(null)
    finalizacionMutation.mutate(id)
  }

  return (
    <div className="mt-4 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {search.trim() || tecnicoFilter ? `${filteredRows.length} de ${rows.length} registros` : `${rows.length} registros`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Actualizacion automatica cada minuto.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          {mode === 'digitador' ? (
            <select
              value={tecnicoFilter}
              onChange={(event) => setTecnicoFilter(event.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-56 lg:w-64"
              aria-label="Filtrar por tecnico"
            >
              <option value="">Todos los tecnicos</option>
              {tecnicos.map((tecnico) => <option key={tecnico} value={tecnico}>{tecnico}</option>)}
            </select>
          ) : null}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, OT, tecnico, nodo o estado"
            className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-80 lg:w-96"
          />
          <button
            type="button"
            onClick={() => void cortesQuery.refetch()}
            disabled={cortesQuery.isFetching}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60"
            title="Actualizar cortes TAP"
          >
            <FontAwesomeIcon icon={faRotate} className={cortesQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="sr-only">Actualizar</span>
          </button>
        </div>
      </div>

      {feedback ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {cortesQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center text-sm font-medium text-slate-500">Cargando cortes TAP...</div>
      ) : cortesQuery.isError ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo consultar la lista de cortes TAP.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center border-b border-slate-200 text-center">
          <FontAwesomeIcon icon={faTowerBroadcast} className="mb-3 text-3xl text-slate-300" aria-hidden="true" />
          <p className="font-semibold text-slate-700">{rows.length === 0 ? 'No hay cortes TAP registrados.' : 'No hay coincidencias.'}</p>
        </div>
      ) : (
        <div className="mt-4 w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg border border-slate-200">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600">
              <tr>
                <th className="w-[72px] px-2 py-2.5">Cliente</th>
                <th className="w-[44px] px-2 py-2.5">TOR</th>
                <th className="w-[92px] px-2 py-2.5">Tecnico</th>
                <th className="w-[76px] px-2 py-2.5">Sucursal</th>
                <th className="w-[88px] px-2 py-2.5">Estado</th>
                <th className="w-[130px] px-2 py-2.5">Digitacion</th>
                <th className="w-[44px] px-2 py-2.5">Dias</th>
                <th className="w-[150px] px-2 py-2.5">Nodo / TAP / Boca</th>
                <th className="w-[136px] px-2 py-2.5">Zona / Distrito</th>
                <th className="w-[82px] px-2 py-2.5">OT</th>
                <th className="w-[118px] px-2 py-2.5">Observacion</th>
                <th className="w-[120px] px-2 py-2.5">Registro</th>
                <th className="w-[128px] px-2 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {filteredRows.map((row, index) => {
                const estado = readText(row, ['Estado', 'estado']) || '-'
                const estadoNormalized = estado.toUpperCase()
                const estadoClass = estadoNormalized === 'FINALIZADO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : estadoNormalized === 'EJECUTADA'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                const digitado = Boolean(readValue(row, ['FechaRegDig_D2']))
                const tecnicoCompleto = Boolean(readValue(row, ['FechaRegTec_T3']))
                const id = Number(readValue(row, ['id', 'Id']))
                return (
                  <tr key={`${readText(row, ['id', 'Id']) || 'corte'}-${index}`} className="hover:bg-slate-50">
                    <td className="truncate px-2 py-2.5 font-semibold text-slate-900">
                      {readText(row, ['CodigoCliente_OT1', 'CodigoCliente', 'cliente']) || '-'}
                    </td>
                    <td className="truncate px-2 py-2.5">{readText(row, ['TOR_OT1', 'TOR', 'tor']) || '-'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">{readText(row, ['Tecnico1_OT1', 'Tecnico', 'tecnico']) || '-'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">{readText(row, ['Sucursal_OT1', 'Sucursal', 'sucursal']) || '-'}</td>
                    <td className="px-2 py-2.5">
                      <span className={`inline-flex rounded-md px-2 py-1 font-semibold ${estadoClass}`}>{estado}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`inline-flex rounded-md px-2 py-1 font-semibold ${digitado ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {digitado ? 'Modificado por digitador' : 'Pendiente digitador'}
                      </span>
                    </td>
                    <td className="truncate px-2 py-2.5">{readText(row, ['ContadorDias', 'Dias', 'dias']) || '0'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">{readText(row, ['NodoTapBoca_D2', 'NodoTapBoca', 'nodo']) || '-'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">
                      {[readText(row, ['Zona_D2', 'Zona_HFC_D2', 'Zona']), readText(row, ['Distrito_D2', 'Distrito'])]
                        .filter(Boolean)
                        .join(' / ') || '-'}
                    </td>
                    <td className="truncate px-2 py-2.5 font-medium">{readText(row, ['OrdenTrabajo_T3', 'OrdenTrabajo', 'OT']) || '-'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">{readText(row, ['Observacion_T3', 'Observacion', 'observacion']) || '-'}</td>
                    <td className="break-words px-2 py-2.5 leading-tight">{formatDateTime(readValue(row, ['FechaReg_OT1', 'FechaRegDig_D2', 'FechaRegTec_T3']))}</td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700"
                        onClick={() => Number.isFinite(id) && id > 0 && setSelectedId(id)}
                        disabled={!Number.isFinite(id) || id <= 0}
                      >
                        <FontAwesomeIcon icon={faEye} />
                        Ver detalle
                      </button>
                      {mode === 'digitador' && estadoNormalized === 'EJECUTADA' && tecnicoCompleto ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                          onClick={() => handleFinalizar(id)}
                          disabled={finalizacionMutation.isPending || !Number.isFinite(id) || id <= 0}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                          Finalizar
                        </button>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <CorteTapDetailModal id={selectedId} mode={mode} onClose={() => setSelectedId(null)} />
    </div>
  )
}

export default CortesTapPanel
