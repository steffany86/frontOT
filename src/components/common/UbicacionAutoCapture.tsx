import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationCrosshairs } from '@fortawesome/free-solid-svg-icons'
import Button from './Button'

type UbicacionAutoCaptureProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Bloqueado: no pide permiso de ubicacion, ni permite editar ni actualizar. */
  disabled?: boolean
  /** Input y boton de actualizar (solo icono) en una sola linea. */
  compacto?: boolean
  /** Solo GPS: el texto no se puede escribir a mano, solo se actualiza con el boton. */
  soloLectura?: boolean
}

const mensajeErrorUbicacion = (geoError: GeolocationPositionError) => {
  if (geoError.code === 1) return 'Permiso de ubicacion denegado.'
  if (geoError.code === 2) return 'No se pudo determinar tu ubicacion.'
  return 'Tiempo de espera agotado al obtener ubicacion. Intenta actualizar la ubicacion.'
}

const UbicacionAutoCapture = ({ value, onChange, placeholder, className = '', disabled = false, compacto = false, soloLectura = false }: UbicacionAutoCaptureProps) => {
  const [resolviendo, setResolviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolverUbicacionAltaPrecision = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion.')
      return
    }
    setResolviendo(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const acc = position.coords.accuracy
        onChange(`${lat.toFixed(7)},${lng.toFixed(7)} (±${Math.round(acc)}m)`)
        setResolviendo(false)
      },
      (geoError) => {
        if (geoError.code === 1) {
          setError(mensajeErrorUbicacion(geoError))
          setResolviendo(false)
          return
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            const acc = position.coords.accuracy
            onChange(`${lat.toFixed(7)},${lng.toFixed(7)} (+/-${Math.round(acc)}m)`)
            setResolviendo(false)
            setError(null)
          },
          (fallbackError) => {
            setError(mensajeErrorUbicacion(fallbackError))
            setResolviendo(false)
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 300000,
          }
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 60000,
      }
    )
  }

  useEffect(() => {
    if (disabled) return
    resolverUbicacionAltaPrecision()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (compacto) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <input
            className="input-base min-w-0 flex-1 bg-slate-100"
            value={value}
            placeholder={placeholder ?? 'Ej: -17.7935693,-63.1461147 (+/-9m)'}
            onChange={(event) => onChange(event.target.value)}
            readOnly={soloLectura}
            disabled={disabled}
          />
          <button
            type="button"
            title={resolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
            aria-label="Actualizar ubicacion"
            onClick={resolverUbicacionAltaPrecision}
            disabled={resolviendo || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-blue-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faLocationCrosshairs} spin={resolviendo} />
          </button>
        </div>
        {error ? <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        className="input-base bg-slate-100"
        value={value}
        placeholder={placeholder ?? 'Ej: -17.7935693,-63.1461147 (+/-9m)'}
        onChange={(event) => onChange(event.target.value)}
            readOnly={soloLectura}
        disabled={disabled}
      />
      <Button type="button" variant="secondary" onClick={resolverUbicacionAltaPrecision} disabled={resolviendo || disabled}>
        {resolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
      </Button>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  )
}

export default UbicacionAutoCapture
