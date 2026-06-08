import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera,
  faCameraRetro,
  faCheckCircle,
  faClipboardList,
  faCloudArrowUp,
  faComments,
  faLocationDot,
  faScrewdriverWrench,
  faUserGear,
  faUsers
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Field from '../common/Field'
import ImageLightbox from '../common/ImageLightbox'
import { useAuth } from '../../context/AuthContext'
import {
  createSupervisionPendiente,
  fetchSupervisores,
  fetchTecnicosPorSupervisor,
  fetchSupervisionTiposPenalizacion,
  fetchSupervisionTiposSupervision,
  fetchSupervisionTiposTrabajo,
} from '../../api/supervisionApi'
import { fetchSucursales } from '../../services/authApi'
import { getApiErrorMessage } from '../../services/httpClient'

type SupervisionForm = {
  idSupervisorAsignado: string
  idTecnicoPrincipal: string
  idTecnicoAuxiliar: string
  idTipoSupervision: string
  idTipoTrabajo: string
  idTipoPenalizacion: string
  supervisionPor: string
  tecnologia: string
  codigo: string
  ordenTrabajo: string
  tipoRevision: string
  ubicacion: string
  observacion: string
  descripcionAdicionalObservacion: string
  fotoBoletaSupervision: string
  fotoCanalesPilos: string
  fotoNivelesDocsis: string
  fotoMedicionRuido: string
  fotoBarridoCanales: string
  fotoObservacion1: string
  fotoObservacion2: string
  fotoObservacion3: string
  fotoObservacion4: string
}

const emptyForm = (): SupervisionForm => ({
  idSupervisorAsignado: '',
  idTecnicoPrincipal: '',
  idTecnicoAuxiliar: '',
  idTipoSupervision: '',
  idTipoTrabajo: '',
  idTipoPenalizacion: '',
  supervisionPor: '',
  tecnologia: '',
  codigo: '',
  ordenTrabajo: '',
  tipoRevision: '',
  ubicacion: '',
  observacion: '',
  descripcionAdicionalObservacion: '',
  fotoBoletaSupervision: '',
  fotoCanalesPilos: '',
  fotoNivelesDocsis: '',
  fotoMedicionRuido: '',
  fotoBarridoCanales: '',
  fotoObservacion1: '',
  fotoObservacion2: '',
  fotoObservacion3: '',
  fotoObservacion4: '',
})

const photoFields: Array<{ key: keyof SupervisionForm; label: string }> = [
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

const cameraLikeFields: Array<keyof SupervisionForm> = ['fotoCanalesPilos', 'fotoObservacion1', 'fotoObservacion2', 'fotoObservacion3', 'fotoObservacion4']
const SUPERVISION_POR_OPTIONS = ['TIGO', 'MAKIRO'] as const
const TECNOLOGIA_OPTIONS = ['DTH', 'HFC'] as const
const TIPO_REVISION_OPTIONS = ['EXTERNA', 'INTERNA', 'Externa/Interna'] as const

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()

const resolveImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  if (raw.startsWith('C:/') || raw.startsWith('C:\\')) return null
  if (raw.includes('/') || raw.includes('\\')) return null
  return `data:image/jpeg;base64,${raw}`
}

const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

const normalizeOnlyDigits = (value: string): string => value.replace(/[^0-9]/g, '')

interface SupervisionPendienteModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const SupervisionPendienteModal = ({ open, onClose, onSuccess }: SupervisionPendienteModalProps) => {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SupervisionForm>(emptyForm)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [ubicacionResolviendo, setUbicacionResolviendo] = useState(false)
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null)
  const [tecnicoFilter, setTecnicoFilter] = useState('')

  const supervisoresQuery = useQuery({
    queryKey: ['backoffice', 'supervisores'],
    queryFn: fetchSupervisores,
    enabled: open,
    staleTime: 300_000,
  })


  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-backoffice-supervision'],
    queryFn: fetchSucursales,
    enabled: open,
    staleTime: 300_000,
  })

  const loginSucursal = (() => {
    const idSucursal = usuario?.idSucursal
    const sucursales = sucursalesQuery.data?.data ?? []
    if (!idSucursal || sucursales.length === 0) return undefined
    const found = sucursales.find((item) => Number(item.idSucursal) === Number(idSucursal))
    const sucursal = found?.sucursal?.trim()
    return sucursal || undefined
  })()

  const supervisores = supervisoresQuery.data ?? []
  const supervisorSeleccionado = supervisores.find((sup) => normalizeId(sup.idSupervisor) === normalizeId(form.idSupervisorAsignado))

  const tecnicosQuery = useQuery({
    queryKey: ['backoffice', 'tecnicos-supervisor', form.idSupervisorAsignado, supervisorSeleccionado?.nombre || '', loginSucursal || 'auto'],
    queryFn: () => fetchTecnicosPorSupervisor(form.idSupervisorAsignado, loginSucursal, supervisorSeleccionado?.nombre),
    enabled: open && !!form.idSupervisorAsignado,
    staleTime: 60_000,
  })

  const tiposSupervisionQuery = useQuery({
    queryKey: ['supervision', 'tipos-supervision'],
    queryFn: fetchSupervisionTiposSupervision,
    enabled: open,
    staleTime: 300_000,
  })

  const tiposTrabajoQuery = useQuery({
    queryKey: ['supervision', 'tipos-trabajo'],
    queryFn: fetchSupervisionTiposTrabajo,
    enabled: open,
    staleTime: 300_000,
  })

  const tiposPenalizacionQuery = useQuery({
    queryKey: ['supervision', 'tipos-penalizacion'],
    queryFn: fetchSupervisionTiposPenalizacion,
    enabled: open,
    staleTime: 300_000,
  })

  const createMutation = useMutation({
    mutationFn: createSupervisionPendiente,
    onSuccess: () => {
      setErrorForm(null)
      setForm(emptyForm())
      queryClient.invalidateQueries({ queryKey: ['supervision', 'pendientes-backoffice'] })
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado-pendientes'] })
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      setErrorForm(getApiErrorMessage(error, 'No se pudo registrar la supervision pendiente.'))
    },
  })

  const tecnicos = tecnicosQuery.data ?? []

  const tecnicoMap = useMemo(() => {
    const map = new Map<string, (typeof tecnicos)[number]>()
    for (const tecnico of tecnicos) {
      map.set(normalizeId(tecnico.idTecnico), tecnico)
    }
    return map
  }, [tecnicos])

  const tecnicosAuxiliar = useMemo(() => {
    const idPrincipal = normalizeId(form.idTecnicoPrincipal)
    if (!idPrincipal) return tecnicos
    const principal = tecnicoMap.get(idPrincipal)
    if (!principal) return tecnicos

    const grupoRef = (principal.grupo ?? '').trim().toLowerCase()
    const rutaRef = normalizeId(principal.idRuta)

    const filtered = tecnicos.filter((item) => {
      if (normalizeId(item.idTecnico) === idPrincipal) return false
      const sameGrupo = grupoRef && (item.grupo ?? '').trim().toLowerCase() === grupoRef
      const sameRuta = rutaRef && normalizeId(item.idRuta) === rutaRef
      return Boolean(sameGrupo || sameRuta)
    })

    return filtered.length ? filtered : tecnicos.filter((item) => normalizeId(item.idTecnico) !== idPrincipal)
  }, [form.idTecnicoPrincipal, tecnicoMap, tecnicos])

  const filterTecnicos = (items: typeof tecnicos) => {
    const query = tecnicoFilter.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const id = normalizeId(item.idTecnico).toLowerCase()
      const nombre = (item.tecnico ?? '').toLowerCase()
      return id.includes(query) || nombre.includes(query)
    })
  }

  const tecnicosPrincipalFiltrados = useMemo(() => filterTecnicos(tecnicos), [tecnicoFilter, tecnicos])
  const tecnicosAuxiliarFiltrados = useMemo(() => filterTecnicos(tecnicosAuxiliar), [tecnicoFilter, tecnicosAuxiliar])

  useEffect(() => {
    if (!form.idTecnicoAuxiliar) return
    const exists = tecnicosAuxiliar.some((item) => normalizeId(item.idTecnico) === normalizeId(form.idTecnicoAuxiliar))
    if (!exists) {
      setForm((prev) => ({ ...prev, idTecnicoAuxiliar: '' }))
    }
  }, [form.idTecnicoAuxiliar, tecnicosAuxiliar])

  const handlePhotoChange = async (field: keyof SupervisionForm, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await toDataUrl(file)
      setForm((prev) => ({ ...prev, [field]: dataUrl }))
    } catch {
      setErrorForm('Error al cargar la imagen.')
    }
  }

  const resolverUbicacionAltaPrecision = () => {
    if (!('geolocation' in navigator)) {
      setErrorForm('Geolocalizacion no disponible en este navegador.')
      return
    }
    setUbicacionResolviendo(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const ubicacion = `${latitude.toFixed(7)}, ${longitude.toFixed(7)} (+/- ${Math.round(accuracy)}m)`
        setForm((prev) => ({ ...prev, ubicacion }))
        setUbicacionResolviendo(false)
      },
      () => {
        setUbicacionResolviendo(false)
        setErrorForm('No se pudo obtener la ubicacion. Verifica los permisos.')
      },
      { enableHighAccuracy: true, timeout: 30000 }
    )
  }

  const handleSubmit = () => {
    const requiredFields: Array<keyof SupervisionForm> = [
      'idSupervisorAsignado',
      'idTecnicoPrincipal',
      'idTecnicoAuxiliar',
      'idTipoSupervision',
      'idTipoTrabajo',
      'idTipoPenalizacion',
      'supervisionPor',
      'tecnologia',
      'codigo',
      'ordenTrabajo',
      'tipoRevision',
    ]

    const missing = requiredFields.filter((field) => !form[field]?.trim())
    if (missing.length > 0) {
      setErrorForm(`Campos requeridos faltantes: ${missing.join(', ')}`)
      return
    }

    setErrorForm(null)
    createMutation.mutate(form)
  }

  const handleClose = () => {
    setForm(emptyForm())
    setErrorForm(null)
    setTecnicoFilter('')
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        title="Agendar Supervision Pendiente"
        onClose={handleClose}
        maxWidthClass="max-w-5xl"
        contentClassName="max-h-[calc(100vh-200px)]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faUsers} className="text-brand-600" />
              Asignacion
            </h4>
            <Field label="Supervisor Asignado (Obligatorio)">
              <select
                className="input-base"
                value={form.idSupervisorAsignado}
                onChange={(event) => {
                  const newSuperId = event.target.value
                  setForm((prev) => ({ 
                    ...prev, 
                    idSupervisorAsignado: newSuperId,
                    idTecnicoPrincipal: '',
                    idTecnicoAuxiliar: '',
                    codigo: ''
                  }))
                  setTecnicoFilter('')
                }}
              >
                <option value="">Selecciona supervisor</option>
                {supervisores.map((sup) => (
                  <option key={normalizeId(sup.idSupervisor)} value={normalizeId(sup.idSupervisor)}>
                    {sup.nombre || `Supervisor ${sup.idSupervisor}`}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faUserGear} className="text-brand-600" />
              Informacion del Tecnico
            </h4>
            {!form.idSupervisorAsignado && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Primero selecciona un supervisor para cargar sus técnicos
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Filtro rapido de tecnicos">
                <input
                  className="input-base"
                  type="text"
                  placeholder="Buscar por nombre o ID..."
                  value={tecnicoFilter}
                  onChange={(e) => setTecnicoFilter(e.target.value)}
                  disabled={!form.idSupervisorAsignado}
                />
              </Field>
              <div />
              <Field label="Tecnico Principal (Obligatorio)">
                <select
                  className="input-base"
                  value={form.idTecnicoPrincipal}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      idTecnicoPrincipal: event.target.value,
                      codigo: tecnicoMap.get(normalizeId(event.target.value))?.codigo
                        || tecnicoMap.get(normalizeId(event.target.value))?.codEmpleado
                        || '',
                      idTecnicoAuxiliar:
                        prev.idTecnicoAuxiliar && prev.idTecnicoAuxiliar === event.target.value
                          ? ''
                          : prev.idTecnicoAuxiliar,
                    }))
                  }
                  disabled={!form.idSupervisorAsignado || tecnicosQuery.isLoading}
                >
                  <option value="">
                    {!form.idSupervisorAsignado 
                      ? 'Selecciona supervisor primero' 
                      : tecnicosQuery.isLoading 
                      ? 'Cargando tecnicos...' 
                      : 'Selecciona tecnico'}
                  </option>
                  {tecnicosPrincipalFiltrados.map((tec) => (
                    <option key={tec.idTecnico} value={tec.idTecnico}>
                      {tec.tecnico}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tecnico Auxiliar (Obligatorio)">
                <select
                  className="input-base"
                  value={form.idTecnicoAuxiliar}
                  onChange={(event) => setForm((prev) => ({ ...prev, idTecnicoAuxiliar: event.target.value }))}
                  disabled={!form.idSupervisorAsignado || tecnicosQuery.isLoading}
                >
                  <option value="">
                    {!form.idSupervisorAsignado 
                      ? 'Selecciona supervisor primero' 
                      : tecnicosQuery.isLoading 
                      ? 'Cargando tecnicos...' 
                      : 'Selecciona tecnico'}
                  </option>
                  {tecnicosAuxiliarFiltrados.map((tec) => (
                    <option key={tec.idTecnico} value={tec.idTecnico}>
                      {tec.tecnico}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Codigo (Obligatorio)">
                <input
                  className="input-base"
                  value={form.codigo}
                  onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faClipboardList} className="text-brand-600" />
              Detalles de Supervision
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo Supervision (Obligatorio)">
                <select
                  className="input-base"
                  value={form.idTipoSupervision}
                  onChange={(event) => setForm((prev) => ({ ...prev, idTipoSupervision: event.target.value }))}
                >
                  <option value="">Selecciona tipo</option>
                  {(tiposSupervisionQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo Trabajo (Obligatorio)">
                <select
                  className="input-base"
                  value={form.idTipoTrabajo}
                  onChange={(event) => setForm((prev) => ({ ...prev, idTipoTrabajo: event.target.value }))}
                >
                  <option value="">Selecciona tipo</option>
                  {(tiposTrabajoQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo Penalizacion (Obligatorio)">
                <select
                  className="input-base"
                  value={form.idTipoPenalizacion}
                  onChange={(event) => setForm((prev) => ({ ...prev, idTipoPenalizacion: event.target.value }))}
                >
                  <option value="">Selecciona tipo</option>
                  {(tiposPenalizacionQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supervision Por (Obligatorio)">
                <select className="input-base" value={form.supervisionPor} onChange={(e) => setForm((p) => ({ ...p, supervisionPor: e.target.value }))}>
                  <option value="">Selecciona supervision</option>
                  {SUPERVISION_POR_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faScrewdriverWrench} className="text-brand-600" />
              Informacion de Obra
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tecnologia (Obligatorio)">
                <select className="input-base" value={form.tecnologia} onChange={(e) => setForm((p) => ({ ...p, tecnologia: e.target.value }))}>
                  <option value="">Selecciona tecnologia</option>
                  {TECNOLOGIA_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo Revision (Obligatorio)">
                <select className="input-base" value={form.tipoRevision} onChange={(e) => setForm((p) => ({ ...p, tipoRevision: e.target.value }))}>
                  <option value="">Selecciona tipo revision</option>
                  {TIPO_REVISION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Orden de Trabajo (Obligatorio)">
                <input
                  className="input-base"
                  value={form.ordenTrabajo}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={20}
                  onChange={(e) => setForm((p) => ({ ...p, ordenTrabajo: normalizeOnlyDigits(e.target.value) }))}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faLocationDot} className="text-brand-600" />
              Ubicacion
            </h4>
            <div className="space-y-3">
              <Field label="Coordenadas / direccion">
                <input className="input-base" value={form.ubicacion} onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))} />
              </Field>
              <Button type="button" variant="secondary" onClick={resolverUbicacionAltaPrecision} disabled={ubicacionResolviendo} className="w-full">
                {ubicacionResolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion exacta'}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faComments} className="text-brand-600" />
              Observaciones
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Observacion">
                <textarea className="input-base min-h-28" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
              </Field>
              <Field label="Descripcion adicional observacion">
                <textarea className="input-base min-h-28" value={form.descripcionAdicionalObservacion} onChange={(e) => setForm((p) => ({ ...p, descripcionAdicionalObservacion: e.target.value }))} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faCamera} className="text-brand-600" />
              Archivos y Fotos
            </h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photoFields.map((photo) => (
                <div key={photo.key} className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">{photo.label}</p>
                  {resolveImageSrc(form[photo.key]) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <img
                        src={resolveImageSrc(form[photo.key]) ?? ''}
                        alt={photo.label}
                        className="h-32 w-full cursor-zoom-in rounded-lg border border-slate-200 object-cover"
                        onClick={() => setZoomImageSrc(resolveImageSrc(form[photo.key]) ?? null)}
                      />
                      <input className="mt-3 input-base text-xs" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
                    </div>
                  ) : (
                    <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-2 py-4 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
                      <input className="hidden" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
                      <FontAwesomeIcon icon={cameraLikeFields.includes(photo.key) ? faCameraRetro : faCloudArrowUp} className="mb-2 text-xl text-slate-500" />
                      <p className="text-xs font-semibold text-slate-700">
                        {cameraLikeFields.includes(photo.key) ? 'Tomar foto' : 'Subir'}
                      </p>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {errorForm ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorForm}</div> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
            <FontAwesomeIcon icon={faCheckCircle} />
            {createMutation.isPending ? 'Creando...' : 'Agendar Supervision'}
          </Button>
        </div>
      </Modal>

      {zoomImageSrc && <ImageLightbox open={Boolean(zoomImageSrc)} src={zoomImageSrc} alt="Imagen ampliada" onClose={() => setZoomImageSrc(null)} />}
    </>
  )
}

export default SupervisionPendienteModal
