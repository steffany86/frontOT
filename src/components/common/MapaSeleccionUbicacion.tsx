import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, AttributionControl, ZoomControl, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

type Coords = { lat: number; lng: number }

type ResultadoBusqueda = { label: string; lat: number; lng: number }

type MapaSeleccionUbicacionProps = {
  center: Coords
  value: Coords | null
  onChange: (coords: Coords) => void
  height?: number | string
}

const marcadorIcono = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const CapturadorClicks = ({ onChange }: { onChange: (coords: Coords) => void }) => {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

/**
 * Mapa interactivo (OpenStreetMap via Leaflet) para seleccionar un punto exacto,
 * con buscador de direcciones (Nominatim) tipo Google Maps. El marcador parte
 * en `value` (o en `center` si aun no fue ajustado) y se mueve tocando el mapa,
 * arrastrando el marcador o eligiendo un resultado del buscador.
 */
const MapaSeleccionUbicacion = ({ center, value, onChange, height = 320 }: MapaSeleccionUbicacionProps) => {
  const posicionMarcador = value ?? center
  const mapRef = useRef<L.Map | null>(null)
  const [capa, setCapa] = useState<'satelite' | 'calles'>('satelite')
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const contenedorRef = useRef<HTMLDivElement | null>(null)

  // El contenedor puede cambiar de tamano despues de montarse (modal a pantalla completa,
  // barra del navegador movil): Leaflet debe recalcular o el zoom/arrastre se desfasa.
  useEffect(() => {
    const elemento = contenedorRef.current
    if (!elemento || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize())
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (query.trim().length < 3) {
      setResultados([])
      return
    }
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setBuscando(true)
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=bo&q=${encodeURIComponent(query)}`
      fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
        .then((res) => res.json())
        .then((data: Array<{ display_name: string; lat: string; lon: string }>) => {
          setResultados(
            Array.isArray(data)
              ? data.map((item) => ({ label: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }))
              : []
          )
        })
        .catch(() => {
          // Se ignoran errores de red o busquedas canceladas (abort por nueva escritura).
        })
        .finally(() => setBuscando(false))
    }, 500)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  const seleccionarResultado = (resultado: ResultadoBusqueda) => {
    onChange({ lat: resultado.lat, lng: resultado.lng })
    setQuery(resultado.label)
    setResultados([])
    mapRef.current?.flyTo([resultado.lat, resultado.lng], 17)
  }

  return (
    <div ref={contenedorRef} className="relative overflow-hidden rounded-xl border border-slate-300" style={{ height }}>
      <div className="absolute left-2 right-14 top-2 z-[1000]">
        <input
          className="input-base w-full bg-white shadow-md"
          value={query}
          placeholder="Buscar direccion..."
          onChange={(event) => setQuery(event.target.value)}
        />
        {buscando ? (
          <div className="mt-1 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-500 shadow-md">Buscando...</div>
        ) : null}
        {resultados.length > 0 ? (
          <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {resultados.map((resultado, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                  onClick={() => seleccionarResultado(resultado)}
                >
                  {resultado.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="absolute bottom-2 right-2 z-[1000] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
        <button
          type="button"
          onClick={() => setCapa('satelite')}
          className={`px-2.5 py-1.5 text-[11px] font-semibold transition ${
            capa === 'satelite' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Satelital
        </button>
        <button
          type="button"
          onClick={() => setCapa('calles')}
          className={`border-l border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold transition ${
            capa === 'calles' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Croquis
        </button>
      </div>
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={18}
        maxZoom={20}
        bounceAtZoomLimits={false}
        zoomSnap={1}
        attributionControl={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <AttributionControl position="bottomleft" prefix={false} />
        <ZoomControl position="topright" />
        {capa === 'satelite' ? (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={20}
              maxNativeZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
              maxNativeZoom={17}
            />
          </>
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={20}
            maxNativeZoom={17}
          />
        )}
        <CapturadorClicks onChange={onChange} />
        <Marker
          position={[posicionMarcador.lat, posicionMarcador.lng]}
          draggable
          icon={marcadorIcono}
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as L.Marker
              const pos = marker.getLatLng()
              onChange({ lat: pos.lat, lng: pos.lng })
            },
          }}
        />
      </MapContainer>
    </div>
  )
}

export default MapaSeleccionUbicacion
