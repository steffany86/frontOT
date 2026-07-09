import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBriefcaseMedical, faClipboardList, faFileSignature, faHashtag, faLocationCrosshairs, faPersonFalling, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import Button from '../common/Button'
import Field from '../common/Field'
import Modal from '../common/Modal'
import { cerrarJornada } from '../../api/inicioJornadaApi'
import { getApiErrorMessage } from '../../services/httpClient'

type SiNo = 'SI' | 'NO'

type CierreJornadaFormProps = {
  idInicio?: number
  supervisorPendiente?: string
  submitLabel?: string
  onClosed?: () => void
}

const fieldIconClass = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700'
const choiceCardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'

const declaracionJuradaCierreJornada = [
  'Bajo juramento declaro que la informacion consignada en este cierre de jornada corresponde fielmente a las actividades realizadas. Confirmo que no he omitido informacion relacionada con accidentes, incidentes, danos materiales, lesiones, condiciones inseguras o participacion de personal no autorizado.',
  'Asimismo, reconozco que cualquier falsedad u omision en esta declaracion podra dar lugar a sanciones disciplinarias, contractuales, civiles y/o penales, siendo de mi exclusiva responsabilidad la veracidad de la informacion registrada.',
]

const getApiErrorCode = (error: unknown): string => {
  const candidate = error as { response?: { data?: { code?: unknown } } }
  return typeof candidate.response?.data?.code === 'string' ? candidate.response.data.code : ''
}

const CierreJornadaForm = ({ idInicio, supervisorPendiente, submitLabel = 'Registrar cierre', onClosed }: CierreJornadaFormProps) => {
  const queryClient = useQueryClient()
  const [codigoCliente, setCodigoCliente] = useState('')
  const [danoMaterial, setDanoMaterial] = useState<SiNo>('NO')
  const [observacionMaterial, setObservacionMaterial] = useState('')
  const [danoPersona, setDanoPersona] = useState<SiNo>('NO')
  const [observacionPersona, setObservacionPersona] = useState('')
  const [novedadesTrabajo, setNovedadesTrabajo] = useState<SiNo>('NO')
  const [observacionNovedades, setObservacionNovedades] = useState('')
  const [ubicacionGeoRef, setUbicacionGeoRef] = useState('')
  const [declaracionAceptada, setDeclaracionAceptada] = useState(false)
  const [ubicacionResolviendo, setUbicacionResolviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intentoRegistrar, setIntentoRegistrar] = useState(false)
  const [supervisorConfirmacionModalOpen, setSupervisorConfirmacionModalOpen] = useState(false)

  const normalizeOnlyDigits = (value: string): string => value.replace(/\D+/g, '')
  const mostrarErrorDeclaracion = intentoRegistrar && !declaracionAceptada
  const supervisorPendienteLabel = (supervisorPendiente?.trim() || '-').toUpperCase()

  const cierreMutation = useMutation({
    mutationFn: () =>
      cerrarJornada({
        idInicio,
        codigoCliente: normalizeOnlyDigits(codigoCliente),
        danoMaterial,
        observacionMaterial: danoMaterial === 'SI' ? observacionMaterial : undefined,
        danoPersona,
        observacionPersona: danoPersona === 'SI' ? observacionPersona : undefined,
        novedadesTrabajo,
        observacionNovedades: novedadesTrabajo === 'SI' ? observacionNovedades : undefined,
        ubicacionGeoRef,
        aceptoCierreJornada: declaracionAceptada ? 'SI' : 'NO',
      }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['tecnico-inicio-jornada'] })
      onClosed?.()
    },
    onError: (err) => {
      if (getApiErrorCode(err) === 'CIERRE_PENDIENTE_APROBACION_SUPERVISOR') {
        setError(null)
        setSupervisorConfirmacionModalOpen(true)
        return
      }
      setError(getApiErrorMessage(err, 'No se pudo registrar cierre de jornada.'))
    },
  })

  const resolverUbicacionAltaPrecision = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion.')
      return
    }
    setUbicacionResolviendo(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const acc = position.coords.accuracy
        setUbicacionGeoRef(`${lat.toFixed(7)},${lng.toFixed(7)} (+-${Math.round(acc)}m)`)
        setUbicacionResolviendo(false)
      },
      (geoError) => {
        const msg = geoError.code === 1
          ? 'Permiso de ubicacion denegado.'
          : geoError.code === 2
            ? 'No se pudo determinar tu ubicacion.'
            : 'Tiempo de espera agotado al obtener ubicacion.'
        setError(msg)
        setUbicacionResolviendo(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleSubmit = () => {
    setIntentoRegistrar(true)
    const codigoSoloNumeros = normalizeOnlyDigits(codigoCliente)
    if (!codigoSoloNumeros || !ubicacionGeoRef.trim()) {
      setError('Codigo cliente y ubicacion son obligatorios.')
      return
    }
    if (danoMaterial === 'SI' && !observacionMaterial.trim()) {
      setError('Debes completar observacion de dano material.')
      return
    }
    if (danoPersona === 'SI' && !observacionPersona.trim()) {
      setError('Debes completar observacion de dano persona.')
      return
    }
    if (novedadesTrabajo === 'SI' && !observacionNovedades.trim()) {
      setError('Debes completar observacion de novedades.')
      return
    }
    if (!declaracionAceptada) {
      setError('Debe aceptar la declaracion jurada para registrar el cierre de jornada.')
      return
    }
    setError(null)
    cierreMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <Modal
        open={supervisorConfirmacionModalOpen}
        onClose={() => setSupervisorConfirmacionModalOpen(false)}
        title="Cierre no permitido"
        actions={
          <Button type="button" onClick={() => setSupervisorConfirmacionModalOpen(false)}>
            Entendido
          </Button>
        }
      >
        <div className="space-y-3 text-sm font-semibold text-slate-700">
          <p>No se puede registrar el cierre hasta que el supervisor confirme el dia de ayer.</p>
          <p className="font-black uppercase text-slate-900">SUPERVISOR: {supervisorPendienteLabel}</p>
          <p className="font-black uppercase text-amber-700">POR FAVOR LLENAR LOS DATOS EN EL DIA</p>
        </div>
      </Modal>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={choiceCardClass}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faHashtag} />
            </span>
            <p className="text-sm font-bold text-slate-900">Cliente</p>
          </div>
          <Field label="Codigo cliente">
            <input
              className="input-base"
              value={codigoCliente}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={20}
              onChange={(event) => setCodigoCliente(normalizeOnlyDigits(event.target.value))}
            />
          </Field>
        </div>

        <div className={choiceCardClass}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faLocationCrosshairs} />
            </span>
            <p className="text-sm font-bold text-slate-900">Ubicacion</p>
          </div>
          <Field label="Ubicacion georeferenciada">
            <div className="space-y-2">
              <input className="input-base bg-slate-100" value={ubicacionGeoRef} readOnly />
              <Button type="button" variant="secondary" onClick={resolverUbicacionAltaPrecision} disabled={ubicacionResolviendo}>
                {ubicacionResolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
              </Button>
            </div>
          </Field>
        </div>

        <div className={choiceCardClass}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faBriefcaseMedical} />
            </span>
            <p className="text-sm font-bold text-slate-900">Dano material</p>
          </div>
          <div className="space-y-3">
            <Field label="Hubo dano material">
              <select className="input-base" value={danoMaterial} onChange={(event) => setDanoMaterial(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            {danoMaterial === 'SI' ? (
              <Field label="Observacion dano material">
                <textarea className="input-base min-h-24 resize-y" value={observacionMaterial} onChange={(event) => setObservacionMaterial(event.target.value)} />
              </Field>
            ) : null}
          </div>
        </div>

        <div className={choiceCardClass}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faPersonFalling} />
            </span>
            <p className="text-sm font-bold text-slate-900">Dano persona</p>
          </div>
          <div className="space-y-3">
            <Field label="Hubo dano persona">
              <select className="input-base" value={danoPersona} onChange={(event) => setDanoPersona(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            {danoPersona === 'SI' ? (
              <Field label="Observacion dano persona">
                <textarea className="input-base min-h-24 resize-y" value={observacionPersona} onChange={(event) => setObservacionPersona(event.target.value)} />
              </Field>
            ) : null}
          </div>
        </div>

        <div className={`${choiceCardClass} md:col-span-2`}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faClipboardList} />
            </span>
            <p className="text-sm font-bold text-slate-900">Novedades de trabajo</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Hubo novedades">
              <select className="input-base" value={novedadesTrabajo} onChange={(event) => setNovedadesTrabajo(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            {novedadesTrabajo === 'SI' ? (
              <Field label="Observacion novedades">
                <textarea className="input-base min-h-24 resize-y" value={observacionNovedades} onChange={(event) => setObservacionNovedades(event.target.value)} />
              </Field>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </div>

        <div className={`${choiceCardClass} md:col-span-2 ${mostrarErrorDeclaracion ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}>
          <div className="mb-3 flex items-center gap-3">
            <span className={fieldIconClass}>
              <FontAwesomeIcon icon={faFileSignature} />
            </span>
            <p className="text-sm font-bold text-slate-900">Declaracion Jurada de cierre de Jornada</p>
          </div>
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {declaracionJuradaCierreJornada.map((parrafo) => (
                <p key={parrafo} className="mb-3 last:mb-0">
                  {parrafo}
                </p>
              ))}
            </div>
            <label className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-semibold ${mostrarErrorDeclaracion ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-100' : 'border-blue-100 bg-blue-50/70 text-slate-800'}`}>
              <input
                type="checkbox"
                className={`mt-1 h-4 w-4 rounded ${mostrarErrorDeclaracion ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : 'border-slate-300 text-blue-700 focus:ring-blue-600'}`}
                checked={declaracionAceptada}
                onChange={(event) => {
                  setDeclaracionAceptada(event.target.checked)
                  setError(null)
                }}
              />
              <span>Acepto y declaro bajo juramento que la informacion registrada en el cierre es veraz.</span>
            </label>
            {mostrarErrorDeclaracion ? (
              <p className="text-xs font-semibold text-rose-600">Debe aceptar la declaracion jurada para registrar el cierre de jornada.</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" />
          Revise los datos antes de registrar el cierre.
        </p>
        <Button type="button" onClick={handleSubmit} disabled={cierreMutation.isPending} className="w-full sm:w-auto">
          {cierreMutation.isPending ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}

export default CierreJornadaForm
