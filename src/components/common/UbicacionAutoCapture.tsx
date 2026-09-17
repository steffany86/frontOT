import { useEffect, useState } from 'react'
import Button from './Button'

type UbicacionAutoCaptureProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const mensajeErrorUbicacion = (geoError: GeolocationPositionError) => {
  if (geoError.code === 1) return 'Permiso de ubicacion denegado.'
  if (geoError.code === 2) return 'No se pudo determinar tu ubicacion.'
  return 'Tiempo de espera agotado al obtener ubicacion. Puedes ingresarla manualmente.'
}

const UbicacionAutoCapture = ({ value, onChange, placeholder, className = '' }: UbicacionAutoCaptureProps) => {
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
    resolverUbicacionAltaPrecision()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        className="input-base bg-slate-100"
        value={value}
        placeholder={placeholder ?? 'Ej: -17.7935693,-63.1461147 (+/-9m)'}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="button" variant="secondary" onClick={resolverUbicacionAltaPrecision} disabled={resolviendo}>
        {resolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
      </Button>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  )
}

export default UbicacionAutoCapture
