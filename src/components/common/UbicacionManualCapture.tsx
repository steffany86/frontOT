import Button from './Button'

type UbicacionManualCaptureProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Reemplaza la captura automatica de ubicacion (navigator.geolocation) por un
 * flujo manual: el usuario abre Google Maps, copia su direccion/coordenadas
 * y las pega en el campo. Se usa mientras el dominio propio no tiene HTTPS
 * estable, ya que la geolocalizacion del navegador requiere un contexto seguro.
 */
const UbicacionManualCapture = ({ value, onChange, placeholder, className = '' }: UbicacionManualCaptureProps) => {
  const abrirGoogleMaps = () => {
    window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-center text-base font-extrabold uppercase leading-snug text-amber-800">
        Entra a Google, copia la direccion y peguela aqui
      </p>
      <Button type="button" variant="secondary" onClick={abrirGoogleMaps} className="w-full">
        Abrir Google Maps
      </Button>
      <input
        className="input-base"
        value={value}
        placeholder={placeholder ?? 'Pega aqui la direccion o coordenadas copiadas de Google Maps'}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export default UbicacionManualCapture
