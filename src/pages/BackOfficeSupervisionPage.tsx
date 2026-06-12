import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faClipboardCheck,
  faCircleCheck,
  faCircleInfo,
  faCalendarDay,
  faUserGear,
  faClipboardList,
  faLocationDot,
  faComments,
  faCamera,
} from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import SupervisionPendienteModal from '../components/supervision/SupervisionPendienteModal'
import {
  fetchBackofficeSupervisionesPorEstado,
  fetchSupervisores,
  fetchTecnicosPorSupervisor,
  fetchSupervisionTiposPenalizacion,
  fetchSupervisionTiposSupervision,
  fetchSupervisionTiposTrabajo,
} from '../api/supervisionApi'
import { getApiErrorMessage } from '../services/httpClient'
import type { SupervisionRegistro } from '../types/supervision'

type SupervisionTab = 'pendiente' | 'completado'
type PhotoKey =
  | 'fotoBoletaSupervision'
  | 'fotoCanalesPilos'
  | 'fotoNivelesDocsis'
  | 'fotoMedicionRuido'
  | 'fotoBarridoCanales'
  | 'fotoObservacion1'
  | 'fotoObservacion2'
  | 'fotoObservacion3'
  | 'fotoObservacion4'

const photoFields: Array<{ key: PhotoKey; label: string }> = [
  { key: 'fotoBoletaSupervision', label: 'Foto Boleta Supervision' },
  { key: 'fotoCanalesPilos', label: 'Foto Canales Pilos' },
  { key: 'fotoNivelesDocsis', label: 'Foto Niveles Docsis' },
  { key: 'fotoMedicionRuido', label: 'Foto Medicion Ruido' },
  { key: 'fotoBarridoCanales', label: 'Foto Barrido Canales' },
  { key: 'fotoObservacion1', label: 'Foto Observacion 1' },
  { key: 'fotoObservacion2', label: 'Foto Observacion 2' },
  { key: 'fotoObservacion3', label: 'Foto Observacion 3' },
  { key: 'fotoObservacion4', label: 'Foto Observacion 4' },
]

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()

const formatLocalDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const parseGeoCoords = (value?: string): { lat: number; lng: number } | null => {
  const raw = value?.trim()
  if (!raw) return null
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

const resolveImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  if (raw.startsWith('C:/') || raw.startsWith('C:\\')) return null
  if (raw.includes('/') || raw.includes('\\')) return null
  return `data:image/jpeg;base64,${raw}`
}

const BackOfficeSupervisionPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SupervisionTab>('pendiente')
  const [fechaFiltro, setFechaFiltro] = useState(() => formatLocalDateInput(new Date()))
  const [detalle, setDetalle] = useState<SupervisionRegistro | null>(null)

  const listParams = {
    fechaDesde: fechaFiltro,
    fechaHasta: fechaFiltro,
    limite: 300,
  }

  const pendientesQuery = useQuery({
    queryKey: ['supervision', 'pendientes-backoffice', fechaFiltro],
    queryFn: () => fetchBackofficeSupervisionesPorEstado('pendiente', listParams),
  })

  const completadasQuery = useQuery({
    queryKey: ['supervision', 'completadas-backoffice', fechaFiltro],
    queryFn: () => fetchBackofficeSupervisionesPorEstado('completado', listParams),
  })

  const supervisoresQuery = useQuery({
    queryKey: ['backoffice', 'supervisores'],
    queryFn: fetchSupervisores,
    staleTime: 300_000,
  })

  const tiposSupervisionQuery = useQuery({
    queryKey: ['supervision', 'tipos-supervision'],
    queryFn: fetchSupervisionTiposSupervision,
    staleTime: 300_000,
  })

  const tiposTrabajoQuery = useQuery({
    queryKey: ['supervision', 'tipos-trabajo'],
    queryFn: fetchSupervisionTiposTrabajo,
    staleTime: 300_000,
  })

  const tiposPenalizacionQuery = useQuery({
    queryKey: ['supervision', 'tipos-penalizacion'],
    queryFn: fetchSupervisionTiposPenalizacion,
    staleTime: 300_000,
  })

  const supervisorDetalle = useMemo(() => {
    if (!detalle?.idSupervisor) return undefined
    return (supervisoresQuery.data ?? []).find((item) => normalizeId(item.idSupervisor) === normalizeId(detalle.idSupervisor))
  }, [detalle?.idSupervisor, supervisoresQuery.data])

  const tecnicosDetalleQuery = useQuery({
    queryKey: ['backoffice', 'tecnicos-supervisor-detalle', detalle?.idSupervisor || '', supervisorDetalle?.nombre || ''],
    queryFn: () => fetchTecnicosPorSupervisor(detalle?.idSupervisor || '', undefined, supervisorDetalle?.nombre),
    enabled: Boolean(detalle?.idSupervisor),
    staleTime: 300_000,
  })

  const pendientes = pendientesQuery.data ?? []
  const completadas = completadasQuery.data ?? []
  const activeQuery = activeTab === 'pendiente' ? pendientesQuery : completadasQuery
  const activeItems = activeTab === 'pendiente' ? pendientes : completadas
  const supervisorIdsVisibles = useMemo(() => {
    const ids = new Set<string>()
    for (const row of [...pendientes, ...completadas]) {
      const id = normalizeId(row.idSupervisor || row.supervisor)
      if (id) ids.add(id)
    }
    return Array.from(ids)
  }, [pendientes, completadas])

  const tecnicosVisiblesQueries = useQueries({
    queries: supervisorIdsVisibles.map((idSupervisor) => {
      const supervisorNombre = (supervisoresQuery.data ?? []).find((item) => normalizeId(item.idSupervisor) === idSupervisor)?.nombre
      return {
        queryKey: ['backoffice', 'tecnicos-supervisor-resumen', idSupervisor, supervisorNombre || ''],
        queryFn: () => fetchTecnicosPorSupervisor(idSupervisor, undefined, supervisorNombre),
        enabled: Boolean(idSupervisor),
        staleTime: 300_000,
      }
    }),
  })
  const activeCopy = activeTab === 'pendiente'
    ? {
        title: 'Supervisiones Pendientes Agendadas',
        description: `Total: ${pendientes.length} supervisiones pendientes`,
        emptyTitle: 'No hay supervisiones pendientes agendadas',
        emptyHelp: 'Haz clic en "Agendar Supervision" para crear una nueva',
        loading: 'Cargando pendientes...',
        error: 'No se pudo cargar las supervisiones pendientes.',
        badge: 'PENDIENTE',
        badgeClass: 'bg-amber-100 text-amber-700',
        shellClass: 'border-amber-200 bg-amber-50/60',
        iconClass: 'text-amber-300',
      }
    : {
        title: 'Supervisiones Completadas',
        description: `Total: ${completadas.length} supervisiones completadas`,
        emptyTitle: 'No hay supervisiones completadas',
        emptyHelp: 'Cuando una supervision se complete aparecera en esta lista',
        loading: 'Cargando completadas...',
        error: 'No se pudo cargar las supervisiones completadas.',
        badge: 'COMPLETADA',
        badgeClass: 'bg-emerald-100 text-emerald-700',
        shellClass: 'border-emerald-200 bg-emerald-50/50',
        iconClass: 'text-emerald-300',
      }

  const tipoSupervisionMap = useMemo(
    () => new Map<string, string>((tiposSupervisionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposSupervisionQuery.data]
  )
  const tipoTrabajoMap = useMemo(
    () => new Map<string, string>((tiposTrabajoQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposTrabajoQuery.data]
  )
  const tipoPenalizacionMap = useMemo(
    () => new Map<string, string>((tiposPenalizacionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposPenalizacionQuery.data]
  )
  const tecnicoMap = useMemo(
    () => {
      const map = new Map<string, string>()
      for (const query of tecnicosVisiblesQueries) {
        for (const item of query.data ?? []) {
          map.set(normalizeId(item.idTecnico), item.tecnico)
        }
      }
      for (const item of tecnicosDetalleQuery.data ?? []) {
        map.set(normalizeId(item.idTecnico), item.tecnico)
      }
      return map
    },
    [tecnicosDetalleQuery.data, tecnicosVisiblesQueries]
  )

  const resolveSupervisor = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idSupervisor || row.supervisor)
    const byCatalog = id ? (supervisoresQuery.data ?? []).find((item) => normalizeId(item.idSupervisor) === id)?.nombre : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.supervisor?.trim() && row.supervisor.trim() !== id) return row.supervisor.trim()
    return id || '-'
  }

  const resolveTecnicoPrincipal = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTecnicoPrincipal || row.tecnicoPrincipal)
    const byCatalog = id ? tecnicoMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tecnicoPrincipal?.trim() && row.tecnicoPrincipal.trim() !== id) return row.tecnicoPrincipal.trim()
    return id || '-'
  }

  const resolveTecnicoAuxiliar = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTecnicoAuxiliar || row.tecnicoAuxiliar)
    const byCatalog = id ? tecnicoMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tecnicoAuxiliar?.trim() && row.tecnicoAuxiliar.trim() !== id) return row.tecnicoAuxiliar.trim()
    return id || '-'
  }

  const resolveTipoSupervision = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoSupervision || row.tipoSupervision)
    const byCatalog = id ? tipoSupervisionMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoSupervision?.trim() && row.tipoSupervision.trim() !== id) return row.tipoSupervision.trim()
    return id || '-'
  }

  const resolveTipoTrabajo = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoTrabajo || row.tipoTrabajo)
    const byCatalog = id ? tipoTrabajoMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoTrabajo?.trim() && row.tipoTrabajo.trim() !== id) return row.tipoTrabajo.trim()
    return id || '-'
  }

  const resolveTipoPenalizacion = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoPenalizacion || row.tipoPenalizacion)
    const byCatalog = id ? tipoPenalizacionMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoPenalizacion?.trim() && row.tipoPenalizacion.trim() !== id) return row.tipoPenalizacion.trim()
    return id || '-'
  }

  const renderSupervisionCard = (sup: SupervisionRegistro) => (
    <div key={sup.idSupervision} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">ID Supervision</p>
          <p className="text-sm font-bold text-slate-900">{sup.idSupervision}</p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${activeCopy.badgeClass}`}>
          {activeCopy.badge}
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium text-slate-500">Supervisor:</span>{' '}
          <span className="text-slate-700">{resolveSupervisor(sup)}</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">Tecnico:</span>{' '}
          <span className="text-slate-700">{resolveTecnicoPrincipal(sup)}</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">Orden Trabajo:</span>{' '}
          <span className="text-slate-700">{sup.ordenTrabajo || '-'}</span>
        </div>
        {sup.fechaRegistro && (
          <div>
            <span className="font-medium text-slate-500">Fecha:</span>{' '}
            <span className="text-slate-700">{formatDateTime(sup.fechaRegistro)}</span>
          </div>
        )}
      </div>
      <Button type="button" variant="secondary" className="mt-4 w-full justify-center" onClick={() => setDetalle(sup)}>
        <FontAwesomeIcon icon={faCircleInfo} />
        Info
      </Button>
    </div>
  )

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Supervisiones Pendientes</h2>
          <p className="text-sm text-slate-500">Gestiona las supervisiones agendadas para supervisores.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <FontAwesomeIcon icon={faPlus} />
          Agendar Supervision
        </Button>
      </div>

      <FormCard
        title={activeCopy.title}
        description={`${activeCopy.description} del ${fechaFiltro}`}
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <FontAwesomeIcon icon={faCalendarDay} className="text-brand-600" />
              <input
                type="date"
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
                value={fechaFiltro}
                onChange={(event) => setFechaFiltro(event.target.value || formatLocalDateInput(new Date()))}
              />
            </label>
            <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
              <button
                type="button"
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition sm:min-w-[150px] ${
                  activeTab === 'pendiente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab('pendiente')}
              >
                <FontAwesomeIcon icon={faClipboardCheck} />
                <span>Pendientes</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{pendientes.length}</span>
              </button>
              <button
                type="button"
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition sm:min-w-[150px] ${
                  activeTab === 'completado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab('completado')}
              >
                <FontAwesomeIcon icon={faCircleCheck} />
                <span>Completadas</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{completadas.length}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className={`rounded-2xl border p-4 ${activeCopy.shellClass}`}>
          {activeQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getApiErrorMessage(activeQuery.error, activeCopy.error)}
            </div>
          ) : activeQuery.isLoading ? (
            <p className="text-sm text-slate-600">{activeCopy.loading}</p>
          ) : activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FontAwesomeIcon icon={activeTab === 'pendiente' ? faClipboardCheck : faCircleCheck} className={`mb-3 text-4xl ${activeCopy.iconClass}`} />
              <p className="text-sm font-medium text-slate-700">{activeCopy.emptyTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{activeCopy.emptyHelp}</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeItems.map(renderSupervisionCard)}
            </div>
          )}
        </div>
      </FormCard>

      <SupervisionPendienteModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          pendientesQuery.refetch()
          completadasQuery.refetch()
        }}
      />

      <Modal
        open={Boolean(detalle)}
        title="Detalle de supervision"
        onClose={() => setDetalle(null)}
        maxWidthClass="max-w-6xl"
        actions={
          <Button type="button" variant="secondary" onClick={() => setDetalle(null)}>
            Cerrar
          </Button>
        }
      >
        {detalle ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faUserGear} className="text-blue-700" />
                  Informacion General
                </h4>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'Fecha', value: formatDateTime(detalle.fechaRegistro) },
                    { label: 'Supervisor', value: resolveSupervisor(detalle) },
                    { label: 'Tecnico principal', value: resolveTecnicoPrincipal(detalle) },
                    { label: 'Tecnico auxiliar', value: resolveTecnicoAuxiliar(detalle) },
                    { label: 'Tipo supervision', value: resolveTipoSupervision(detalle) },
                    { label: 'Tipo trabajo', value: resolveTipoTrabajo(detalle) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-slate-500">{item.label}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-700">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faClipboardList} className="text-blue-700" />
                  Referencias
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Orden de trabajo:</span> <span className="font-semibold text-slate-700">{detalle.ordenTrabajo || '-'}</span></p>
                  <p><span className="text-slate-500">Codigo:</span> <span className="font-semibold text-slate-700">{detalle.codigo || '-'}</span></p>
                  <p><span className="text-slate-500">Tecnologia:</span> <span className="font-semibold text-slate-700">{detalle.tecnologia || '-'}</span></p>
                  <p><span className="text-slate-500">Tipo revision:</span> <span className="font-semibold text-slate-700">{detalle.tipoRevision || '-'}</span></p>
                  <p><span className="text-slate-500">Supervision por:</span> <span className="font-semibold text-slate-700">{detalle.supervisionPor || '-'}</span></p>
                  <p><span className="text-slate-500">Penalizacion:</span> <span className="font-semibold text-slate-700">{resolveTipoPenalizacion(detalle)}</span></p>
                </div>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faLocationDot} className="text-blue-700" />
                  Ubicacion del Servicio
                </h4>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{detalle.ubicacion || '-'}</div>
                {(() => {
                  const coords = parseGeoCoords(detalle.ubicacion)
                  if (!coords) return null
                  const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                  return (
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir en Google Maps
                    </Button>
                  )
                })()}
              </section>

              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faComments} className="text-rose-600" />
                  Observaciones y Comentarios
                </h4>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Observacion principal</p>
                    <p className="mt-1 break-words text-sm text-slate-700">{detalle.observacion || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Descripcion adicional</p>
                    <p className="mt-1 break-words text-sm text-slate-700">{detalle.descripcionAdicionalObservacion || '-'}</p>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FontAwesomeIcon icon={faCamera} className="text-blue-700" />
                  Galeria de Evidencias
                </h4>
                <span className="text-xs text-slate-500">
                  {photoFields.filter((photo) => resolveImageSrc(detalle[photo.key])).length} fotos registradas
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {photoFields.map((photo) => {
                  const src = resolveImageSrc(detalle[photo.key])
                  return (
                    <div key={photo.key} className="rounded-xl border border-slate-200 bg-white p-2">
                      {src ? (
                        <img src={src} alt={photo.label} className="h-28 w-full rounded-lg border border-slate-200 object-cover" />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">Sin imagen</div>
                      )}
                      <p className="mt-2 truncate text-[11px] text-slate-500">{photo.label}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default BackOfficeSupervisionPage
