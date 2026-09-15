import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationCrosshairs, faSpinner } from '@fortawesome/free-solid-svg-icons'
import Button from './Button'

type UbicacionManualCaptureProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Captura la ubicacion georreferenciada usando navigator.geolocation del
 * dispositivo. Si el navegador la rechaza o no esta disponible (por ejemplo,
 * sin contexto seguro/HTTPS), se deja el campo editable para ingresarla o
 * pegarla manualmente como respaldo.
 */
const UbicacionManualCapture = ({ value, onChange, placeholder, className = '' }: UbicacionManualCaptureProps) => {
  const [obteniendo, setObteniendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerUbicacionActual = () => {
    setError(null)
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo o navegador no soporta geolocalizacion. Ingresa la ubicacion manualmente.')
      return
    }
    setObteniendo(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        setObteniendo(false)
      },
      (geoError) => {
        setObteniendo(false)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Debes permitir el acceso a tu ubicacion. Tambien puedes ingresarla manualmente.')
        } else {
          setError('No se pudo obtener tu ubicacion. Intenta de nuevo o ingresala manualmente.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Button type="button" variant="secondary" onClick={obtenerUbicacionActual} className="w-full" disabled={obteniendo}>
        <FontAwesomeIcon icon={obteniendo ? faSpinner : faLocationCrosshairs} spin={obteniendo} className="mr-2" />
        {obteniendo ? 'Obteniendo ubicacion...' : 'Usar mi ubicacion actual'}
      </Button>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <input
        className="input-base"
        value={value}
        placeholder={placeholder ?? 'Coordenadas capturadas automaticamente, o ingresalas manualmente'}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export default UbicacionManualCapture
