import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faClipboardList,
  faComments,
  faScrewdriverWrench,
  faUserGear,
  faUsers
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Field from '../common/Field'
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

// Ubicacion, observacion y las fotos las completa el supervisor al realizar la
// supervision agendada (SupervisorSupervisionPage), no el digitador al agendarla.
// El digitador solo llena "descripcionAdicionalObservacion". ubicacion queda como
// string vacio en el formulario porque el payload que espera el backend lo sigue
// requiriendo, pero no se le pide al digitador.
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
  descripcionAdicionalObservacion: string
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
  descripcionAdicionalObservacion: '',
})

const SUPERVISION_POR_OPTIONS = ['TIGO', 'MAKIRO'] as const
const TECNOLOGIA_OPTIONS = ['DTH', 'HFC'] as const
const TIPO_REVISION_OPTIONS = ['EXTERNA', 'INTERNA', 'Externa/Interna'] as const

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()
const normalizeUpperText = (value: string): string => value.trimStart().toUpperCase()

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
  const [intentoRegistrar, setIntentoRegistrar] = useState(false)
  const fieldRefs = useRef<Partial<Record<keyof SupervisionForm, HTMLDivElement | null>>>({})
  const registerFieldRef = (field: keyof SupervisionForm) => (el: HTMLDivElement | null) => {
    fieldRefs.current[field] = el
  }

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

  const supervisoresQuery = useQuery({
    queryKey: ['backoffice', 'supervisores', loginSucursal || 'auto'],
    queryFn: () => fetchSupervisores(loginSucursal),
    enabled: open && (!usuario?.idSucursal || !!loginSucursal),
    staleTime: 300_000,
  })

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
      setIntentoRegistrar(false)
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

  const requiredFields: Array<keyof SupervisionForm> = [
    'idSupervisorAsignado',
    'idTecnicoPrincipal',
    'idTipoSupervision',
    'idTipoTrabajo',
    'idTipoPenalizacion',
    'supervisionPor',
    'tecnologia',
    'codigo',
    'ordenTrabajo',
    'tipoRevision',
  ]

  const isMissing = (field: keyof SupervisionForm): boolean => intentoRegistrar && !form[field]?.trim()

  const fieldVisualOrder: Array<keyof SupervisionForm> = [
    'idSupervisorAsignado',
    'idTecnicoPrincipal',
    'codigo',
    'idTipoSupervision',
    'idTipoTrabajo',
    'idTipoPenalizacion',
    'supervisionPor',
    'tecnologia',
    'tipoRevision',
    'ordenTrabajo',
  ]

  const handleSubmit = () => {
    setIntentoRegistrar(true)
    const missing = requiredFields.filter((field) => !form[field]?.trim())
    if (missing.length > 0) {
      setErrorForm('Faltan campos obligatorios por llenar, revisa los campos marcados en rojo.')
      const primerCampoConError = fieldVisualOrder.find((field) => missing.includes(field))
      const el = primerCampoConError ? fieldRefs.current[primerCampoConError] : null
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setErrorForm(null)
    createMutation.mutate({
      ...form,
      idTecnicoAuxiliar: form.idTecnicoAuxiliar.trim().toUpperCase(),
    })
  }

  const handleClose = () => {
    setForm(emptyForm())
    setErrorForm(null)
    setIntentoRegistrar(false)
    onClose()
  }

  return (
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
            <div ref={registerFieldRef('idSupervisorAsignado')}>
            <Field label="Supervisor Asignado (Obligatorio)" error={isMissing('idSupervisorAsignado') ? 'Campo obligatorio' : undefined}>
              <select
                className={`input-base ${isMissing('idSupervisorAsignado') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                value={form.idSupervisorAsignado}
                onChange={(event) => {
                  const newSuperId = event.target.value
                  setForm((prev) => ({
                    ...prev,
                    idSupervisorAsignado: newSuperId,
                    idTecnicoPrincipal: '',
                    idTecnicoAuxiliar: '',
                  }))
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
            </div>
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
              <div ref={registerFieldRef('idTecnicoPrincipal')}>
              <Field label="Tecnico Principal (Obligatorio)" error={isMissing('idTecnicoPrincipal') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('idTecnicoPrincipal') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  value={form.idTecnicoPrincipal}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      idTecnicoPrincipal: event.target.value,
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
                  {tecnicos.map((tec) => (
                    <option key={tec.idTecnico} value={tec.idTecnico}>
                      {tec.tecnico}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
              <Field label="Tecnico auxiliar">
                <input
                  className="input-base"
                  type="text"
                  placeholder="Escribe el nombre del auxiliar"
                  value={form.idTecnicoAuxiliar}
                  maxLength={150}
                  onChange={(event) => setForm((prev) => ({ ...prev, idTecnicoAuxiliar: normalizeUpperText(event.target.value) }))}
                />
              </Field>
              <div ref={registerFieldRef('codigo')}>
              <Field label="Codigo cliente (Obligatorio)" error={isMissing('codigo') ? 'Campo obligatorio' : undefined}>
                <input
                  className={`input-base ${isMissing('codigo') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  inputMode="numeric"
                  value={form.codigo}
                  onChange={(e) => setForm((p) => ({ ...p, codigo: normalizeOnlyDigits(e.target.value) }))}
                />
              </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faClipboardList} className="text-brand-600" />
              Detalles de Supervision
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div ref={registerFieldRef('idTipoSupervision')}>
              <Field label="Tipo Supervision (Obligatorio)" error={isMissing('idTipoSupervision') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('idTipoSupervision') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
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
              </div>
              <div ref={registerFieldRef('idTipoTrabajo')}>
              <Field label="Tipo Trabajo (Obligatorio)" error={isMissing('idTipoTrabajo') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('idTipoTrabajo') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
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
              </div>
              <div ref={registerFieldRef('idTipoPenalizacion')}>
              <Field label="Tipo Penalizacion (Obligatorio)" error={isMissing('idTipoPenalizacion') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('idTipoPenalizacion') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
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
              </div>
              <div ref={registerFieldRef('supervisionPor')}>
              <Field label="Supervision Por (Obligatorio)" error={isMissing('supervisionPor') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('supervisionPor') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  value={form.supervisionPor}
                  onChange={(e) => setForm((p) => ({ ...p, supervisionPor: e.target.value }))}
                >
                  <option value="">Selecciona supervision</option>
                  {SUPERVISION_POR_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faScrewdriverWrench} className="text-brand-600" />
              Informacion de Obra
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div ref={registerFieldRef('tecnologia')}>
              <Field label="Tecnologia (Obligatorio)" error={isMissing('tecnologia') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('tecnologia') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  value={form.tecnologia}
                  onChange={(e) => setForm((p) => ({ ...p, tecnologia: e.target.value }))}
                >
                  <option value="">Selecciona tecnologia</option>
                  {TECNOLOGIA_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
              <div ref={registerFieldRef('tipoRevision')}>
              <Field label="Tipo Revision (Obligatorio)" error={isMissing('tipoRevision') ? 'Campo obligatorio' : undefined}>
                <select
                  className={`input-base ${isMissing('tipoRevision') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  value={form.tipoRevision}
                  onChange={(e) => setForm((p) => ({ ...p, tipoRevision: e.target.value }))}
                >
                  <option value="">Selecciona tipo revision</option>
                  {TIPO_REVISION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
              <div ref={registerFieldRef('ordenTrabajo')}>
              <Field label="Orden de Trabajo (Obligatorio)" error={isMissing('ordenTrabajo') ? 'Campo obligatorio' : undefined}>
                <input
                  className={`input-base ${isMissing('ordenTrabajo') ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                  value={form.ordenTrabajo}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={20}
                  onChange={(e) => setForm((p) => ({ ...p, ordenTrabajo: normalizeOnlyDigits(e.target.value) }))}
                />
              </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800">
              <FontAwesomeIcon icon={faComments} className="text-brand-600" />
              Observaciones
            </h4>
            <div className="grid gap-4">
              <Field label="Descripcion adicional observacion">
                <textarea className="input-base min-h-28" value={form.descripcionAdicionalObservacion} onChange={(e) => setForm((p) => ({ ...p, descripcionAdicionalObservacion: e.target.value }))} />
              </Field>
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
  )
}

export default SupervisionPendienteModal
