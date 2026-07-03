import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faCamera,
  faCircleCheck,
  faFileSignature,
  faHelmetSafety,
  faImage,
  faTriangleExclamation,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons'
import Button from '../common/Button'
import Field from '../common/Field'
import ImageLightbox from '../common/ImageLightbox'
import { registrarInicioJornada } from '../../api/inicioJornadaApi'
import { getApiErrorMessage } from '../../services/httpClient'

type SiNo = 'SI' | 'NO'

type InicioJornadaChecklistFormProps = {
  nombreTecnico?: string
  nombreSupervisor?: string
  onRegistered?: () => void
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const SectionHeader = ({ icon, title }: { icon: typeof faUserShield; title: string }) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
      <FontAwesomeIcon icon={icon} className="text-sm" />
    </span>
    <h4 className="text-xl font-bold text-blue-700">{title}</h4>
  </div>
)

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'

const declaracionJuradaInicioJornada = [
  'A través del presente, bajo juramento declaro expresamente que toda la información registrada en este formulario es veraz y corresponde a la realidad. Confirmo, bajo juramento, que únicamente el personal aquí identificado participará en la ejecución de las órdenes de trabajo asignadas así como en cualquier actividad relacionada con Makiro y/o Tigo, que dicho personal dispone y utilizará permanentemente durante la ejecución de las ordenes de trabajo, los Equipos de Protección Personal (EPP) exigidos, que se realizará el Análisis Preliminar de Riesgos (APR) previo a cada intervención y que todos los integrantes de la cuadrilla cuentan con las competencias, capacitaciones y autorizaciones requeridas para desarrollar las actividades encomendadas.',
  'Asimismo, declaro conocer que la incorporación de personal no registrado, la omisión de información o la falsedad de los datos consignados constituye un incumplimiento a las normas de seguridad y podrá dar lugar a responsabilidades penales, civiles, administrativas, contractuales y legales. Así mismo, Declaro que no permitiré la participación en las actividades de ejecución de órdenes de trabajo, de ninguna persona distinta a las registradas en este sistema (Tigo Hogar Operaciones Técnicas Makiro).',
]

const InicioJornadaChecklistForm = ({ nombreTecnico, nombreSupervisor, onRegistered }: InicioJornadaChecklistFormProps) => {
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [capacitado, setCapacitado] = useState<SiNo>('NO')
  const [charla, setCharla] = useState<SiNo>('NO')
  const [botiquin, setBotiquin] = useState<SiNo>('NO')
  const [extintor, setExtintor] = useState<SiNo>('NO')
  const [equipoEpp, setEquipoEpp] = useState<SiNo>('NO')
  const [estadoEpp, setEstadoEpp] = useState<SiNo>('NO')
  const [apr, setApr] = useState<SiNo>('NO')
  const [escalera, setEscalera] = useState<SiNo>('NO')
  const [anclaje, setAnclaje] = useState<SiNo>('NO')
  const [declaracionAceptada, setDeclaracionAceptada] = useState(false)
  const [imagen, setImagen] = useState('')
  const [nombreImagen, setNombreImagen] = useState('')
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null)
  const [ubicacionGeoRef, setUbicacionGeoRef] = useState('')
  const [ubicacionResolviendo, setUbicacionResolviendo] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intentoRegistrar, setIntentoRegistrar] = useState(false)
  const elegirImagenInputRef = useRef<HTMLInputElement | null>(null)
  const tomarFotoInputRef = useRef<HTMLInputElement | null>(null)

  const mostrarErrorFecha = intentoRegistrar && !fechaVencimiento
  const mostrarErrorImagen = intentoRegistrar && !imagen
  const mostrarErrorDeclaracion = intentoRegistrar && !declaracionAceptada

  const registrarMutation = useMutation({
    mutationFn: () =>
      registrarInicioJornada({
        fechaVencimiento,
        capacitado,
        charla,
        botiquin,
        extintor,
        equipoEpp,
        estadoEpp,
        apr,
        escalera,
        anclaje,
        imagen,
        ubicacionGeoRef,
        aceptoInicioJornada: declaracionAceptada ? 'SI' : 'NO',
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Inicio de jornada registrado correctamente.')
      onRegistered?.()
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo registrar inicio de jornada.'))
    },
  })

  const handleImageChange = async (file: File | null) => {
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImagen(dataUrl)
      setNombreImagen(file.name || 'imagen.jpg')
      setError(null)
    } catch {
      setError('No se pudo leer la imagen.')
    }
  }

  const handleSubmit = () => {
    setIntentoRegistrar(true)
    if (!fechaVencimiento || !imagen) {
      setFeedback(null)
      setError('Fecha de vencimiento e imagen son obligatorios.')
      return
    }
    if (!declaracionAceptada) {
      setFeedback(null)
      setError('Debe aceptar la declaracion jurada para registrar el inicio de jornada.')
      return
    }
    setError(null)
    registrarMutation.mutate()
  }

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
        setUbicacionGeoRef(`${lat.toFixed(7)},${lng.toFixed(7)} (±${Math.round(acc)}m)`)
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
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  useEffect(() => {
    resolverUbicacionAltaPrecision()
  }, [])

  return (
    <div className="grid gap-4 bg-slate-50 p-1">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-3xl font-extrabold text-slate-900">Registro de Jornada</h3>
        <p className="mt-1 text-sm text-slate-600">Complete los requisitos de seguridad antes de iniciar.</p>
        <p className="mt-3 text-sm font-semibold text-slate-700">Nombre tecnico: {nombreTecnico?.trim() || '-'}</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <div className={cardClass}>
        <SectionHeader icon={faUserShield} title="Informacion General" />
        <div className="grid gap-4">
          <Field label="Encargado (Supervisor)">
            <input className="input-base bg-slate-100" value={nombreSupervisor?.trim() || 'Supervisor no encontrado'} readOnly />
          </Field>
          <Field label="Fecha de vencimiento extintor" error={mostrarErrorFecha ? 'La fecha de vencimiento es obligatoria.' : undefined}>
            <div className="relative max-w-full overflow-hidden">
              <input
                className={`input-base w-full min-w-0 max-w-full pr-10 text-sm sm:text-base ${mostrarErrorFecha ? 'border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                style={{ WebkitAppearance: 'none' }}
                type="date"
                value={fechaVencimiento}
                onChange={(event) => {
                  setFechaVencimiento(event.target.value)
                  setError(null)
                }}
              />
              <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${mostrarErrorFecha ? 'text-rose-500' : 'text-slate-500'}`}>
                <FontAwesomeIcon icon={faCalendarDays} />
              </span>
            </div>
          </Field>
          <Field label="Ubicacion georreferenciada">
            <div className="space-y-2">
              <input className="input-base bg-slate-100" value={ubicacionGeoRef} readOnly />
              <Button
                type="button"
                variant="secondary"
                onClick={resolverUbicacionAltaPrecision}
                disabled={ubicacionResolviendo}
              >
                {ubicacionResolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <div className={cardClass}>
        <SectionHeader icon={faCircleCheck} title="Capacitacion" />
        <div className="grid gap-4">
          <Field label="Estan capacitados y cuentan con curso?">
            <select className="input-base" value={capacitado} onChange={(event) => setCapacitado(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Reciben charla semanal de seguridad?">
            <select className="input-base" value={charla} onChange={(event) => setCharla(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={`rounded-2xl border border-dashed bg-white p-4 shadow-sm ${mostrarErrorImagen ? 'border-rose-500 ring-2 ring-rose-100' : 'border-blue-300'}`}>
        <SectionHeader icon={faCamera} title="Registro Visual" />
        <Field label="Foto de perfil con su equipo" error={mostrarErrorImagen ? 'Debe cargar o tomar una foto.' : undefined}>
          <div className="grid gap-3">
            <div className={`flex min-h-48 items-center justify-center rounded-2xl border p-3 ${mostrarErrorImagen ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-100/80'}`}>
              {imagen ? (
                <img src={imagen} alt="Foto seleccionada" className="h-44 w-full cursor-zoom-in rounded-xl object-cover" onClick={() => setZoomImageSrc(imagen)} />
              ) : (
                <div className={`text-center ${mostrarErrorImagen ? 'text-rose-600' : 'text-slate-500'}`}>
                  <FontAwesomeIcon icon={faImage} className="mb-2 text-3xl" />
                  <p>Sin imagen seleccionada.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => elegirImagenInputRef.current?.click()}>
                Elegir
              </Button>
              <Button type="button" variant="secondary" onClick={() => tomarFotoInputRef.current?.click()}>
                Tomar foto
              </Button>
            </div>
            <div className={`text-xs ${mostrarErrorImagen ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
              {nombreImagen ? `Imagen cargada: ${nombreImagen}` : 'Sin imagen seleccionada.'}
            </div>
          </div>
          <input ref={elegirImagenInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)} />
          <input
            ref={tomarFotoInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
          />
        </Field>
      </div>

      <div className={cardClass}>
        <SectionHeader icon={faHelmetSafety} title="Equipos de Proteccion (EPP)" />
        <div className="grid gap-4">
          <Field label="Cuentan con botiquin?">
            <select className="input-base" value={botiquin} onChange={(event) => setBotiquin(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Cuentan con extintor?">
            <select className="input-base" value={extintor} onChange={(event) => setExtintor(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Cuentan con EPP personal?">
            <select className="input-base" value={equipoEpp} onChange={(event) => setEquipoEpp(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Esta en buen estado el EPP?">
            <select className="input-base" value={estadoEpp} onChange={(event) => setEstadoEpp(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={cardClass}>
        <SectionHeader icon={faTriangleExclamation} title="Evaluacion de Riesgo" />
        <div className="grid gap-4">
          <Field label="Analisis preliminar (APR)">
            <select className="input-base" value={apr} onChange={(event) => setApr(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Estado de escaleras">
            <select className="input-base" value={escalera} onChange={(event) => setEscalera(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Punto de anclaje">
            <select className="input-base" value={anclaje} onChange={(event) => setAnclaje(event.target.value as SiNo)}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={cardClass}>
        <SectionHeader icon={faFileSignature} title="Declaración Jurada de inicio de Jornada" />
        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {declaracionJuradaInicioJornada.map((parrafo) => (
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
            <span>Acepto y declaro bajo juramento que la información registrada es veraz.</span>
          </label>
          {mostrarErrorDeclaracion ? (
            <p className="text-xs font-semibold text-rose-600">Debe aceptar la declaracion jurada para registrar el inicio de jornada.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-1 flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={registrarMutation.isPending} className="w-full sm:w-auto">
          {registrarMutation.isPending ? 'Guardando...' : 'Registrar inicio de jornada'}
        </Button>
      </div>
      <ImageLightbox open={Boolean(zoomImageSrc)} src={zoomImageSrc ?? ''} onClose={() => setZoomImageSrc(null)} />
    </div>
  )
}

export default InicioJornadaChecklistForm
