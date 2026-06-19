import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import {
  confirmarDigitadorGeorefDistancia,
  fetchDigitadorGeorefDistancias,
  type ConfirmarDigitadorGeorefPayload,
  type DigitadorGeorefRow,
} from '../api/digitadorGeorefApi'
import { getApiErrorMessage } from '../services/httpClient'

type MapSelection = {
  row: DigitadorGeorefRow
  id: number
  cliente: string
  ot: string
  latCliente: number | null
  lonCliente: number | null
  latVenta: number | null
  lonVenta: number | null
}

type ConfirmDraft = {
  confirmarUbicacion: boolean
  confirmarNodo: boolean
}

const todayIso = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const readValue = (row: DigitadorGeorefRow, keys: string[]): unknown => {
  const normalized = keys.map((key) => key.replace(/[_\-\s]/g, '').toLowerCase())
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [key, value] of Object.entries(row)) {
    if (!normalized.includes(key.replace(/[_\-\s]/g, '').toLowerCase())) continue
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const asText = (row: DigitadorGeorefRow, keys: string[]): string => {
  const value = readValue(row, keys)
  return value === undefined || value === null ? '' : String(value)
}

const isFlagOne = (row: DigitadorGeorefRow, keys: string[]): boolean => asText(row, keys).trim() === '1'

const isFullyConfirmed = (row: DigitadorGeorefRow): boolean =>
  isFlagOne(row, ['Actualizado']) && isFlagOne(row, ['Actualizado_NODO'])

const asNumber = (row: DigitadorGeorefRow, keys: string[]): number | null => {
  const value = readValue(row, keys)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const asCoordinate = (row: DigitadorGeorefRow, keys: string[]): number | null => {
  const value = asNumber(row, keys)
  return value === null || value === 0 ? null : value
}

const formatMeters = (value: number | null): string => {
  if (value === null) return '-'
  return `${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })} m`
}

const formatCoordinate = (value: number | null): string => {
  if (value === null) return '-'
  return value.toLocaleString('es-BO', { maximumFractionDigits: 8, useGrouping: false })
}

const formatDetailValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '-'
  if (value instanceof Date) return value.toLocaleString('es-BO')
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-'
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getDetailEntries = (row: DigitadorGeorefRow): Array<[string, string]> =>
  Object.entries(row).map(([key, value]) => [key, formatDetailValue(value)])

const normalizeCompareValue = (value: string): string => value.trim().replace(/\s+/g, '').toUpperCase()

const hasComparableValue = (value: string): boolean => {
  const normalized = normalizeCompareValue(value)
  return normalized !== '' && normalized !== '-'
}

const hasNtbDifference = (row: DigitadorGeorefRow): boolean => {
  const ntb = asText(row, ['N_T_B', 'NTB', 'ntb'])
  const ntbVenta = asText(row, ['N_T_B_V', 'NTB_V', 'ntb_v', 'NTBV'])
  if (!hasComparableValue(ntb) && !hasComparableValue(ntbVenta)) return false
  return normalizeCompareValue(ntb) !== normalizeCompareValue(ntbVenta)
}

const isNtbKey = (key: string): boolean => ['ntb', 'ntbv'].includes(key.replace(/[_\-\s]/g, '').toLowerCase())

const NtbDifferenceBadge = () => (
  <span className="inline-flex w-fit rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
    NTB diferente
  </span>
)

const TecnicoCell = ({ row }: { row: DigitadorGeorefRow }) => {
  const sf = asText(row, ['tecnico_nombre'])
  const tecnico = asText(row, ['TECNICO', 'tecnico'])

  if (!sf && !tecnico) return <span>-</span>

  return (
    <div className="space-y-1">
      <p className="break-words">
        <span className="font-semibold text-slate-500">SF:</span> {sf || '-'}
      </p>
      <p className="break-words">
        <span className="font-semibold text-slate-500">TEC:</span> {tecnico || '-'}
      </p>
    </div>
  )
}

const DarkField = ({ label, value, boxed = false, danger = false }: { label: string; value: string; boxed?: boolean; danger?: boolean }) => (
  <div className="grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3 text-[11px] sm:text-xs">
    <span className={`font-bold uppercase ${danger ? 'text-rose-700' : 'text-slate-600'}`}>{label}</span>
    <span
      className={`min-h-7 break-words rounded-md px-2 py-1 font-semibold ${
        danger ? 'text-rose-700' : boxed ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'text-slate-900'
      }`}
    >
      {value || '-'}
    </span>
  </div>
)

const GeorefSummaryCard = ({
  row,
  selection,
  onOpenDetail,
  onConfirm,
  draft,
  onDraftChange,
  confirmDisabled,
}: {
  row: DigitadorGeorefRow
  selection: MapSelection | null
  onOpenDetail: () => void
  onConfirm: () => void
  draft: ConfirmDraft
  onDraftChange: (next: ConfirmDraft) => void
  confirmDisabled: boolean
}) => {
  const ntbDifferent = hasNtbDifference(row)
  const actualizado = isFlagOne(row, ['Actualizado'])
  const actualizadoNodo = isFlagOne(row, ['Actualizado_NODO'])
  const latTecnico = asCoordinate(row, ['Latitud_V', 'Latitud'])
  const lonTecnico = asCoordinate(row, ['Longitud_V', 'Longitud'])
  const ntb = asText(row, ['N_T_B', 'NTB', 'ntb'])
  const ntbVenta = asText(row, ['N_T_B_V', 'NTB_V', 'ntb_v', 'NTBV'])

  return (
    <article className={`rounded-[24px] border p-4 text-slate-900 shadow-sm sm:p-5 ${ntbDifferent ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1.25fr_0.7fr] lg:items-start">
        <div className="space-y-3">
          <DarkField label="OT" value={asText(row, ['OT', 'ot'])} boxed danger={ntbDifferent} />
          <DarkField label="Cliente" value={asText(row, ['cliente_nro', 'cliente'])} boxed danger={ntbDifferent} />
          <button
            type="button"
            onClick={onOpenDetail}
            disabled={!selection}
            className="w-full rounded-md bg-white px-3 py-3 text-left text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <TecnicoCell row={row} />
          </button>
        </div>

        <div className="space-y-3">
          <DarkField label="N_T_B" value={ntb} danger={ntbDifferent} />
          <DarkField label="N_T_B_V" value={ntbVenta} danger={ntbDifferent} />
          <div className="grid gap-3 text-[11px] sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:text-xs">
            <span className={`font-bold uppercase ${ntbDifferent ? 'text-rose-700' : 'text-slate-600'}`}>Latitud Long</span>
            <div className="grid gap-3 font-semibold text-slate-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="space-y-1">
                <p>{formatCoordinate(latTecnico)}</p>
                <p>{formatCoordinate(lonTecnico)}</p>
              </div>
              <div className="text-left text-[11px] font-bold sm:text-right">
                <p className="text-rose-600">diferencia</p>
                <p className="text-rose-600">{formatMeters(asNumber(row, ['DistanciaMetros']))}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4 pt-1">
            <label className="flex cursor-pointer items-end gap-3">
              <span className="max-w-16 text-[10px] font-bold leading-none text-slate-600">confirmar ubicacion</span>
              <input
                type="checkbox"
                className="h-6 w-6 rounded border-slate-300 text-blue-600"
                checked={actualizado || draft.confirmarUbicacion}
                disabled={actualizado}
                onChange={(event) => onDraftChange({ ...draft, confirmarUbicacion: event.target.checked })}
              />
            </label>
            <label className="flex cursor-pointer items-end gap-3">
              <span className="max-w-16 text-[10px] font-bold leading-none text-slate-600">confirmar NODO</span>
              <input
                type="checkbox"
                className="h-6 w-6 rounded border-slate-300 text-blue-600"
                checked={actualizadoNodo || draft.confirmarNodo}
                disabled={actualizadoNodo}
                onChange={(event) => onDraftChange({ ...draft, confirmarNodo: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {ntbDifferent ? <NtbDifferenceBadge /> : null}
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={onOpenDetail}
              disabled={!selection}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              detalle
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              confirmar
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

const mapsUrl = (lat: number, lon: number): string => `https://www.google.com/maps?q=${lat},${lon}`

const MapPanel = ({ title, lat, lon }: { title: string; lat: number | null; lon: number | null }) => {
  if (lat === null || lon === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {title}: sin coordenadas validas.
      </div>
    )
  }

  const url = mapsUrl(lat, lon)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <a className="text-xs font-semibold text-blue-600 hover:text-blue-700" href={url} target="_blank" rel="noreferrer">
          Abrir en Maps
        </a>
      </div>
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <span className="font-semibold uppercase text-slate-500">Latitud</span>
          <p className="mt-0.5 font-semibold text-slate-800">{formatCoordinate(lat)}</p>
        </div>
        <div>
          <span className="font-semibold uppercase text-slate-500">Longitud</span>
          <p className="mt-0.5 font-semibold text-slate-800">{formatCoordinate(lon)}</p>
        </div>
      </div>
      <iframe
        title={title}
        className="h-64 w-full rounded-lg border border-slate-200"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${lat},${lon}&z=17&output=embed`}
      />
      <p className="text-xs text-slate-500">
        {formatCoordinate(lat)}, {formatCoordinate(lon)}
      </p>
    </div>
  )
}

const DigitadorGeorefPage = () => {
  const queryClient = useQueryClient()
  const [fecha, setFecha] = useState(todayIso())
  const [selected, setSelected] = useState<MapSelection | null>(null)
  const [tab, setTab] = useState<'pendientes' | 'confirmados'>('pendientes')
  const [confirmDrafts, setConfirmDrafts] = useState<Record<number, ConfirmDraft>>({})

  const query = useQuery({
    queryKey: ['digitador-georef-distancias', fecha],
    queryFn: () => fetchDigitadorGeorefDistancias(fecha),
    enabled: Boolean(fecha),
  })

  const confirmarMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ConfirmarDigitadorGeorefPayload }) =>
      confirmarDigitadorGeorefDistancia(id, payload),
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['digitador-georef-distancias'] })
    },
  })

  const rows = useMemo(() => query.data ?? [], [query.data])
  const pendientes = useMemo(() => rows.filter((row) => !isFullyConfirmed(row)), [rows])
  const confirmados = useMemo(() => rows.filter((row) => isFullyConfirmed(row)), [rows])
  const visibleRows = tab === 'pendientes' ? pendientes : confirmados

  const buildSelection = (row: DigitadorGeorefRow): MapSelection | null => {
    const id = asNumber(row, ['Id_BO_CITA_MAKIRO_Historial', 'id'])
    if (id === null || id <= 0) return null
    return {
      row,
      id,
      cliente: asText(row, ['cliente_nro', 'cliente']),
      ot: asText(row, ['OT', 'ot']),
      latCliente: asCoordinate(row, ['Latitud_C', 'GeoSur']),
      lonCliente: asCoordinate(row, ['Longitud_C', 'GeoOeste']),
      latVenta: asCoordinate(row, ['Latitud_V', 'Latitud']),
      lonVenta: asCoordinate(row, ['Longitud_V', 'Longitud']),
    }
  }

  const getDraft = (id: number): ConfirmDraft => confirmDrafts[id] ?? { confirmarUbicacion: false, confirmarNodo: false }

  const setDraft = (id: number, next: ConfirmDraft) => {
    setConfirmDrafts((current) => ({ ...current, [id]: next }))
  }

  const confirmRow = (selection: MapSelection | null) => {
    if (!selection) return
    const draft = getDraft(selection.id)
    if (!draft.confirmarUbicacion && !draft.confirmarNodo) return
    confirmarMutation.mutate({
      id: selection.id,
      payload: {
        confirmarUbicacion: draft.confirmarUbicacion,
        confirmarNodo: draft.confirmarNodo,
      },
    })
  }

  return (
    <div className="bento-page space-y-4">
      <section className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Georeferencias por revisar</h1>
            <p className="text-sm text-slate-500">Registros finalizados con distancia mayor o igual a 15 metros.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Fecha</span>
              <input className="input-base h-10 rounded-md text-sm" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
            </label>
            <Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('pendientes')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'pendientes' ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            Pendientes ({pendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('confirmados')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'confirmados' ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            Confirmados ({confirmados.length})
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-auto p-3 sm:p-4">
          {visibleRows.map((row, index) => {
            const selection = buildSelection(row)
            const id = selection?.id ?? index
            const draft = selection ? getDraft(selection.id) : { confirmarUbicacion: false, confirmarNodo: false }
            return (
              <GeorefSummaryCard
                key={id}
                row={row}
                selection={selection}
                onOpenDetail={() => selection && setSelected(selection)}
                onConfirm={() => confirmRow(selection)}
                draft={draft}
                onDraftChange={(next) => selection && setDraft(selection.id, next)}
                confirmDisabled={!selection || (!draft.confirmarUbicacion && !draft.confirmarNodo) || confirmarMutation.isPending}
              />
            )
          })}
          {!query.isLoading && visibleRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Sin registros {tab === 'pendientes' ? 'pendientes' : 'confirmados'} para la fecha seleccionada.
            </div>
          ) : null}
          {query.isLoading ? <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando registros...</div> : null}
        </div>
        {query.isError ? (
          <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {getApiErrorMessage(query.error, 'No se pudieron cargar las georeferencias.')}
          </div>
        ) : null}
      </section>

      <Modal
        open={Boolean(selected)}
        title={selected ? `Detalle OT ${selected.ot} | Cliente ${selected.cliente}` : 'Detalle'}
        onClose={() => setSelected(null)}
        maxWidthClass="max-w-6xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Distancia</p>
                <p className="font-semibold text-slate-900">{formatMeters(asNumber(selected.row, ['DistanciaMetros']))}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Tecnico</p>
                <div className="font-semibold text-slate-900">
                  <TecnicoCell row={selected.row} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Actualizado</p>
                <p className="font-semibold text-slate-900">{asText(selected.row, ['Actualizado']) || '-'}</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <MapPanel title="Ubicacion tecnico" lat={selected.latVenta} lon={selected.lonVenta} />
              <MapPanel title="Ubicacion C (cliente)" lat={selected.latCliente} lon={selected.lonCliente} />
            </div>
            {hasNtbDifference(selected.row) ? <NtbDifferenceBadge /> : null}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Datos completos del registro</p>
              </div>
              <div className="grid max-h-80 overflow-auto text-sm sm:grid-cols-2 lg:grid-cols-3">
                {getDetailEntries(selected.row).map(([key, value]) => {
                  const markNtb = hasNtbDifference(selected.row) && isNtbKey(key)
                  return (
                    <div key={key} className={`min-w-0 border-b px-4 py-3 ${markNtb ? 'border-rose-100 bg-rose-50' : 'border-slate-100'}`}>
                    <p className={`break-words text-xs font-semibold uppercase ${markNtb ? 'text-rose-700' : 'text-slate-500'}`}>{key}</p>
                    <p className={`mt-1 break-words font-medium ${markNtb ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
                  </div>
                  )
                })}
              </div>
            </div>
            {confirmarMutation.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {getApiErrorMessage(confirmarMutation.error, 'No se pudo confirmar el registro.')}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={() =>
                  confirmarMutation.mutate({
                    id: selected.id,
                    payload: { confirmarUbicacion: true, confirmarNodo: true },
                  })
                }
                disabled={confirmarMutation.isPending}
              >
                {confirmarMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default DigitadorGeorefPage
