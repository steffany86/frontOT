import { useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent, type PointerEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import { fetchEstados, fetchRamales, fetchRutas, fetchTiposServicio, fetchTiposTecnologia, type CatalogItem } from '../api/catalogApi'
import { fetchMe, fetchSucursales } from '../api/authApi'
import { crearCorteTap } from '../api/corteTapApi'
import {
  fetchCabeceraVentaParaRegistroOtWb,
  fetchOtByNumero,
  registrarVentaParaRegistroOtWb,
  toIsoDateParam,
  validateCuadreRuta,
  validateExisteCierreAlmacen,
} from '../api/otApi'
import { getApiErrorMessage } from '../services/httpClient'
import { MAX_UPLOAD_BYTES, useFileSizeLimitModal } from '../hooks/useFileSizeLimitModal'
import { useSessionStore } from '../store/sessionStore'
import { todayISO } from '../utils/dates'
import { getSessionSucursalId } from '../utils/storage'

type AgendaNavState = {
  manual?: boolean
  origen?: string
  ot?: string
  tor?: string
  clienteNro?: string
  estado?: string
  grupo?: string
  tecnicoNombre?: string
  idVendedor?: string
  idRuta?: string
  idTipoServicio?: string
  idSucursal?: string
  rowData?: UnknownRecord
}

type UnknownRecord = Record<string, unknown>
type GeoSample = { latitude: number; longitude: number; accuracy: number }
type GeoPoint = { latitud: number; longitud: number }

const GEO_TARGET_ACCURACY_METERS = 10
const GEO_MAX_CAPTURE_MS = 3500
const GEO_MIN_SAMPLES = 2
const GEO_MAX_SAMPLES = 5
const GEO_BYPASS_HOSTS = ['desktop-b4oj8tg']
const OT_DASHBOARD_FORCE_REFRESH_KEY = 'ot-dashboard-force-refresh'
const PDF_MAX_BYTES = MAX_UPLOAD_BYTES
const IMAGE_MAX_BYTES = MAX_UPLOAD_BYTES
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/x-png', 'application/octet-stream']
const FORM_STEPS = ['Cabecera', 'Red', 'Observacion', 'Archivo'] as const
const TIPO_SERVICIO_ID_KEYS = [
  'id_tiposervicio',
  'Id_TipoServicio',
  'idTipoServicio',
  'IdTipoServicio',
  'id_tipo_servicio',
  'Id_Tipo_Servicio',
] as const

const normalizeHostName = (value: string): string => value.trim().toLowerCase()
const isTouchLikeDevice = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

const clampLatitude = (value: number): number => Math.max(-85, Math.min(85, value))
const normalizeLongitude = (value: number): number => {
  let next = value
  while (next < -180) next += 360
  while (next > 180) next -= 360
  return next
}

const latLngToWorld = (latitud: number, longitud: number, zoom: number) => {
  const scale = 256 * 2 ** zoom
  const lat = clampLatitude(latitud)
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((normalizeLongitude(longitud) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

const worldToLatLng = (x: number, y: number, zoom: number): GeoPoint => {
  const scale = 256 * 2 ** zoom
  const longitud = normalizeLongitude((x / scale) * 360 - 180)
  const n = Math.PI - (2 * Math.PI * y) / scale
  const latitud = (Math.atan(Math.sinh(n)) * 180) / Math.PI
  return { latitud, longitud }
}

const VentaLocationMap = ({
  value,
  currentLocation,
  onChange,
}: {
  value: GeoPoint | null
  currentLocation: GeoPoint | null
  onChange: (point: GeoPoint) => void
}) => {
  const [zoom, setZoom] = useState(17)
  const [mapType, setMapType] = useState<'normal' | 'satelital'>('satelital')
  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const mapMovedByUserRef = useRef(false)
  const panStartRef = useRef<{ clientX: number; clientY: number; centerWorld: { x: number; y: number } } | null>(null)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchPointerRef = useRef<{ distance: number; zoom: number } | null>(null)

  useEffect(() => {
    if (!currentLocation || mapMovedByUserRef.current) return
    setMapCenter(currentLocation)
  }, [currentLocation])

  const center = mapCenter ?? value ?? currentLocation
  const centerWorld = center ? latLngToWorld(center.latitud, center.longitud, zoom) : null
  const centerTile = centerWorld
    ? {
        x: Math.floor(centerWorld.x / 256),
        y: Math.floor(centerWorld.y / 256),
      }
    : null
  const maxTile = 2 ** zoom

  const selectCenter = () => {
    if (!center) return
    onChange({ latitud: Number(center.latitud.toFixed(6)), longitud: Number(center.longitud.toFixed(6)) })
  }

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!centerWorld) return
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    const points = Array.from(activePointersRef.current.values())
    if (points.length >= 2) {
      pinchPointerRef.current = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        zoom,
      }
      panStartRef.current = null
    } else {
      panStartRef.current = { clientX: event.clientX, clientY: event.clientY, centerWorld }
    }
    setDragging(true)
  }

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = Array.from(activePointersRef.current.values())
    if (points.length >= 2 && pinchPointerRef.current) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const delta = distance - pinchPointerRef.current.distance
      if (Math.abs(delta) >= 12) {
        const nextZoom = Math.max(14, Math.min(19, pinchPointerRef.current.zoom + (delta > 0 ? 1 : -1)))
        setZoom(nextZoom)
        pinchPointerRef.current = { distance, zoom: nextZoom }
      }
      return
    }
    const start = panStartRef.current
    if (!start) return
    mapMovedByUserRef.current = true
    const dx = event.clientX - start.clientX
    const dy = event.clientY - start.clientY
    const next = worldToLatLng(start.centerWorld.x - dx, start.centerWorld.y - dy, zoom)
    setMapCenter({ latitud: Number(next.latitud.toFixed(6)), longitud: Number(next.longitud.toFixed(6)) })
  }

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId)
    if (activePointersRef.current.size < 2) pinchPointerRef.current = null
    if (panStartRef.current) {
      movePan(event)
    }
    if (activePointersRef.current.size === 0) panStartRef.current = null
    panStartRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (!center || !centerWorld || !centerTile) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center text-sm font-semibold text-slate-500">
        Captura primero la ubicacion actual para iniciar el mapa.
      </div>
    )
  }

  const tiles: Array<{ key: string; x: number; y: number; left: number; top: number }> = []
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const tileX = ((centerTile.x + dx) % maxTile + maxTile) % maxTile
      const tileY = centerTile.y + dy
      if (tileY < 0 || tileY >= maxTile) continue
      tiles.push({
        key: `${tileX}-${tileY}-${zoom}`,
        x: tileX,
        y: tileY,
        left: centerTile.x * 256 + dx * 256 - centerWorld.x,
        top: centerTile.y * 256 + dy * 256 - centerWorld.y,
      })
    }
  }

  const renderMapSurface = (large = false) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-slate-600">Arrastra el punto en el mapa</span>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={`rounded-md border px-2 py-1 font-semibold ${mapType === 'normal' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`} onClick={() => setMapType('normal')}>Mapa</button>
          <button type="button" className={`rounded-md border px-2 py-1 font-semibold ${mapType === 'satelital' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`} onClick={() => setMapType('satelital')}>Satelital</button>
          <button type="button" className="h-7 w-7 rounded-md border border-slate-300 bg-white font-bold text-slate-700" onClick={() => setZoom((current) => Math.max(14, current - 1))}>-</button>
          <button type="button" className="h-7 w-7 rounded-md border border-slate-300 bg-white font-bold text-slate-700" onClick={() => setZoom((current) => Math.min(19, current + 1))}>+</button>
        </div>
      </div>
      <div
        className={`relative ${large ? 'h-[min(68vh,640px)]' : 'h-[260px]'} touch-none overflow-hidden bg-slate-100 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={mapType === 'satelital'
              ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.x}`
              : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${tile.y}/${tile.x}`}
            alt=""
            draggable={false}
            className="absolute h-64 w-64 select-none"
            style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
          />
        ))}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-md" />
      </div>
      <p className="px-3 pt-1 text-[10px] text-slate-400">{mapType === 'satelital' ? 'Imagen satelital: Esri' : 'Mapa de calles: Esri'} · Usa dos dedos para ampliar o reducir.</p>
      <div className="flex flex-col gap-2 border-t border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-600">
          Centro: {center.latitud.toFixed(6)}, {center.longitud.toFixed(6)}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={selectCenter}>
            Confirmar centro
          </Button>
          {!large ? (
            <Button type="button" variant="secondary" onClick={() => setExpanded(true)}>
              Abrir grande
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {renderMapSurface(false)}
      <Modal
        open={expanded}
        title="Ubicacion del punto"
        onClose={() => setExpanded(false)}
        maxWidthClass="w-[min(96vw,1100px)]"
      >
        {renderMapSurface(true)}
      </Modal>
    </>
  )
}

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()
const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const normalizeTipoServicioLabel = (value: string): string => {
  const text = (value ?? '').trim()
  if (!text) return ''
  return text
    .replace(/\(([A-Za-z0-9]+)\)\s*\(\1\)/gi, '($1)')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const normalizeTipoToken = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/1/g, 'I')
    .replace(/0/g, 'O')

const hasEquivalentParentheticalToken = (label: string, token: string): boolean => {
  const normalizedToken = normalizeTipoToken(token)
  if (!normalizedToken) return false
  const matches = label.match(/\(([A-Za-z0-9]+)\)/g) ?? []
  return matches.some((match) => normalizeTipoToken(match.slice(1, -1)) === normalizedToken)
}

const isEstadoCerradoFinalizadoOk = (label: string): boolean => {
  const normalized = normalizeText(label)
  return normalized.includes('cerrado') && normalized.includes('finalizado') && normalized.includes('ok')
}

const readValue = (row: UnknownRecord, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of Object.entries(row)) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readString = (row: UnknownRecord, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const readStringByToken = (row: UnknownRecord, includeTokens: string[], excludeTokens: string[] = ['id']): string => {
  for (const [key, raw] of Object.entries(row)) {
    if (raw === undefined || raw === null || raw === '') continue
    const normalized = normalizeKey(key)
    if (excludeTokens.some((token) => normalized.includes(token))) continue
    if (!includeTokens.some((token) => normalized.includes(token))) continue
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  }
  return ''
}

const readNumber = (row: UnknownRecord, keys: string[]): number | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const readNumberByToken = (row: UnknownRecord, includeTokens: string[]): number | null => {
  const normalizedTokens = includeTokens.map(normalizeKey)
  for (const [key, raw] of Object.entries(row)) {
    if (raw === undefined || raw === null || raw === '') continue
    const normalizedKey = normalizeKey(key)
    if (!normalizedTokens.every((token) => normalizedKey.includes(token))) continue
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string') {
      const parsed = Number(raw.trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const firstPositiveNumber = (...values: Array<number | null | undefined>): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  }
  return null
}

const normalizeTipoTecnologia = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim().toUpperCase()
}

const normalizeTipoArchivo = (value: unknown): 'PDF' | 'IMAGEN' => {
  const normalized = String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  return normalized === 'IMAGEN' || normalized === 'IMAGE' ? 'IMAGEN' : 'PDF'
}

const readBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'number') return value === 1
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 's'
  }
  return false
}

const readOptionalBooleanFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value === 1
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '') return null
    if (normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 's') return true
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n') return false
  }
  return null
}

const sanitizeNodoInput = (value: string): string => {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let result = ''
  for (const char of clean) {
    if (result.length < 3) {
      if (/[A-Z]/.test(char)) result += char
      continue
    }
    if (result.length < 7 && /\d/.test(char)) {
      result += char
    }
    if (result.length === 7) break
  }
  return result
}

const findNumberInRows = (rows: UnknownRecord[], keys: string[]): number | null => {
  for (const row of rows) {
    const value = readNumber(row, keys)
    if (value !== null) return value
  }
  return null
}

const findNumberInRowsByToken = (rows: UnknownRecord[], includeTokens: string[]): number | null => {
  for (const row of rows) {
    const value = readNumberByToken(row, includeTokens)
    if (value !== null) return value
  }
  return null
}

const isUnknownRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

const isNotFoundError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false
  if (error.response?.status === 404) return true
  const payload = error.response?.data
  if (isUnknownRecord(payload) && payload.code === 'NOT_FOUND') return true
  return false
}

const mapOptions = (items: CatalogItem[], idKeys: string[], labelKeys: string[]): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

const pickBestGeoSample = (samples: GeoSample[]): GeoSample | null => {
  const clean = samples
    .filter((sample) => Number.isFinite(sample.latitude) && Number.isFinite(sample.longitude) && Number.isFinite(sample.accuracy) && sample.accuracy > 0)
    .sort((a, b) => a.accuracy - b.accuracy)

  if (!clean.length) return null

  const top = clean.slice(0, Math.min(3, clean.length))
  let latWeighted = 0
  let lonWeighted = 0
  let totalWeight = 0

  for (const sample of top) {
    const weight = 1 / Math.max(sample.accuracy, 1)
    latWeighted += sample.latitude * weight
    lonWeighted += sample.longitude * weight
    totalWeight += weight
  }

  return {
    latitude: latWeighted / totalWeight,
    longitude: lonWeighted / totalWeight,
    accuracy: top[0].accuracy,
  }
}

const buildDetailedApiError = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return getApiErrorMessage(error, fallback)

  const status = error.response?.status
  const method = (error.config?.method ?? 'post').toUpperCase()
  const endpoint = error.config?.url ?? '/ot/venta/registro-otwb'
  const responseData = error.response?.data

  const readField = (keys: string[]): string | null => {
    if (!responseData || typeof responseData !== 'object') return null
    const record = responseData as Record<string, unknown>
    for (const key of keys) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
      if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    }
    return null
  }

  const backendMessage = readField(['message', 'error', 'detail', 'title']) ?? getApiErrorMessage(error, fallback)
  const backendCode = readField(['code', 'errorCode'])
  let payloadPreview = ''
  if (responseData !== undefined) {
    try {
      payloadPreview = JSON.stringify(responseData)
    } catch {
      payloadPreview = String(responseData)
    }
  }

  console.error('[OT][REGISTRO][ERROR]', {
    method,
    endpoint,
    status: status ?? null,
    code: backendCode ?? null,
    message: backendMessage,
    response: responseData ?? null,
  })

  if (payloadPreview) {
    console.debug('[OT][REGISTRO][ERROR][DETAIL]', payloadPreview)
  }

  const lines = [
    `HTTP: ${status ?? 'sin_status'}`,
    `Mensaje: ${backendMessage}`,
  ].filter((line): line is string => Boolean(line))

  return lines.join('\n')
}

const isDuplicateOrdenError = (message: string): boolean => {
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return normalized.includes('ya existe una ot registrada con el mismo numero de orden')
}

const RegistrarOTAgendaPage = () => {
  const { validateFileSize, FileSizeLimitModal } = useFileSizeLimitModal()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSessionStore((state) => state.session)
  const navState = (location.state as AgendaNavState | null) ?? null
  const isManualMode = navState?.manual === true
  const origenRegistro = (navState?.origen ?? (isManualMode ? 'MANUAL' : 'OT_WEB')).trim() || (isManualMode ? 'MANUAL' : 'OT_WEB')

  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [latitudVenta, setLatitudVenta] = useState<number | null>(null)
  const [longitudVenta, setLongitudVenta] = useState<number | null>(null)
  const [ventaLocationTouched, setVentaLocationTouched] = useState(false)
  const [, setGeoAccuracy] = useState<number | null>(null)
  const [idTipoServicioManual, setIdTipoServicioManual] = useState(() => (navState?.idTipoServicio ?? '').trim())
  const [otManualInput, setOtManualInput] = useState(() => (navState?.ot ?? '').trim())
  const [clienteManualInput, setClienteManualInput] = useState(() => (navState?.clienteNro ?? '').trim())
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false)
  const [calibrationMessage, setCalibrationMessage] = useState('Calibrando GPS con alta precision...')
  const [calibrationBusy, setCalibrationBusy] = useState(false)
  const [isPrevalidating, setIsPrevalidating] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [validatedSteps, setValidatedSteps] = useState<Set<number>>(() => new Set())
  const [registroGuardado, setRegistroGuardado] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [successModalMessage, setSuccessModalMessage] = useState('')
  const [duplicateOrdenModalOpen, setDuplicateOrdenModalOpen] = useState(false)
  const [submitErrorModalOpen, setSubmitErrorModalOpen] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [nodo, setNodo] = useState('')
  const [ramal, setRamal] = useState('')
  const [tap, setTap] = useState('')
  const [boca, setBoca] = useState('')
  const [tipoTecnologia, setTipoTecnologia] = useState('')
  const [checkPlantaExterna, setCheckPlantaExterna] = useState(false)
  const [tieneDetalle, setTieneDetalle] = useState(false)
  const [formStep, setFormStep] = useState(0)
  const queryClient = useQueryClient()
  const tipoServicioRef = useRef<HTMLSelectElement | null>(null)
  const estadoRef = useRef<HTMLSelectElement | null>(null)
  const otRef = useRef<HTMLInputElement | null>(null)
  const clienteRef = useRef<HTMLInputElement | null>(null)
  const tipoTecnologiaRef = useRef<HTMLSelectElement | null>(null)
  const nodoRef = useRef<HTMLInputElement | null>(null)
  const ramalRef = useRef<HTMLSelectElement | null>(null)
  const tapRef = useRef<HTMLInputElement | null>(null)
  const bocaRef = useRef<HTMLSelectElement | null>(null)
  const archivoRef = useRef<HTMLInputElement | null>(null)
  const observacionRef = useRef<HTMLTextAreaElement | null>(null)

  const otRaw = (navState?.ot ?? '').trim()
  const ot = parseNumber(otRaw)
  const clienteNro = parseNumber((navState?.clienteNro ?? '').trim())
  const tor = (navState?.tor ?? '').trim()
  const tecnicoNombre = (navState?.tecnicoNombre ?? '').trim() || (session?.nombre ?? '').trim()
  const rowData = navState?.rowData ?? null
  const navIdVendedor = parseNumber((navState?.idVendedor ?? '').trim())
  const navIdRuta = parseNumber((navState?.idRuta ?? '').trim())
  const navIdTipoServicio = parseNumber((navState?.idTipoServicio ?? '').trim())
  const navIdSucursal = parseNumber((navState?.idSucursal ?? '').trim())
  const hostName = useMemo(() => {
    const sessionHost = normalizeHostName(session?.hostName ?? '')
    const browserHost = typeof window !== 'undefined' ? normalizeHostName(window.location.hostname) : ''
    return sessionHost || browserHost
  }, [session?.hostName])
  const isGeoBypassMachine = useMemo(() => GEO_BYPASS_HOSTS.includes(hostName), [hostName])

  const rutasQuery = useQuery({
    queryKey: ['catalogos-rutas-agenda-base', session?.idUsuario ?? 0],
    queryFn: () => fetchRutas(session?.idUsuario),
    enabled: Boolean(session?.idUsuario),
  })

  const grupoParam = useMemo(() => {
    const fromState = (navState?.grupo ?? '').trim()
    if (fromState) return fromState
    if (rowData) {
      const fromRow = readString(rowData, [
        'nombreGrupo',
        'NombreGrupo',
        'grupo',
        'Grupo',
        'nombreRuta',
        'NombreRuta',
        'ruta',
        'Ruta',
      ]).trim()
      if (fromRow) return fromRow
      const byToken = readStringByToken(rowData, ['grupo', 'ruta', 'cuadrilla', 'nombre'])
      if (byToken) return byToken
    }
    const first = (rutasQuery.data ?? [])[0]
    if (!first) return ''
    return readString(first, ['nombreGrupo', 'NombreGrupo', 'grupo', 'Grupo', 'ruta', 'Ruta', 'nombre', 'Nombre', 'nombreRuta', 'NombreRuta']).trim()
  }, [navState?.grupo, rowData, rutasQuery.data])

  const spParams = useMemo(
    () => ({
      clienteNro: clienteNro ?? 0,
      ot: ot ?? 0,
      tor,
      grupo: grupoParam,
      tecnicoNombre,
    }),
    [clienteNro, grupoParam, ot, tecnicoNombre, tor]
  )

  const cabeceraQuery = useQuery({
    queryKey: ['cabecera-venta-registro-otwb', spParams.clienteNro, spParams.ot, spParams.tor, spParams.grupo, spParams.tecnicoNombre],
    enabled: !isManualMode && Boolean(clienteNro && ot && tor && tecnicoNombre),
    queryFn: () => fetchCabeceraVentaParaRegistroOtWb(spParams),
  })

  const cabeceraRows = useMemo(() => cabeceraQuery.data ?? [], [cabeceraQuery.data])

  const cabecera = useMemo(() => {
    return cabeceraRows[0] ?? null
  }, [cabeceraRows])

  const otDetailQuery = useQuery({
    queryKey: ['ot-por-numero', otRaw],
    queryFn: () => fetchOtByNumero(otRaw),
    enabled: !isManualMode && Boolean(otRaw) && cabeceraQuery.isFetched && (cabeceraQuery.isError || cabeceraRows.length === 0),
    retry: false,
  })
  const otDetailRow = otDetailQuery.data ?? null

  const resolvedRows = useMemo<UnknownRecord[]>(() => {
    const rows: UnknownRecord[] = []
    if (cabeceraRows.length > 0) rows.push(...cabeceraRows)
    if (otDetailRow) rows.push(otDetailRow)
    if (rowData) rows.push(rowData)
    return rows
  }, [cabeceraRows, otDetailRow, rowData])

  const manualRouteResolution = useMemo(() => {
    if (!isManualMode) {
      return { id: null as number | null, total: 0, hasMultiple: false }
    }
    const rows = (rutasQuery.data ?? []) as UnknownRecord[]
    const ids = new Set<number>()
    for (const row of rows) {
      const id =
        readNumber(row, ['idRuta', 'id_ruta', 'Id_Ruta', 'IdRuta', 'idGrupo', 'id_grupo', 'Id_Grupo', 'IdGrupo', 'id', 'Id']) ??
        readNumberByToken(row, ['id', 'ruta']) ??
        readNumberByToken(row, ['id', 'grupo'])
      if (id !== null && id > 0) {
        ids.add(id)
      }
    }
    const resolvedIds = Array.from(ids)
    if (resolvedIds.length === 1) {
      return { id: resolvedIds[0], total: 1, hasMultiple: false }
    }
    return { id: null as number | null, total: resolvedIds.length, hasMultiple: resolvedIds.length > 1 }
  }, [isManualMode, rutasQuery.data])

  const fallbackIdRutaDesdeCatalogo = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const rutasRows = (rutasQuery.data ?? []) as UnknownRecord[]
    const direct = findNumberInRows(rutasRows, ['idRuta', 'id_ruta', 'Id_Ruta', 'IdRuta', 'idGrupo', 'id_grupo', 'Id_Grupo', 'IdGrupo'])
    if (direct !== null) return direct
    return findNumberInRowsByToken(rutasRows, ['id', 'ruta'])
  }, [isManualMode, manualRouteResolution.id, rutasQuery.data])

  const hiddenIdVendedor = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_vendedor', 'Id_Vendedor', 'idVendedor', 'IdVendedor'])
    return cabeceraValue ?? navIdVendedor ?? null
  }, [navIdVendedor, resolvedRows])
  const hiddenIdRuta = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_ruta', 'Id_Ruta', 'idRuta', 'IdRuta'])
    return cabeceraValue ?? navIdRuta ?? fallbackIdRutaDesdeCatalogo ?? null
  }, [fallbackIdRutaDesdeCatalogo, isManualMode, manualRouteResolution.id, navIdRuta, resolvedRows])
  const hiddenIdGrupo = useMemo(() => {
    if (isManualMode) return manualRouteResolution.id
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_grupo', 'Id_Grupo', 'idGrupo', 'IdGrupo'])
    return cabeceraValue ?? hiddenIdRuta ?? navIdRuta ?? fallbackIdRutaDesdeCatalogo ?? null
  }, [fallbackIdRutaDesdeCatalogo, hiddenIdRuta, isManualMode, manualRouteResolution.id, navIdRuta, resolvedRows])
  const hiddenIdTipoServicioFromData = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, [...TIPO_SERVICIO_ID_KEYS])
    if (cabeceraValue !== null) return cabeceraValue
    const tokenValue = findNumberInRowsByToken(resolvedRows, ['id', 'tipo', 'servicio'])
    return tokenValue ?? navIdTipoServicio ?? null
  }, [navIdTipoServicio, resolvedRows])
  const hiddenIdSucursal = useMemo(() => {
    const cabeceraValue = findNumberInRows(resolvedRows, ['id_sucursal', 'Id_Sucursal', 'idSucursal', 'IdSucursal'])
    return firstPositiveNumber(cabeceraValue, navIdSucursal, session?.idSucursal, getSessionSucursalId())
  }, [navIdSucursal, resolvedRows, session?.idSucursal])
  const latitudFallback = useMemo(
    () => findNumberInRows(resolvedRows, ['latitud', 'Latitud', 'latitud_georef', 'lat', 'latitude', 'Latitude']),
    [resolvedRows]
  )
  const longitudFallback = useMemo(
    () => findNumberInRows(resolvedRows, ['longitud', 'Longitud', 'longitud_georef', 'lon', 'lng', 'longitude', 'Longitude']),
    [resolvedRows]
  )
  const latitudVisible = latitud ?? latitudFallback
  const longitudVisible = longitud ?? longitudFallback
  const currentGeoPoint = latitudVisible !== null && longitudVisible !== null ? { latitud: latitudVisible, longitud: longitudVisible } : null
  const ventaGeoPoint = latitudVenta !== null && longitudVenta !== null ? { latitud: latitudVenta, longitud: longitudVenta } : null

  useEffect(() => {
    if (ventaLocationTouched) return
    if (latitudVisible === null || longitudVisible === null) return
    setLatitudVenta(latitudVisible)
    setLongitudVenta(longitudVisible)
  }, [latitudVisible, longitudVisible, ventaLocationTouched])

  const manualRouteIssue = useMemo(() => {
    if (!isManualMode) return null
    if (rutasQuery.isLoading) return null
    if (manualRouteResolution.hasMultiple) {
      return 'No se puede registrar en modo Manual: el usuario tiene mas de un grupo/ruta asociado.'
    }
    if (manualRouteResolution.total === 0) {
      return 'No se encontro grupo/ruta para el usuario en tbl_ruta.'
    }
    return null
  }, [isManualMode, manualRouteResolution.hasMultiple, manualRouteResolution.total, rutasQuery.isLoading])

  const tecnicoVisible = useMemo(() => {
    if (!cabecera) return tecnicoNombre
    return readString(cabecera, ['nombre', 'Nombre', 'tecnico', 'Tecnico', 'nombreTecnico', 'NombreTecnico']).trim() || tecnicoNombre
  }, [cabecera, tecnicoNombre])

  const grupoVisible = useMemo(() => {
    if (!cabecera) return grupoParam
    const direct = readString(cabecera, ['nombregrupo', 'NombreGrupo', 'nombreruta', 'NombreRuta', 'ruta', 'Ruta', 'grupo', 'Grupo']).trim()
    if (direct) return direct
    const byToken = readStringByToken(cabecera, ['grupo', 'ruta', 'cuadrilla', 'nombre'])
    return byToken || grupoParam
  }, [cabecera, grupoParam])

  const otVisible = useMemo(() => {
    if (!cabecera) return ot ? String(ot) : ''
    const value = readNumber(cabecera, ['ot', 'OT', 'ordenTrabajo', 'OrdenTrabajo'])
    return value !== null ? String(value) : ot ? String(ot) : ''
  }, [cabecera, ot])
  const otInputValue = isManualMode ? otManualInput : otVisible

  const clienteVisible = useMemo(() => {
    if (!cabecera) return clienteNro ? String(clienteNro) : ''
    const value = readNumber(cabecera, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'ClienteNro'])
    return value !== null ? String(value) : clienteNro ? String(clienteNro) : ''
  }, [cabecera, clienteNro])

  const fechaAgenda = useMemo(() => {
    const rows = [cabecera, rowData].filter(Boolean) as UnknownRecord[]
    for (const row of rows) {
      const value = readString(row, [
        'inicio_agendado',
        'Inicio_Agendado',
        'InicioAgendado',
        'fechaAgenda',
        'FechaAgenda',
        'Fecha_Agenda',
        'fecha_agenda',
        'fecha',
        'Fecha',
        'Fecha_Ejecucion',
        'fecha_ejecucion',
      ]).trim()
      if (value) return value
    }
    return ''
  }, [cabecera, rowData])

  const clienteInputValue = isManualMode ? clienteManualInput : clienteVisible

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-registro-ot'],
    queryFn: fetchSucursales,
  })

  const sucursalVisible = useMemo(() => {
    for (const row of resolvedRows) {
      const fromSucursal = readString(row, ['sucursal', 'Sucursal']).trim()
      if (fromSucursal) return fromSucursal
    }
    const sucursalCatalogo = (sucursalesQuery.data?.data ?? []).find(
      (item) => item.idSucursal === hiddenIdSucursal
    )
    if (sucursalCatalogo?.sucursal?.trim()) return sucursalCatalogo.sucursal.trim()
    return ''
  }, [hiddenIdSucursal, resolvedRows, sucursalesQuery.data])

  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio-agenda'],
    queryFn: fetchTiposServicio,
  })

  const tipoServicioOptions = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    return rows
      .map((row) => {
        const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
        if (id === null) return null
        const prefijo = readString(row, ['prefijo', 'Prefijo', 'tor', 'TOR', 'codigo', 'Codigo', 'abreviatura', 'Abreviatura', 'sigla', 'Sigla']).trim()
        const descripcion = readString(row, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
        const labelBase = descripcion || `Tipo ${id}`
        const yaIncluyePrefijo = prefijo ? hasEquivalentParentheticalToken(labelBase, prefijo) : false
        const label = prefijo && !yaIncluyePrefijo ? `${labelBase} (${prefijo})` : labelBase
        return { value: String(id), label: normalizeTipoServicioLabel(label) }
      })
      .filter((item): item is { value: string; label: string } => Boolean(item))
  }, [tiposServicioQuery.data])

  const hiddenIdTipoServicio = useMemo(() => {
    if (hiddenIdTipoServicioFromData !== null) return hiddenIdTipoServicioFromData
    const rows = tiposServicioQuery.data ?? []
    const target = tor.trim().toLowerCase()
    if (!target) return null

    const matchByPrefijo = rows.find(
      (row) =>
        readString(row, ['prefijo', 'Prefijo', 'tor', 'TOR', 'codigo', 'Codigo', 'abreviatura', 'Abreviatura', 'sigla', 'Sigla'])
          .trim()
          .toLowerCase() === target
    )
    if (matchByPrefijo) {
      const id = readNumber(matchByPrefijo, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    const matchByTor = rows.find((row) => readString(row, ['tor', 'TOR']).trim().toLowerCase() === target)
    if (matchByTor) {
      const id = readNumber(matchByTor, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    const matchByDescriptionToken = rows.find((row) => {
      const descripcion = readString(row, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
        .trim()
        .toLowerCase()
      if (!descripcion) return false
      const tokens = descripcion.split(/[^a-z0-9]+/g).filter(Boolean)
      return tokens.includes(target)
    })
    if (matchByDescriptionToken) {
      const id = readNumber(matchByDescriptionToken, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      if (id !== null) return id
    }

    return null
  }, [hiddenIdTipoServicioFromData, tiposServicioQuery.data, tor])

  const parsedTipoServicioManual = parseNumber(idTipoServicioManual)
  const effectiveIdTipoServicio = isManualMode ? parsedTipoServicioManual : (hiddenIdTipoServicio ?? parsedTipoServicioManual)
  const effectiveTor = useMemo(() => {
    const torFromNavigation = tor.trim().toUpperCase()
    if (torFromNavigation) return torFromNavigation
    if (!isManualMode || effectiveIdTipoServicio === null) return ''

    const selected = (tiposServicioQuery.data ?? []).find((row) => {
      const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      return id !== null && id === effectiveIdTipoServicio
    })
    return readString(selected ?? {}, [
      'prefijo',
      'Prefijo',
      'tor',
      'TOR',
      'codigo',
      'Codigo',
      'abreviatura',
      'Abreviatura',
      'sigla',
      'Sigla',
    ])
      .trim()
      .toUpperCase()
  }, [effectiveIdTipoServicio, isManualMode, tiposServicioQuery.data, tor])
  const isTorSip = effectiveTor.trim().toUpperCase() === 'SIP'

  const estadoOrigen = useMemo(() => {
    const fromState = (navState?.estado ?? '').trim()
    if (fromState) return fromState
    if (!rowData) return ''
    const fromRow = readString(rowData, [
      'estado',
      'Estado',
      'estadoCierre',
      'EstadoCierre',
      'nombre_estado',
      'estadoNombre',
      'descripcionEstado',
      'DescripcionEstado',
    ]).trim()
    return fromRow
  }, [navState?.estado, rowData])
  const shouldAutoMapEstadoFallidaConVisita = useMemo(() => {
    const normalized = normalizeText(estadoOrigen)
    return normalized.includes('fallida') && normalized.includes('visita')
  }, [estadoOrigen])

  const tipoServicioLabel = useMemo(() => {
    if (isManualMode && effectiveIdTipoServicio !== null) {
      const selectedManual = tipoServicioOptions.find((option) => Number(option.value) === effectiveIdTipoServicio)
      if (selectedManual?.label?.trim()) {
        return normalizeTipoServicioLabel(selectedManual.label.trim())
      }
    }
    const rows = tiposServicioQuery.data ?? []
    const target = tor.trim().toLowerCase()
    if (!target) return ''
    const match =
      rows.find((row) => readString(row, ['prefijo', 'Prefijo']).trim().toLowerCase() === target) ??
      rows.find((row) => {
        const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS])
        return id !== null && hiddenIdTipoServicio !== null && id === hiddenIdTipoServicio
      }) ??
      null
    if (!match) return tor
    const desc = readString(match, ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
    return normalizeTipoServicioLabel(desc ? `${desc} (${tor})` : tor)
  }, [effectiveIdTipoServicio, hiddenIdTipoServicio, isManualMode, tipoServicioOptions, tiposServicioQuery.data, tor])
  const isTipoAsistencia = useMemo(() => {
    if (isTorSip) return false
    const normalized = normalizeText(tipoServicioLabel)
    return normalized.includes('asistencia')
  }, [isTorSip, tipoServicioLabel])

  const tieneDetalleSuggested = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    const selectedId = effectiveIdTipoServicio
    if (selectedId === null) return false
    const selected = rows.find((row) => {
      const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      return id !== null && id === selectedId
    })
    if (!selected) return false
    const raw = readValue(selected, ['habilitarTieneDetalle', 'HabilitarTieneDetalle', 'habilitar_tiene_detalle'])
    return readBooleanFlag(raw)
  }, [effectiveIdTipoServicio, tiposServicioQuery.data])

  const canUseMaterialCheck = useMemo(() => {
    if (isTorSip) return false
    const rows = tiposServicioQuery.data ?? []
    const selectedId = effectiveIdTipoServicio
    if (selectedId === null) return false
    const selected = rows.find((row) => {
      const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      return id !== null && id === selectedId
    })
    if (!selected) return false
    const raw = readValue(selected, [
      'checkSeUsoMaterial',
      'CheckSeUsoMaterial',
      'check_se_uso_material',
      'checkSeUsoMaterial_PROTW',
      'CheckSeUsoMaterial_PROTW',
      'checkmaterial',
      'CheckMaterial',
    ])
    const parsed = readOptionalBooleanFlag(raw)
    return parsed ?? true
  }, [effectiveIdTipoServicio, isTorSip, tiposServicioQuery.data])

  const tipoArchivoProtw = useMemo(() => {
    const rows = tiposServicioQuery.data ?? []
    const selectedId = effectiveIdTipoServicio
    if (selectedId === null) return 'PDF' as const
    const selected = rows.find((row) => {
      const id = readNumber(row, [...TIPO_SERVICIO_ID_KEYS, 'id', 'Id'])
      return id !== null && id === selectedId
    })
    return normalizeTipoArchivo(readValue(selected ?? {}, ['tipoArchivoPROTW', 'TipoArchivo_PROTW', 'tipoarchivo_protw', 'TipoArchivoPROTW']))
  }, [effectiveIdTipoServicio, tiposServicioQuery.data])
  const archivoAdjuntoLabel = tipoArchivoProtw === 'IMAGEN' ? 'imagen' : 'PDF'
  const archivoAdjuntoAccept = tipoArchivoProtw === 'IMAGEN' ? '.jpg,.jpeg,.png,image/*' : '.pdf,application/pdf'

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-agenda'],
    queryFn: fetchEstados,
  })
  const ramalesQuery = useQuery({
    queryKey: ['catalogos-ramales-agenda'],
    queryFn: fetchRamales,
  })

  useEffect(() => {
    setPdfFile(null)
  }, [tipoArchivoProtw])

  const tiposTecnologiaQuery = useQuery({
    queryKey: ['catalogos-tipo-tecnologia-agenda', hiddenIdRuta ?? null],
    queryFn: () => fetchTiposTecnologia(hiddenIdRuta as number),
    enabled: typeof hiddenIdRuta === 'number' && hiddenIdRuta > 0,
  })

  const estadoOptions = useMemo(
    () =>
      mapOptions(
        estadosQuery.data ?? [],
        ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'],
        ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [estadosQuery.data]
  )
  const ramalOptions = useMemo(() => {
    const rows = ramalesQuery.data ?? []
    const values = new Set<string>()
    for (const row of rows) {
      const value = readString(row, ['ramal', 'Ramal', 'nombre', 'Nombre', 'descripcion', 'Descripcion']).trim()
      if (value) values.add(value)
    }
    return Array.from(values)
  }, [ramalesQuery.data])
  const tipoTecnologiaOptions = useMemo(() => {
    const rows = (tiposTecnologiaQuery.data ?? []) as UnknownRecord[]
    const values = new Set<string>()
    for (const row of rows) {
      const direct = normalizeTipoTecnologia(
        readValue(row, ['tipoTecnologia', 'TipoTecnologia', 'tipo_tecnologia', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
      )
      if (direct) {
        values.add(direct)
      }
    }
    return Array.from(values)
  }, [tiposTecnologiaQuery.data])
  const blockedEstadoIds = useMemo(() => {
    const ids = new Set<string>()
    for (const option of estadoOptions) {
      if (isEstadoCerradoFinalizadoOk(option.label)) {
        ids.add(option.value)
      }
    }
    return ids
  }, [estadoOptions])
  const isBlockedEstadoSelected = Boolean(idEstado && blockedEstadoIds.has(idEstado))
  const shouldBlockFinalizadoOkForCurrentOt = shouldAutoMapEstadoFallidaConVisita
  const isBlockedEstadoForCurrentOt = shouldBlockFinalizadoOkForCurrentOt && isBlockedEstadoSelected
  const selectedEstadoLabel = useMemo(() => {
    if (!idEstado) return ''
    return estadoOptions.find((option) => option.value === idEstado)?.label ?? ''
  }, [idEstado, estadoOptions])
  const isEstadoFinalizadoOkSelected = useMemo(() => {
    if (!selectedEstadoLabel.trim()) return false
    return isEstadoCerradoFinalizadoOk(selectedEstadoLabel)
  }, [selectedEstadoLabel])
  const mustKeepTieneDetalleUnchecked = Boolean(idEstado && !isEstadoFinalizadoOkSelected)

  useEffect(() => {
    if (!shouldAutoMapEstadoFallidaConVisita) return
    if (idEstado) return
    if (!estadoOptions.length) return

    const target = estadoOptions.find((option) => {
      const label = normalizeText(option.label)
      return label.includes('cerrado') && label.includes('imposibilidad') && label.includes('tecnica')
    })
    if (!target) return
    setIdEstado(target.value)
  }, [shouldAutoMapEstadoFallidaConVisita, idEstado, estadoOptions])

  useEffect(() => {
    if (!shouldBlockFinalizadoOkForCurrentOt) return
    if (!idEstado) return
    if (!blockedEstadoIds.has(idEstado)) return
    setIdEstado('')
  }, [blockedEstadoIds, idEstado, shouldBlockFinalizadoOkForCurrentOt])

  const parsedEstadoId = parseNumber(idEstado)
  const hasRequiredIds =
    firstPositiveNumber(hiddenIdRuta) !== null &&
    firstPositiveNumber(hiddenIdGrupo) !== null &&
    firstPositiveNumber(effectiveIdTipoServicio) !== null &&
    firstPositiveNumber(hiddenIdSucursal) !== null

  const missingHeaderFields = useMemo(() => {
    const missing: string[] = []
    if (firstPositiveNumber(hiddenIdRuta) === null) {
      if (isManualMode && manualRouteResolution.hasMultiple) {
        missing.push('ruta/grupo (el usuario tiene mas de un registro en tbl_ruta)')
      } else if (isManualMode) {
        missing.push('ruta/grupo (no se encontro registro en tbl_ruta para el usuario)')
      } else {
        missing.push('ruta/grupo (idRuta/idGrupo)')
      }
    }
    if (firstPositiveNumber(effectiveIdTipoServicio) === null) missing.push('tipo de servicio (idTipoServicio)')
    if (firstPositiveNumber(hiddenIdSucursal) === null) missing.push('sucursal (idSucursal)')
    return missing
  }, [effectiveIdTipoServicio, hiddenIdRuta, hiddenIdSucursal, isManualMode, manualRouteResolution.hasMultiple])

  const tipoServicioHeaderWarning = useMemo(() => {
    if (!hasAttemptedSubmit || effectiveIdTipoServicio !== null) return null
    return isManualMode
      ? 'Debes seleccionar un tipo de servicio para continuar.'
      : 'No se pudo resolver tipo de servicio automaticamente. Selecciona uno para continuar.'
  }, [effectiveIdTipoServicio, hasAttemptedSubmit, isManualMode])

  const parsedOrdenTrabajo = parseNumber(otInputValue)
  const parsedCodigoCliente = parseNumber(clienteInputValue)
  const nodoUpper = nodo.trim().toUpperCase()
  const nodoValid = /^[A-Z]{3}\d{3,4}$/.test(nodoUpper)
  const ramalUpper = ramal.trim().toUpperCase()
  const ramalValid = ramalUpper.length > 0
  const parsedTap = parseNumber(tap)
  const tapValid = /^\d{3}$/.test(tap.trim())
  const tapDisplay = tap.trim() ? tap.trim().padStart(3, '0') : '-'
  const parsedBoca = parseNumber(boca)
  const bocaValid = parsedBoca !== null && Number.isInteger(parsedBoca) && parsedBoca >= 0 && parsedBoca <= 8
  const hasValidOrdenTrabajo = parsedOrdenTrabajo !== null && parsedOrdenTrabajo > 0
  const hasValidCodigoCliente = parsedCodigoCliente !== null && parsedCodigoCliente > 0

  const canSubmitBase = Boolean(
    session?.idUsuario &&
      hasRequiredIds &&
      parsedEstadoId !== null &&
      hasValidOrdenTrabajo &&
      hasValidCodigoCliente &&
      nodoValid &&
      ramalValid &&
      tapValid &&
      bocaValid &&
      tipoTecnologia.trim().length > 0 &&
      !isBlockedEstadoForCurrentOt
  )

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = []
    if (!session?.idUsuario) missing.push('usuario de sesion')
    if (missingHeaderFields.length > 0) missing.push(...missingHeaderFields)
    if (parsedEstadoId === null) missing.push('estado')
    if (!hasValidOrdenTrabajo) missing.push('nro orden')
    if (!hasValidCodigoCliente) missing.push('cod cliente')
    if (!nodoValid) missing.push('nodo (3 letras y 3 o 4 numeros)')
    if (!ramalValid) missing.push('ramal')
    if (!tapValid) missing.push('tap (3 digitos)')
    if (!bocaValid) missing.push('boca')
    if (!tipoTecnologia.trim()) missing.push('tipo tecnologia')
    if (!observacion.trim()) missing.push('bitacora')
    return missing
  }, [
    bocaValid,
    hasValidCodigoCliente,
    hasValidOrdenTrabajo,
    missingHeaderFields,
    nodoValid,
    parsedEstadoId,
    ramalValid,
    observacion,
    session?.idUsuario,
    tapValid,
    tipoTecnologia,
  ])

  const missingRequiredMessage = useMemo(() => {
    if (missingRequiredFields.length === 0) return null
    return `Faltan datos requeridos: ${missingRequiredFields.join(', ')}.`
  }, [missingRequiredFields])

  // Los errores se muestran únicamente después de intentar avanzar desde ese panel.
  // Así el panel siguiente no aparece marcado en rojo al abrirlo.
  const shouldShowValidation = validatedSteps.has(formStep)
  const tipoServicioInvalid = shouldShowValidation && firstPositiveNumber(effectiveIdTipoServicio) === null
  const estadoInvalid = shouldShowValidation && parsedEstadoId === null
  const otInvalid = shouldShowValidation && !hasValidOrdenTrabajo
  const clienteInvalid = shouldShowValidation && !hasValidCodigoCliente
  const nodoInvalid = shouldShowValidation && !nodoValid
  const ramalInvalid = shouldShowValidation && !ramalValid
  const tapInvalid = shouldShowValidation && !tapValid
  const bocaInvalid = shouldShowValidation && !bocaValid
  const tipoTecnologiaInvalid = shouldShowValidation && !tipoTecnologia.trim()
  const observacionInvalid = shouldShowValidation && !observacion.trim()
  const archivoInvalid = shouldShowValidation && !pdfFile

  const handleNodoBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (isTouchLikeDevice()) return
    if (!nodoValid) {
      const input = event.currentTarget
      window.setTimeout(() => {
        if (input && document.body.contains(input)) {
          input.focus()
        }
      }, 0)
    }
  }

  const handleTapBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (isTouchLikeDevice()) return
    if (!tapValid) {
      const input = event.currentTarget
      window.setTimeout(() => {
        if (input && document.body.contains(input)) {
          input.focus()
        }
      }, 0)
    }
  }

  const focusFirstInvalidField = () => {
    const target =
      (tipoServicioInvalid ? tipoServicioRef.current : null) ??
      (estadoInvalid ? estadoRef.current : null) ??
      (otInvalid ? otRef.current : null) ??
      (clienteInvalid ? clienteRef.current : null) ??
      (tipoTecnologiaInvalid ? tipoTecnologiaRef.current : null) ??
      (nodoInvalid ? nodoRef.current : null) ??
      (ramalInvalid ? ramalRef.current : null) ??
      (tapInvalid ? tapRef.current : null) ??
      (bocaInvalid ? bocaRef.current : null) ??
      (observacionInvalid ? observacionRef.current : null) ??
      (archivoInvalid ? archivoRef.current : null)
    window.setTimeout(() => {
      target?.focus()
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }

  useEffect(() => {
    setTieneDetalle(canUseMaterialCheck ? tieneDetalleSuggested : false)
  }, [canUseMaterialCheck, tieneDetalleSuggested])

  useEffect(() => {
    if (isTipoAsistencia) return
    if (!checkPlantaExterna) return
    setCheckPlantaExterna(false)
  }, [checkPlantaExterna, isTipoAsistencia])

  useEffect(() => {
    if (!tipoTecnologiaOptions.length) return
    if (tipoTecnologiaOptions.includes(tipoTecnologia)) return
    setTipoTecnologia(tipoTecnologiaOptions[0])
  }, [tipoTecnologia, tipoTecnologiaOptions])

  const requestGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (isGeoBypassMachine) {
        setGeoError(null)
        setLatitud(0)
        setLongitud(0)
        setGeoAccuracy(0)
        return
      }
      setGeoError('Tu navegador no soporta geolocalizacion.')
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      return
    }

    setGeoLoading(true)
    setGeoError(null)
    setGeoAccuracy(null)

    const samples: GeoSample[] = []
    const startedAt = Date.now()
    let finished = false
    let watchId: number | null = null
    let stopTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (stopTimer) clearTimeout(stopTimer)
    }

    const failWithError = (error: GeolocationPositionError) => {
      if (finished) return
      finished = true
      cleanup()
      setGeoLoading(false)
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      if (isGeoBypassMachine) {
        setGeoError(null)
        return
      }
      if (error.code === 1) {
        setGeoError('Permiso de ubicacion denegado. Debes habilitarlo para registrar OT.')
        return
      }
      if (error.code === 2) {
        setGeoError('No se pudo determinar la ubicacion.')
        return
      }
      if (error.code === 3) {
        setGeoError('Tiempo de espera agotado al obtener ubicacion.')
        return
      }
      setGeoError('No se pudo obtener latitud/longitud.')
    }

    const finishWithBestSample = () => {
      if (finished) return
      finished = true
      cleanup()

      const best = pickBestGeoSample(samples)
      if (!best) {
        setGeoLoading(false)
        setLatitud(null)
        setLongitud(null)
        setGeoAccuracy(null)
        setGeoError('No se pudo obtener una lectura valida de ubicacion.')
        return
      }

      setLatitud(best.latitude)
      setLongitud(best.longitude)
      setGeoAccuracy(best.accuracy)
      setGeoLoading(false)
      setGeoError(null)
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        samples.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })

        const best = pickBestGeoSample(samples)
        if (best) {
          setLatitud(best.latitude)
          setLongitud(best.longitude)
          setGeoAccuracy(best.accuracy)
        }

        const elapsed = Date.now() - startedAt
        const reachedTarget = best !== null && best.accuracy <= GEO_TARGET_ACCURACY_METERS
        const enoughSamples = samples.length >= GEO_MIN_SAMPLES
        const timeoutReached = elapsed >= GEO_MAX_CAPTURE_MS
        const sampleCapReached = samples.length >= GEO_MAX_SAMPLES

        if ((reachedTarget && enoughSamples) || timeoutReached || sampleCapReached) {
          finishWithBestSample()
        }
      },
      failWithError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    stopTimer = setTimeout(() => {
      finishWithBestSample()
    }, GEO_MAX_CAPTURE_MS + 2000)
  }

  const calibrateGeolocationForSubmit = (): Promise<GeoSample | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (isGeoBypassMachine) {
        setGeoError(null)
        setLatitud(0)
        setLongitud(0)
        setGeoAccuracy(0)
        return Promise.resolve({ latitude: 0, longitude: 0, accuracy: 0 })
      }
      setGeoError('Tu navegador no soporta geolocalizacion.')
      setLatitud(null)
      setLongitud(null)
      setGeoAccuracy(null)
      return Promise.resolve(null)
    }

    setGeoLoading(true)
    setGeoError(null)
    setGeoAccuracy(null)

    return new Promise((resolve) => {
      const samples: GeoSample[] = []
      const startedAt = Date.now()
      let finished = false
      let watchId: number | null = null
      let stopTimer: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (stopTimer) clearTimeout(stopTimer)
      }

      const failWithError = (error: GeolocationPositionError) => {
        if (finished) return
        finished = true
        cleanup()
        setGeoLoading(false)
        setLatitud(null)
        setLongitud(null)
        setGeoAccuracy(null)
        if (isGeoBypassMachine) {
          setGeoError(null)
          resolve({ latitude: 0, longitude: 0, accuracy: 0 })
          return
        }
        if (error.code === 1) {
          setGeoError('Permiso de ubicacion denegado. Debes habilitarlo para registrar OT.')
          resolve(null)
          return
        }
        if (error.code === 2) {
          setGeoError('No se pudo determinar la ubicacion.')
          resolve(null)
          return
        }
        if (error.code === 3) {
          setGeoError('Tiempo de espera agotado al obtener ubicacion.')
          resolve(null)
          return
        }
        setGeoError('No se pudo obtener latitud/longitud.')
        resolve(null)
      }

      const finishWithBestSample = () => {
        if (finished) return
        finished = true
        cleanup()

        const best = pickBestGeoSample(samples)
        if (!best) {
          setGeoLoading(false)
          setLatitud(null)
          setLongitud(null)
          setGeoAccuracy(null)
          if (isGeoBypassMachine) {
            setGeoError(null)
            resolve({ latitude: 0, longitude: 0, accuracy: 0 })
            return
          }
          setGeoError('No se pudo obtener una lectura valida de ubicacion.')
          resolve(null)
          return
        }

        setLatitud(best.latitude)
        setLongitud(best.longitude)
        setGeoAccuracy(best.accuracy)
        setGeoLoading(false)
        setGeoError(null)
        resolve(best)
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          samples.push({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })

          const best = pickBestGeoSample(samples)
          if (best) {
            setLatitud(best.latitude)
            setLongitud(best.longitude)
            setGeoAccuracy(best.accuracy)
          }

          const elapsed = Date.now() - startedAt
          const reachedTarget = best !== null && best.accuracy <= GEO_TARGET_ACCURACY_METERS
          const enoughSamples = samples.length >= GEO_MIN_SAMPLES
          const timeoutReached = elapsed >= GEO_MAX_CAPTURE_MS
          const sampleCapReached = samples.length >= GEO_MAX_SAMPLES

          if ((reachedTarget && enoughSamples) || timeoutReached || sampleCapReached) {
            finishWithBestSample()
          }
        },
        failWithError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )

      stopTimer = setTimeout(() => {
        finishWithBestSample()
      }, GEO_MAX_CAPTURE_MS + 2000)
    })
  }

  useEffect(() => {
    void requestGeolocation()
  }, [])

  useEffect(() => {
    if (!session?.sessionToken) return
    const needsSessionRefresh =
      !session.hostName ||
      !session.idUsuario ||
      session.idUsuario <= 0 ||
      !session.nombre?.trim() ||
      !session.idSucursal ||
      session.idSucursal <= 0
    if (!needsSessionRefresh) return
    let cancelled = false

    void fetchMe(session.sessionToken)
      .then((me) => {
        if (cancelled || !me) return
        const nextHostName = me.hostName || session.hostName
        const nextIdUsuario = typeof me.idUsuario === 'number' && Number.isFinite(me.idUsuario) && me.idUsuario > 0 ? me.idUsuario : session.idUsuario
        const nextNombre = me.nombre || session.nombre
        const nextRol = me.rol || session.rol
        const nextIdRol = typeof me.idRol === 'number' && Number.isFinite(me.idRol) ? me.idRol : session.idRol
        const nextIdSucursal =
          typeof me.idSucursal === 'number' && Number.isFinite(me.idSucursal) && me.idSucursal > 0 ? me.idSucursal : session.idSucursal
        const noChanges =
          nextHostName === session.hostName &&
          nextIdUsuario === session.idUsuario &&
          nextNombre === session.nombre &&
          nextRol === session.rol &&
          nextIdRol === session.idRol &&
          nextIdSucursal === session.idSucursal
        if (noChanges) return
        useSessionStore.getState().setSession({
          ...session,
          hostName: nextHostName,
          idUsuario: nextIdUsuario,
          nombre: nextNombre,
          rol: nextRol,
          idRol: nextIdRol,
          idSucursal: nextIdSucursal,
        })
      })
      .catch(() => {
        // Si falla, seguimos con la validacion normal.
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const mutation = useMutation({
    mutationFn: async (coordinates?: { latitud: number; longitud: number; latitudVenta: number; longitudVenta: number }) => {
      let nombreFinal = (tecnicoVisible ?? '').trim()
      if (!nombreFinal) {
        nombreFinal = (session?.nombre ?? '').trim()
      }
      if (!nombreFinal && session?.sessionToken) {
        try {
          const me = await fetchMe(session.sessionToken)
          nombreFinal = (me?.nombre ?? '').trim()
        } catch {
          // Se maneja validacion final abajo.
        }
      }
      if (!nombreFinal) {
        throw new Error('No se pudo resolver el nombre del tecnico desde la sesion actual.')
      }
      if (!nodoValid || !ramalValid || parsedTap === null || !tapValid || parsedBoca === null || !bocaValid || !tipoTecnologia.trim()) {
        throw new Error('Faltan datos tecnicos requeridos: nodo, ramal, tap, boca o tipo tecnologia.')
      }

      const ordenTrabajo = parsedOrdenTrabajo ?? 0
      const codigoCliente = parsedCodigoCliente ?? 0
      const idSucursalPayload = firstPositiveNumber(hiddenIdSucursal)
      if (idSucursalPayload === null) {
        throw new Error('No se pudo resolver idSucursal valido desde la sesion o cabecera.')
      }
      const payload = {
        idUsuario: session?.idUsuario ?? 0,
        idVendedor: hiddenIdVendedor ?? 0,
        idGrupo: hiddenIdGrupo ?? 0,
        idTipoServicio: effectiveIdTipoServicio ?? 0,
        ordenTrabajo,
        idEstado: parsedEstadoId ?? 0,
        codigoCliente,
        idSucursal: idSucursalPayload,
        nombre: nombreFinal,
        origen: origenRegistro,
        observacion: observacion.trim(),
        total: 0,
        idUsuarioE: 0,
        eEliminado: false,
        tieneObservacion: Boolean(observacion.trim()),
        latitud: coordinates?.latitud ?? latitud ?? 0,
        longitud: coordinates?.longitud ?? longitud ?? 0,
        latitudVenta: coordinates?.latitudVenta ?? latitudVenta ?? 0,
        longitudVenta: coordinates?.longitudVenta ?? longitudVenta ?? 0,
        latitud_venta: coordinates?.latitudVenta ?? latitudVenta ?? 0,
        longitud_venta: coordinates?.longitudVenta ?? longitudVenta ?? 0,
        nodo: nodoUpper,
        ramal: ramal.trim(),
        tap: parsedTap,
        boca: parsedBoca,
        checkPlantaExterna: isTorSip ? false : Boolean(checkPlantaExterna),
        tieneDetalle: Boolean(tieneDetalle),
        tipoTecnologia: tipoTecnologia.trim().toUpperCase(),
        fechaAgenda: toIsoDateParam(fechaAgenda || todayISO()) || todayISO(),
        inicioAgendado: toIsoDateParam(fechaAgenda || todayISO()) || todayISO(),
        inicio_agendado: toIsoDateParam(fechaAgenda || todayISO()) || todayISO(),
      }
      return await registrarVentaParaRegistroOtWb(payload, pdfFile)
    },
    onSuccess: async (data) => {
      const idVenta = data?.data?.idVenta
      const orden = data?.data?.ordenTrabajo
      const torNormalizado = effectiveTor
      let corteTapMessage = ''
      if (torNormalizado === 'TE' || torNormalizado === 'SE') {
        try {
          const idTecnico = hiddenIdVendedor ?? 0
          const codigoClienteCorte = clienteInputValue.trim()
          const sucursalCorte = sucursalVisible
          await crearCorteTap({
            codigoCliente: codigoClienteCorte,
            tor: torNormalizado,
            idTecnico,
            tecnico: tecnicoVisible,
            sucursal: sucursalCorte,
            nodoTapBoca: `NODO ${nodoUpper} RAMAL ${ramalUpper} ${tapDisplay} BOCA ${parsedBoca}`,
          })
          corteTapMessage = ' | Corte TAP creado.'
          await queryClient.invalidateQueries({ queryKey: ['ot-dashboard-cortes-tap'], refetchType: 'all' })
        } catch (error) {
          corteTapMessage = ` | OT registrada, pero no se pudo crear Corte TAP: ${getApiErrorMessage(error)}`
        }
      }
      setSubmitError(null)
      setRegistroGuardado(true)
      setConfirmModalOpen(false)
      const rutaPdf = data?.data?.rutaPdf
      const message = idVenta || orden ? `Registro exitoso. NroTrans.: ${idVenta ?? '-'} | OT: ${orden ?? '-'}` : 'Registro exitoso.'
      const messageFinal = `${rutaPdf ? `${message} | PDF: ${rutaPdf}` : message}${corteTapMessage}`
      setSuccess(messageFinal)
      setSuccessModalMessage(messageFinal)
      setSuccessModalOpen(true)
      setDuplicateOrdenModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista-finalizadas'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista-manuales-pendientes'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-venta'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-bloqueo-registro'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-cierre-agenda'], refetchType: 'all' })
    },
    onError: (error) => {
      setSuccess(null)
      setSuccessModalOpen(false)
      setSuccessModalMessage('')
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const backendMessage = status === 502
        ? buildDetailedApiError(error, 'Error 502 al registrar OT. El servidor no respondio a tiempo (proxy/backend).')
        : buildDetailedApiError(error, 'No se pudo guardar la OT. Revisa los datos de cabecera y estado.')
      setSubmitError(backendMessage)
      setSubmitErrorModalOpen(true)
      setDuplicateOrdenModalOpen(isDuplicateOrdenError(backendMessage))
    },
  })

  const handleBackToDashboard = () => {
    const refreshToken = Date.now()
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(OT_DASHBOARD_FORCE_REFRESH_KEY, String(refreshToken))
    }
    navigate('/GestionOTs', {
      replace: true,
      state: { refreshToken },
    })
  }

  const handleSuccessModalAccept = () => {
    setSuccessModalOpen(false)
    handleBackToDashboard()
  }

  const runPreRegisterValidations = async (): Promise<boolean> => {
    const routeId = hiddenIdRuta ?? hiddenIdGrupo ?? null
    const executionDate = formatDateDDMMYYYY(new Date())

    if (routeId === null || routeId <= 0) {
      setSubmitError('No se pudo resolver la ruta/grupo para validar cierre y cuadre antes del registro.')
      return false
    }

    setIsPrevalidating(true)
    try {
      const [cierreAgenda, hasCuadreRuta] = await Promise.all([
        validateExisteCierreAlmacen({
          fecha: executionDate,
          idSucursal: hiddenIdSucursal ?? undefined,
        }),
        validateCuadreRuta({
          idRuta: routeId,
          fecha: executionDate,
          idSucursal: hiddenIdSucursal ?? undefined,
        }),
      ])

      if (cierreAgenda.bloqueado) {
        setSubmitError(cierreAgenda.mensaje || 'No se puede registrar la OT porque existe cierre de almacen.')
        return false
      }

      if (hasCuadreRuta) {
        setSubmitError('No se puede registrar la OT porque la ruta ya realizo cuadre.')
        return false
      }

      return true
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSubmitError(error.response?.data?.message ?? 'No se pudo validar cierre/cuadre antes del registro.')
      } else {
        setSubmitError('No se pudo validar cierre/cuadre antes del registro.')
      }
      return false
    } finally {
      setIsPrevalidating(false)
    }
  }

  const validateReadyToRegister = (sample: GeoSample | null): boolean => {
    if (!sample) {
      if (isGeoBypassMachine) {
        return true
      }
      setSubmitError('Debes capturar ubicacion antes de registrar la OT.')
      return false
    }
    if (!canSubmitBase) {
      setSubmitError(missingRequiredMessage ?? 'Faltan datos requeridos para registrar la OT.')
      return false
    }
    if (!pdfFile) {
      setSubmitError(`Debes adjuntar el archivo ${archivoAdjuntoLabel} para registrar la OT.`)
      return false
    }
    if (!ventaLocationTouched && !isGeoBypassMachine) {
      setSubmitError('Debes confirmar la ubicacion de la venta en el mapa.')
      return false
    }
    if (latitudVenta === null || longitudVenta === null) {
      setSubmitError('Debes seleccionar la ubicacion de la venta en el mapa.')
      return false
    }
    return true
  }

  const runCalibrationAndSubmit = async () => {
    if (calibrationBusy || mutation.isPending || isPrevalidating || registroGuardado) return

    setSubmitError(null)
    setSuccess(null)
    setDuplicateOrdenModalOpen(false)
    setConfirmModalOpen(false)
    setCalibrationModalOpen(true)
    setCalibrationBusy(true)
    setCalibrationMessage('Calibrando GPS con alta precision. No cierres esta ventana...')

    try {
      const canContinue = await runPreRegisterValidations()
      if (!canContinue) return

      const best = await calibrateGeolocationForSubmit()
      const coordinates = best ?? (isGeoBypassMachine ? { latitude: 0, longitude: 0, accuracy: 0 } : null)
      if (!coordinates) {
        setSubmitError('Debes capturar ubicacion antes de registrar la OT.')
        return
      }
      if (!validateReadyToRegister(coordinates)) return
      const ventaCoordinates = {
        latitud: ventaLocationTouched ? latitudVenta ?? coordinates.latitude : coordinates.latitude,
        longitud: ventaLocationTouched ? longitudVenta ?? coordinates.longitude : coordinates.longitude,
      }
      setCalibrationMessage('Ubicacion calibrada. Registrando OT...')
      await mutation.mutateAsync({
        latitud: coordinates.latitude,
        longitud: coordinates.longitude,
        latitudVenta: ventaCoordinates.latitud,
        longitudVenta: ventaCoordinates.longitud,
      })
    } finally {
      setCalibrationBusy(false)
      setCalibrationModalOpen(false)
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    setSubmitError(null)
    setSubmitErrorModalOpen(false)
    setSuccess(null)
    if (registroGuardado) {
      setSubmitError('La OT ya fue registrada. No se permite guardar nuevamente.')
      setSubmitErrorModalOpen(true)
      return
    }
    if (!canSubmitBase) {
      if (isManualMode) {
        setValidatedSteps(new Set([0, 1, 2, 3]))
        setSubmitError(null)
        setSubmitErrorModalOpen(false)
        focusFirstInvalidField()
        return
      }
      if (isBlockedEstadoForCurrentOt) {
        setSubmitError(
          `No se permite guardar con estado "${selectedEstadoLabel || 'CERRADO - FINALIZADO OK'}"${
            isManualMode ? ' en registro Manual.' : '.'
          }`
        )
        return
      }
      setSubmitError(missingRequiredMessage ?? 'Faltan datos requeridos para registrar la OT.')
      setSubmitErrorModalOpen(true)
      return
    }
    const selectedFile = pdfFile ?? archivoRef.current?.files?.[0] ?? null
    if (!selectedFile) {
      if (isManualMode) {
        setValidatedSteps((current) => {
          const next = new Set(current)
          next.add(3)
          return next
        })
        setSubmitError(null)
        setSubmitErrorModalOpen(false)
        focusStepField(archivoRef.current)
        return
      }
      setValidatedSteps((current) => {
        const next = new Set(current)
        next.add(3)
        return next
      })
      setSubmitError(`Debes adjuntar el archivo ${archivoAdjuntoLabel} para registrar la OT.`)
      setSubmitErrorModalOpen(true)
      return
    }
    if (!pdfFile) setPdfFile(selectedFile)
    setConfirmModalOpen(true)
  }

  const missingParamsMessage = useMemo(() => {
    if (isManualMode) return null
    const missing: string[] = []
    if (!clienteNro) missing.push('clienteNro')
    if (!ot) missing.push('ot')
    if (!tor) missing.push('tor')
    if (!tecnicoNombre) missing.push('tecnicoNombre')
    return missing.length > 0 ? `Faltan parametros para consultar cabecera: ${missing.join(', ')}.` : null
  }, [clienteNro, isManualMode, ot, tecnicoNombre, tor])

  const cabeceraErrorDetail = useMemo(() => {
    const error = cabeceraQuery.error
    if (!error) return ''
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        try {
          return JSON.stringify(error.response.data)
        } catch {
          return String(error.response.data)
        }
      }
      return error.message
    }
    if (error instanceof Error) return error.message
    return String(error)
  }, [cabeceraQuery.error])

  const hiddenHeaderMessage = useMemo(() => {
    if (!hasAttemptedSubmit || missingHeaderFields.length === 0) return null
    return `Faltan datos de cabecera requeridos: ${missingHeaderFields.join(', ')}.`
  }, [hasAttemptedSubmit, missingHeaderFields])

  const otDetailErrorDetail = useMemo(() => {
    const error = otDetailQuery.error
    if (!error) return ''
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        try {
          return JSON.stringify(error.response.data)
        } catch {
          return String(error.response.data)
        }
      }
      return error.message
    }
    if (error instanceof Error) return error.message
    return String(error)
  }, [otDetailQuery.error])

  const showOtDetailError = otDetailQuery.isError && !isNotFoundError(otDetailQuery.error)
  const closeSubmitErrorModal = () => {
    setSubmitErrorModalOpen(false)
    if (submitError?.startsWith('Debes adjuntar el archivo')) {
      setSubmitError(null)
      setValidatedSteps((current) => {
        const next = new Set(current)
        next.delete(3)
        return next
      })
    }
    focusFirstInvalidField()
  }
  const isFirstFormStep = formStep === 0
  const isLastFormStep = formStep === FORM_STEPS.length - 1
  const focusStepField = (target: HTMLElement | null) => {
    window.setTimeout(() => {
      target?.focus()
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }
  const validateFormStep = (step: number): boolean => {
    setValidatedSteps((current) => {
      const next = new Set(current)
      next.add(step)
      return next
    })
    if (step === 0) {
      const target =
        (firstPositiveNumber(effectiveIdTipoServicio) === null ? tipoServicioRef.current : null) ??
        (!hasValidOrdenTrabajo ? otRef.current : null) ??
        (!hasValidCodigoCliente ? clienteRef.current : null) ??
        (parsedEstadoId === null ? estadoRef.current : null)
      if (target || isBlockedEstadoForCurrentOt) {
        focusStepField(target)
        return false
      }
      return true
    }
    if (step === 1) {
      const target =
        (!tipoTecnologia.trim() ? tipoTecnologiaRef.current : null) ??
        (!nodoValid ? nodoRef.current : null) ??
        (!ramalValid ? ramalRef.current : null) ??
        (!tapValid ? tapRef.current : null) ??
        (!bocaValid ? bocaRef.current : null)
      if (target) {
        focusStepField(target)
        return false
      }
      return true
    }
    if (step === 2) {
      if (!observacion.trim()) {
        focusStepField(observacionRef.current)
        return false
      }
      return true
    }
    return true
  }
  const canMoveToStep = (targetStep: number): boolean => {
    if (targetStep <= formStep) return true
    for (let step = formStep; step < targetStep; step += 1) {
      if (!validateFormStep(step)) return false
    }
    setSubmitError(null)
    return true
  }
  const goToFormStep = (targetStep: number) => {
    if (!canMoveToStep(targetStep)) return
    if (targetStep !== formStep) {
      setSubmitError(null)
      setSubmitErrorModalOpen(false)
    }
    if (targetStep === 3 && targetStep !== formStep) {
      setHasAttemptedSubmit(false)
      setValidatedSteps((current) => {
        const next = new Set(current)
        next.delete(3)
        return next
      })
    }
    setFormStep(targetStep)
  }
  const goToPrevStep = () => {
    setSubmitError(null)
    setSubmitErrorModalOpen(false)
    setFormStep((current) => Math.max(0, current - 1))
  }
  const goToNextStep = () => goToFormStep(Math.min(FORM_STEPS.length - 1, formStep + 1))

  return (
    <div className="bento-page overflow-x-hidden">
      <div className="px-1">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">RegistrarOrdenAgenda</h2>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleFormSubmit}>
        <FormCard title="" hideHeader>
          <div className="mb-2 border-b-0 pb-0 sm:mb-4 sm:border-b sm:pb-4">
            <div className="flex flex-wrap gap-2">
              {FORM_STEPS.map((label, index) => {
                const active = formStep === index
                const completed = formStep > index
                return (
                  <button
                    key={label}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : completed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                    onClick={() => goToFormStep(index)}
                    disabled={mutation.isPending || isPrevalidating}
                  >
                    <span>{index + 1}</span>
                    <span className="hidden sm:inline">. {label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-4 hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Usuario</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={session?.nombre ?? ''} disabled />
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tecnico</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={tecnicoVisible} disabled />
            </div>

            <div className={formStep === 0 ? 'contents' : 'hidden'}>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-red-600">Fecha Ejecucion</label>
              <input
                className="input-base rounded-md border-rose-300 bg-slate-50 py-2 text-sm text-rose-600"
                value={formatDateDDMMYYYY(new Date())}
                disabled
              />
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Grupo</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={grupoVisible} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipo Instalacion {isManualMode && tipoServicioInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}</label>
              {hiddenIdTipoServicio !== null && !isManualMode ? (
                <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={tipoServicioLabel} disabled />
              ) : (
                <select
                  ref={tipoServicioRef}
                  className={`input-base rounded-md py-2 text-sm ${tipoServicioInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                  value={idTipoServicioManual}
                  onChange={(event) => setIdTipoServicioManual(event.target.value)}
                  aria-invalid={tipoServicioInvalid}
                >
                  <option value="">{tiposServicioQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo de servicio'}</option>
                  {tipoServicioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {!isManualMode && tipoServicioInvalid ? <p className="mt-1 text-xs text-rose-600">Tipo instalacion es requerido.</p> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden {isManualMode && otInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}</label>
              <input
                ref={otRef}
                className={`input-base rounded-md py-2 text-sm ${isManualMode ? '' : 'bg-slate-50'} ${otInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={otInputValue}
                onChange={(event) => {
                  if (!isManualMode) return
                  setOtManualInput(event.target.value.replace(/[^\d]/g, ''))
                }}
                placeholder={isManualMode ? 'Ingresa nro de orden' : undefined}
                disabled={!isManualMode}
                aria-invalid={otInvalid}
              />
              {!isManualMode && otInvalid ? <p className="mt-1 text-xs text-rose-600">Nro orden es requerido.</p> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente {isManualMode && clienteInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}</label>
              <input
                ref={clienteRef}
                className={`input-base rounded-md py-2 text-sm ${isManualMode ? '' : 'bg-slate-50'} ${clienteInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={clienteInputValue}
                onChange={(event) => {
                  if (!isManualMode) return
                  setClienteManualInput(event.target.value.replace(/[^\d]/g, ''))
                }}
                placeholder={isManualMode ? 'Ingresa cod cliente' : undefined}
                disabled={!isManualMode}
                aria-invalid={clienteInvalid}
              />
              {!isManualMode && clienteInvalid ? <p className="mt-1 text-xs text-rose-600">Cod cliente es requerido.</p> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Estado {isManualMode && estadoInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}</label>
              <select
                ref={estadoRef}
                className={`input-base rounded-md py-2 text-sm ${estadoInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={idEstado}
                onChange={(event) => setIdEstado(event.target.value)}
                aria-invalid={estadoInvalid}
              >
                <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                {estadoOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={shouldBlockFinalizadoOkForCurrentOt && blockedEstadoIds.has(option.value)}
                  >
                    {shouldBlockFinalizadoOkForCurrentOt && blockedEstadoIds.has(option.value)
                      ? `${option.label} (${isManualMode ? 'No permitido para Manual' : 'No permitido para Fallida con visita'})`
                      : option.label}
                  </option>
                ))}
              </select>
              {!isManualMode && estadoInvalid ? <p className="mt-1 text-xs text-rose-600">Estado es requerido.</p> : null}
            </div>

            <div className="hidden">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Sucursal</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={sucursalVisible} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Origen</label>
              <input className="input-base rounded-md bg-slate-50 py-2 text-sm" value={origenRegistro} disabled />
            </div>
            </div>

            <div className={formStep === 1 ? 'contents' : 'hidden'}>
            <div className="md:col-span-2">
              <label className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Tipo Tecnologia</span>
                {tipoTecnologiaInvalid ? <span className="text-right text-[11px] font-medium text-rose-600">{isManualMode ? 'Completar' : 'Requerido'}</span> : null}
              </label>
              <select
                ref={tipoTecnologiaRef}
                className={`input-base rounded-md py-2 text-sm ${tipoTecnologiaInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={tipoTecnologia}
                onChange={(event) => setTipoTecnologia(event.target.value)}
                aria-invalid={tipoTecnologiaInvalid}
              >
                <option value="">{tiposTecnologiaQuery.isLoading ? 'Cargando tecnologia...' : 'Selecciona tecnologia'}</option>
                {tipoTecnologiaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Nodo</span>
                {nodoInvalid ? <span className="text-right text-[11px] font-medium text-rose-600" title="Debe tener 3 letras y 3 o 4 números">Formato inválido</span> : null}
              </label>
              <input
                ref={nodoRef}
                className={`input-base rounded-md py-2 text-sm uppercase ${nodoInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={nodo}
                onChange={(event) => setNodo(sanitizeNodoInput(event.target.value))}
                onBlur={handleNodoBlur}
                placeholder="SCZ123"
                maxLength={7}
                aria-invalid={nodoInvalid}
              />
            </div>

            <div>
              <label className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Ramal</span>
                {ramalInvalid ? <span className="text-right text-[11px] font-medium text-rose-600">{isManualMode ? 'Completar' : 'Requerido'}</span> : null}
              </label>
              <select
                ref={ramalRef}
                className={`input-base rounded-md py-2 text-sm ${ramalInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={ramal}
                onChange={(event) => setRamal(event.target.value)}
                aria-invalid={ramalInvalid}
              >
                <option value="">{ramalesQuery.isLoading ? 'Cargando ramales...' : 'Selecciona ramal'}</option>
                {ramalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>TAP</span>
                {tapInvalid ? <span className="text-right text-[11px] font-medium text-rose-600" title="Debe tener exactamente 3 dígitos">3 dígitos</span> : null}
              </label>
              <input
                ref={tapRef}
                className={`input-base rounded-md py-2 text-sm ${tapInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={tap}
                onChange={(event) => setTap(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                onBlur={handleTapBlur}
                placeholder="0-999"
                maxLength={3}
                aria-invalid={tapInvalid}
              />
            </div>

            <div>
              <label className="mb-1 flex items-start justify-between gap-2 text-xs font-semibold text-slate-700">
                <span>Boca</span>
                {bocaInvalid ? <span className="text-right text-[11px] font-medium text-rose-600">{isManualMode ? 'Completar' : 'Requerida'}</span> : null}
              </label>
              <select
                ref={bocaRef}
                className={`input-base rounded-md py-2 text-sm ${bocaInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={boca}
                onChange={(event) => setBoca(event.target.value)}
                aria-invalid={bocaInvalid}
              >
                <option value="">Selecciona boca</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <option key={item} value={String(item)}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nodo_Ramal_Tap</label>
              <input
                className="input-base rounded-md bg-slate-50 py-2 text-sm"
                value={`NODO ${nodoUpper || '-'} RAMAL ${ramalUpper || '-'} ${tapDisplay} BOCA ${boca || '-'}`}
                disabled
              />
            </div>
            </div>

            <div className={formStep === 2 ? 'contents' : 'hidden'}>
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Bitacora {observacionInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}
              </label>
              <textarea
                ref={observacionRef}
                className={`input-base h-24 resize-none rounded-md py-2 text-sm ${observacionInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder="Escribe una observacion"
                aria-invalid={observacionInvalid}
              />
            </div>

            {!isTorSip ? (
              <div className="md:col-span-1 md:pt-6">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                    checked={checkPlantaExterna}
                    onChange={(event) => setCheckPlantaExterna(event.target.checked)}
                    disabled={!isTipoAsistencia}
                  />
                  Es Planta Externa
                </label>
              </div>
            ) : null}

            <div className="md:col-span-1 md:pt-6">
              <label className={`inline-flex items-center gap-2 text-sm font-semibold ${canUseMaterialCheck ? 'text-slate-700' : 'text-slate-400'}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  checked={tieneDetalle}
                  onChange={(event) => {
                    if (!canUseMaterialCheck) return
                    setTieneDetalle(event.target.checked)
                  }}
                  disabled={!canUseMaterialCheck}
                />
                Se uso material?
              </label>
              {!canUseMaterialCheck ? (
                <p className="mt-1 text-xs text-slate-500">Este tipo de instalacion no permite registrar material.</p>
              ) : null}
              {mustKeepTieneDetalleUnchecked ? (
                <p className="mt-1 text-xs text-slate-500">Para este estado, "Se uso material?" no aplica.</p>
              ) : null}
            </div>
            </div>

            <div className={formStep === 3 ? 'contents' : 'hidden'}>
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Adjuntar {archivoAdjuntoLabel} (obligatorio) {archivoInvalid ? <span className="ml-1 text-[11px] font-bold text-rose-600">Completar</span> : null}
              </label>
              <input
                ref={archivoRef}
                className={`input-base rounded-md py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 ${archivoInvalid ? '!border-rose-500 !bg-rose-50 focus:!ring-rose-200' : ''}`}
                type="file"
                accept={archivoAdjuntoAccept}
                aria-invalid={archivoInvalid}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  if (!file) {
                    setPdfFile(null)
                    setSubmitError(null)
                    return
                  }
                  const lowerName = file.name.toLowerCase()
                  const mimeType = (file.type ?? '').toLowerCase()
                  const isValidPdf = lowerName.endsWith('.pdf') && (mimeType === '' || mimeType === 'application/pdf')
                  const isValidImage =
                    IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension)) &&
                    (mimeType === '' || IMAGE_MIME_TYPES.includes(mimeType))
                  const isValidType = tipoArchivoProtw === 'IMAGEN' ? isValidImage : isValidPdf
                  if (!isValidType) {
                    setPdfFile(null)
                    setSubmitError(tipoArchivoProtw === 'IMAGEN' ? 'Solo se permite adjuntar imagen JPG o PNG.' : 'Solo se permite adjuntar archivos PDF.')
                    event.target.value = ''
                    return
                  }
                  const maxBytes = tipoArchivoProtw === 'IMAGEN' ? IMAGE_MAX_BYTES : PDF_MAX_BYTES
                  if (file.size > maxBytes) {
                    setPdfFile(null)
                    validateFileSize(file)
                    event.target.value = ''
                    return
                  }
                  setSubmitError(null)
                  setPdfFile(file)
                }}
                disabled={registroGuardado || mutation.isPending || isPrevalidating}
              />
              {pdfFile ? <p className="mt-1 text-xs text-slate-500">Archivo: {pdfFile.name}</p> : null}
            </div>

            <div className="md:col-span-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <div>lat={latitudVisible ?? 'N/D'}, lon={longitudVisible ?? 'N/D'}</div>
              <div className="mt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    className="w-full sm:w-auto"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void requestGeolocation()
                    }}
                    disabled={geoLoading || calibrationBusy || isPrevalidating}
                  >
                    {geoLoading ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (latitudVisible === null || longitudVisible === null) return
                      const mapsUrl = `https://www.google.com/maps?q=${latitudVisible},${longitudVisible}`
                      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
                    }}
                    disabled={latitudVisible === null || longitudVisible === null}
                  >
                    Ver en Google Maps
                  </Button>
                </div>
              </div>
              {geoError ? <div className="mt-2 text-rose-600">{geoError}</div> : null}
            </div>

            <div className="md:col-span-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Ubicacion manual</p>
                  <p className="mt-1">lat={latitudVenta ?? 'N/D'}, lon={longitudVenta ?? 'N/D'}</p>
                  <p className={ventaLocationTouched ? 'mt-1 font-semibold text-emerald-700' : 'mt-1 font-semibold text-amber-700'}>
                    {ventaLocationTouched ? 'Ubicacion de venta confirmada.' : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-[180px]">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!currentGeoPoint) return
                      setLatitudVenta(Number(currentGeoPoint.latitud.toFixed(6)))
                      setLongitudVenta(Number(currentGeoPoint.longitud.toFixed(6)))
                      setVentaLocationTouched(true)
                      setSubmitError(null)
                    }}
                    disabled={!currentGeoPoint || geoLoading || calibrationBusy || isPrevalidating}
                  >
                    Usar mi ubicacion
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (latitudVenta === null || longitudVenta === null) return
                      const mapsUrl = `https://www.google.com/maps?q=${latitudVenta},${longitudVenta}`
                      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
                    }}
                    disabled={latitudVenta === null || longitudVenta === null}
                  >
                    Ver punto en Maps
                  </Button>
                </div>
              </div>
              <VentaLocationMap
                value={ventaGeoPoint}
                currentLocation={currentGeoPoint}
                onChange={(point) => {
                  setLatitudVenta(Number(point.latitud.toFixed(6)))
                  setLongitudVenta(Number(point.longitud.toFixed(6)))
                  setVentaLocationTouched(true)
                  setSubmitError(null)
                }}
              />
            </div>
            </div>
          </div>
        </FormCard>

        {!isManualMode && missingParamsMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{missingParamsMessage}</div>
        ) : null}
        {manualRouteIssue ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{manualRouteIssue}</div>
        ) : null}
        {hiddenHeaderMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{hiddenHeaderMessage}</div>
        ) : null}
        {tipoServicioHeaderWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{tipoServicioHeaderWarning}</div>
        ) : null}
        {!isManualMode && cabeceraQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo cargar la cabecera de venta OT.
            {cabeceraErrorDetail ? <div className="mt-2 break-all text-xs">{cabeceraErrorDetail}</div> : null}
          </div>
        ) : null}
        {!isManualMode && showOtDetailError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se pudo obtener el detalle de la OT por numero (`fetchOtByNumero`).
            {otDetailErrorDetail ? <div className="mt-2 break-all text-xs">{otDetailErrorDetail}</div> : null}
          </div>
        ) : null}
        {!isManualMode && !cabeceraQuery.isLoading && !cabeceraQuery.isError && cabeceraRows.length > 0 && !sucursalVisible ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            La API de cabecera no devolvio la sucursal.
          </div>
        ) : null}
        {submitError ? (
          <div className="max-w-full overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {submitError}
          </div>
        ) : null}
        {!submitError && isBlockedEstadoForCurrentOt ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            No se permite guardar con estado "{selectedEstadoLabel || 'CERRADO - FINALIZADO OK'}"
            {isManualMode ? ' en registro Manual.' : '.'}
          </div>
        ) : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

        <div className="sticky bottom-0 z-20 -mx-3 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <div className="text-center text-xs font-semibold text-slate-500 sm:text-left">
            Paso {formStep + 1} de {FORM_STEPS.length}: {FORM_STEPS[formStep]}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={handleBackToDashboard} disabled={mutation.isPending || isPrevalidating}>
            {success ? 'Volver' : 'Cancelar'}
          </Button>
          {!isFirstFormStep ? (
            <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={goToPrevStep} disabled={mutation.isPending || isPrevalidating}>
              Anterior
            </Button>
          ) : null}
          {!isLastFormStep ? (
            <Button className="w-full sm:w-auto" type="button" onClick={goToNextStep} disabled={mutation.isPending || cabeceraQuery.isLoading || geoLoading || calibrationBusy || isPrevalidating}>
              Siguiente
            </Button>
          ) : (
          <Button
            className="w-full sm:w-auto"
            type="submit"
            disabled={registroGuardado || mutation.isPending || cabeceraQuery.isLoading || geoLoading || calibrationBusy || isPrevalidating}
          >
            {registroGuardado ? 'Registrada' : isPrevalidating ? 'Validando...' : mutation.isPending ? 'Guardando...' : 'Registrar OT'}
          </Button>
          )}
          </div>
        </div>
      </form>

      <Modal open={confirmModalOpen && !registroGuardado} title="Muy importante" onClose={() => setConfirmModalOpen(false)}>
        <p className="font-semibold text-rose-700">ASEGURESE DE ESTAR EN LA UBICACION EXACTA</p>
        <p className="mt-2 text-slate-600">Si no esta exactamente en el domicilio correcto, no continue.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setConfirmModalOpen(false)} disabled={calibrationBusy || isPrevalidating || registroGuardado}>
            Cancelar
          </Button>
          <Button type="button" onClick={runCalibrationAndSubmit} disabled={calibrationBusy || isPrevalidating || registroGuardado}>
            Estoy en la ubicacion
          </Button>
        </div>
      </Modal>

      <Modal open={calibrationModalOpen} title="Calibrando GPS" onClose={() => (calibrationBusy ? undefined : setCalibrationModalOpen(false))}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <p className="font-medium text-slate-700">{calibrationMessage}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">Este proceso puede tardar para obtener la mejor precision posible.</p>
      </Modal>

      <Modal
        open={duplicateOrdenModalOpen}
        title="Orden ya registrada"
        onClose={() => setDuplicateOrdenModalOpen(false)}
        actions={
          <Button type="button" onClick={() => setDuplicateOrdenModalOpen(false)}>
            OK
          </Button>
        }
      >
        <p>No se puede escribir esta orden, ya existe.</p>
      </Modal>

      <Modal
        open={submitErrorModalOpen && Boolean(submitError) && !duplicateOrdenModalOpen}
        title="No se pudo registrar la OT"
        onClose={closeSubmitErrorModal}
        contentClassName="max-w-full overflow-x-hidden whitespace-pre-wrap break-all"
        actions={
          <Button type="button" variant="secondary" onClick={closeSubmitErrorModal}>
            Cerrar
          </Button>
        }
      >
        <p className="max-w-full overflow-x-hidden whitespace-pre-wrap break-all">{submitError}</p>
      </Modal>

      <Modal
        open={successModalOpen}
        title="Registro exitoso"
        onClose={handleSuccessModalAccept}
        contentClassName="max-w-full overflow-x-hidden whitespace-pre-wrap break-all"
        actions={
          <Button type="button" onClick={handleSuccessModalAccept}>
            OK
          </Button>
        }
      >
        <p className="max-w-full overflow-x-hidden whitespace-pre-wrap break-all">{successModalMessage || success || 'Registro exitoso.'}</p>
      </Modal>
      <FileSizeLimitModal />
    </div>
  )
}

export default RegistrarOTAgendaPage
