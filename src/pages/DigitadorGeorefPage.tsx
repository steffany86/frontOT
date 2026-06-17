import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { confirmarDigitadorGeorefDistancia, fetchDigitadorGeorefDistancias, type DigitadorGeorefRow } from '../api/digitadorGeorefApi'
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

const formatCoordinateSummary = (value: number | null): string => {
  if (value === null) return '-'
  return formatCoordinate(value).replace(/[,.]/g, '')
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

  const query = useQuery({
    queryKey: ['digitador-georef-distancias', fecha],
    queryFn: () => fetchDigitadorGeorefDistancias(fecha),
    enabled: Boolean(fecha),
  })

  const confirmarMutation = useMutation({
    mutationFn: confirmarDigitadorGeorefDistancia,
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['digitador-georef-distancias'] })
    },
  })

  const rows = useMemo(() => query.data ?? [], [query.data])
  const pendientes = useMemo(() => rows.filter((row) => asText(row, ['Actualizado']) !== '1'), [rows])
  const confirmados = useMemo(() => rows.filter((row) => asText(row, ['Actualizado']) === '1'), [rows])
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 md:hidden">
          {visibleRows.map((row, index) => {
            const selection = buildSelection(row)
            const id = selection?.id ?? index
            const actualizado = asText(row, ['Actualizado'])
            const latTecnico = asCoordinate(row, ['Latitud_V', 'Latitud'])
            const lonTecnico = asCoordinate(row, ['Longitud_V', 'Longitud'])
            return (
              <article key={id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500">Cliente</p>
                    <p className="break-words text-base font-bold text-slate-900">{asText(row, ['cliente_nro']) || '-'}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      actualizado === '1' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {actualizado === '1' ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">OT</p>
                    <p className="font-medium text-slate-900">{asText(row, ['OT']) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">TOR</p>
                    <p className="font-medium text-slate-900">{asText(row, ['TOR']) || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Tecnico</p>
                    <p className="break-words font-medium text-slate-900">{asText(row, ['tecnico_nombre', 'TECNICO']) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Distancia</p>
                    <p className="font-semibold text-rose-600">{formatMeters(asNumber(row, ['DistanciaMetros']))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Estado</p>
                    <p className="font-medium text-slate-900">{asText(row, ['estado']) || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500">Lat tecnico</p>
                    <p className="break-all font-mono text-xs font-semibold text-slate-900">{formatCoordinateSummary(latTecnico)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500">Long tecnico</p>
                    <p className="break-all font-mono text-xs font-semibold text-slate-900">{formatCoordinateSummary(lonTecnico)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => selection && setSelected(selection)} disabled={!selection}>
                    Ver detalle
                  </Button>
                  <Button
                    type="button"
                    onClick={() => selection && confirmarMutation.mutate(selection.id)}
                    disabled={!selection || actualizado === '1' || confirmarMutation.isPending}
                  >
                    Confirmar
                  </Button>
                </div>
              </article>
            )
          })}
          {!query.isLoading && visibleRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Sin registros {tab === 'pendientes' ? 'pendientes' : 'confirmados'} para la fecha seleccionada.
            </div>
          ) : null}
          {query.isLoading ? <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando registros...</div> : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 shadow-sm">
              <tr>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">OT</th>
                <th className="px-3 py-3">TOR</th>
                <th className="px-3 py-3">Tecnico</th>
                <th className="px-3 py-3">Lat tecnico</th>
                <th className="px-3 py-3">Long tecnico</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Distancia</th>
                <th className="px-3 py-3">Actualizado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row, index) => {
                const selection = buildSelection(row)
                const id = selection?.id ?? index
                const actualizado = asText(row, ['Actualizado'])
                const latTecnico = asCoordinate(row, ['Latitud_V', 'Latitud'])
                const lonTecnico = asCoordinate(row, ['Longitud_V', 'Longitud'])
                return (
                  <tr key={id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-semibold text-slate-900">{asText(row, ['cliente_nro']) || '-'}</td>
                    <td className="px-3 py-3">{asText(row, ['OT']) || '-'}</td>
                    <td className="px-3 py-3">{asText(row, ['TOR']) || '-'}</td>
                    <td className="px-3 py-3">{asText(row, ['tecnico_nombre', 'TECNICO']) || '-'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatCoordinateSummary(latTecnico)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatCoordinateSummary(lonTecnico)}</td>
                    <td className="px-3 py-3">{asText(row, ['estado']) || '-'}</td>
                    <td className="px-3 py-3 font-semibold text-rose-600">{formatMeters(asNumber(row, ['DistanciaMetros']))}</td>
                    <td className="px-3 py-3">{actualizado || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => selection && setSelected(selection)} disabled={!selection}>
                          Ver detalle
                        </Button>
                        <Button
                          type="button"
                          onClick={() => selection && confirmarMutation.mutate(selection.id)}
                          disabled={!selection || actualizado === '1' || confirmarMutation.isPending}
                        >
                          Confirmar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!query.isLoading && visibleRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>
                    Sin registros {tab === 'pendientes' ? 'pendientes' : 'confirmados'} para la fecha seleccionada.
                  </td>
                </tr>
              ) : null}
              {query.isLoading ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>
                    Cargando registros...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
                <p className="font-semibold text-slate-900">{asText(selected.row, ['tecnico_nombre', 'TECNICO']) || '-'}</p>
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
            {confirmarMutation.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {getApiErrorMessage(confirmarMutation.error, 'No se pudo confirmar el registro.')}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button type="button" onClick={() => confirmarMutation.mutate(selected.id)} disabled={confirmarMutation.isPending}>
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
