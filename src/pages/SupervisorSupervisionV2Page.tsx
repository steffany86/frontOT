import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faCamera, faCameraRetro, faCheckCircle, faClipboardList, faClock, faCloudArrowUp, faComments, faGear, faIdCard, faListUl, faLocationDot, faMagnifyingGlass, faRotateRight, faScrewdriverWrench, faTriangleExclamation, faUserGear, faUserPen } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import ImageLightbox from '../components/common/ImageLightbox'
import Modal from '../components/common/Modal'
import Table, { type Column } from '../components/common/Table'
import UbicacionAutoCapture from '../components/common/UbicacionAutoCapture'
import {
  aprobarInicioJornadaPendiente,
  createSupervision,
  createSupervisionPendiente,
  fetchMisSucursalesSupervision,
  fetchHistoricoJornadaDetalle,
  fetchInicioJornadaFirma,
  fetchInicioJornadaImagen,
  fetchInicioJornadaImagenAuxiliar,
  fetchIniciosJornadaConfirmadosHoySupervision,
  fetchSupervisionDetalle,
  fetchIniciosJornadaPendientesSupervision,
  rechazarInicioJornadaPendiente,
  fetchSupervisionTecnicos,
  fetchSupervisionTiposPenalizacion,
  fetchSupervisionTiposSupervision,
  fetchSupervisionTiposTrabajo,
  fetchSupervisionPorOpciones,
  fetchTecnologiaOpciones,
  fetchTipoRevisionOpciones,
  fetchSupervisiones,
  fetchSupervisionesPendientes,
  fetchBackofficeSupervisionesPorEstado,
  fetchSupervisores,
  realizarSupervisionPendiente,
} from '../api/supervisionV2Api'
import type {
  SupervisionCreatePayload,
  SupervisionInicioPendiente,
  SupervisionRegistro,
  SupervisionTecnico,
} from '../types/supervision'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { CONFIG_KEYS, fetchConfiguracionValor } from '../api/configuracionApi'
import FotoSupervision from '../components/supervision/FotoSupervision'
import SignaturePad from '../components/common/SignaturePad'
import { esRutaFotoSupervision, fetchChecklistItems, fetchChecklistRespuestas, fetchCruceMateriales, fetchLlamadaSupervision, fetchMaterialesCruce, fetchMaterialesSistemaOt, type ChecklistItem } from '../api/supervisionV2Api'
import LlamadaAtencionSupervisionModal from '../components/supervision/LlamadaAtencionSupervisionModal'
import { useFileSizeLimitModal } from '../hooks/useFileSizeLimitModal'

type SupervisionForm = {
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
  firmaTecnico: string
  firmaAuxiliar: string
  firmaCliente: string
}

type SupervisionFiltro = {
  fechaDesde: string
  fechaHasta: string
  codigo: string
}

type AgendaEstadoVista = 'pendientes' | 'completadas'

type JornadaPendienteFiltro = 'hoy' | 'pasados'

const emptyForm = (): SupervisionForm => ({
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
  firmaTecnico: '',
  firmaAuxiliar: '',
  firmaCliente: '',
})

const emptyFiltro = (): SupervisionFiltro => ({
  fechaDesde: '',
  fechaHasta: '',
  codigo: '',
})

const getTodayIsoDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultFiltro = (): SupervisionFiltro => ({
  fechaDesde: getTodayIsoDate(),
  fechaHasta: getTodayIsoDate(),
  codigo: '',
})

const requiredFields: Array<keyof SupervisionForm> = [
  'idTecnicoPrincipal',
  'idTipoSupervision',
  'idTipoTrabajo',
  'idTipoPenalizacion',
  'supervisionPor',
  'tecnologia',
  'codigo',
  'ordenTrabajo',
  'tipoRevision',
  'ubicacion',
]

const photoFields: Array<{ key: keyof SupervisionForm; label: string }> = [
  { key: 'fotoBoletaSupervision', label: 'Foto Boleta Supervision' },
  { key: 'fotoCanalesPilos', label: 'Foto Canales Pilotos' },
  { key: 'fotoNivelesDocsis', label: 'Foto Niveles Docsis' },
  { key: 'fotoMedicionRuido', label: 'Foto Medicion Ruido' },
  { key: 'fotoBarridoCanales', label: 'Foto Barrido Canales' },
  { key: 'fotoObservacion1', label: 'Foto Observacion 1' },
  { key: 'fotoObservacion2', label: 'Foto Observacion 2' },
  { key: 'fotoObservacion3', label: 'Foto Observacion 3' },
  { key: 'fotoObservacion4', label: 'Foto Observacion 4' },
]

/**
 * Reglas por tipo de supervision (tools/Supervision.xlsx). La clave es el Id del tipo en SPX_Supervision_ListarTiposSupervision:
 * 1 Acompanamiento de ruta, 2 Intercepcion de ruta, 3 Mediciones DOCSIS, 4 Supervision de campo,
 * 5 Accidente / auxilio a personal tecnico, 6 Reemplazo de ruta.
 */
type ReglaTipoSupervision = {
  roles: string[] // quienes pueden elegir el tipo (sistemas/admin pueden todos)
  tipoTrabajo: boolean
  tipoPenalizacion: boolean
  tipoRevision: boolean
  fotos: Array<keyof SupervisionForm>
  firmaTecnico: boolean // obligatoria
  firmaAuxiliar: boolean // opcional
  firmaClienteSegunRevision: boolean // supervision de campo: obligatoria si la revision es Interna o Interna/Externa
}
const FOTOS_OBSERVACION: Array<keyof SupervisionForm> = ['fotoObservacion1', 'fotoObservacion2', 'fotoObservacion3', 'fotoObservacion4']
const ROLES_OFICINA_Y_SUPERVISOR = ['backoffice', 'backofficev', 'digitador', 'supervisor']
const REGLAS_TIPO_SUPERVISION: Record<string, ReglaTipoSupervision> = {
  '1': { roles: ['supervisor'], tipoTrabajo: true, tipoPenalizacion: false, tipoRevision: false, fotos: FOTOS_OBSERVACION, firmaTecnico: true, firmaAuxiliar: true, firmaClienteSegunRevision: false },
  '2': { roles: ['supervisor'], tipoTrabajo: true, tipoPenalizacion: true, tipoRevision: true, fotos: ['fotoObservacion1', 'fotoObservacion2'], firmaTecnico: true, firmaAuxiliar: true, firmaClienteSegunRevision: true },
  '3': { roles: ROLES_OFICINA_Y_SUPERVISOR, tipoTrabajo: true, tipoPenalizacion: true, tipoRevision: true, fotos: ['fotoCanalesPilos', 'fotoNivelesDocsis', 'fotoMedicionRuido', 'fotoBarridoCanales', 'fotoObservacion1', 'fotoObservacion2'], firmaTecnico: false, firmaAuxiliar: false, firmaClienteSegunRevision: false },
  '4': { roles: ROLES_OFICINA_Y_SUPERVISOR, tipoTrabajo: true, tipoPenalizacion: true, tipoRevision: true, fotos: FOTOS_OBSERVACION, firmaTecnico: false, firmaAuxiliar: false, firmaClienteSegunRevision: true },
  '5': { roles: ['supervisor'], tipoTrabajo: true, tipoPenalizacion: false, tipoRevision: false, fotos: FOTOS_OBSERVACION, firmaTecnico: true, firmaAuxiliar: false, firmaClienteSegunRevision: false },
  '6': { roles: ['supervisor'], tipoTrabajo: true, tipoPenalizacion: true, tipoRevision: true, fotos: FOTOS_OBSERVACION, firmaTecnico: false, firmaAuxiliar: false, firmaClienteSegunRevision: false },
}
const ROLES_TODOS_LOS_TIPOS = ['sistemas', 'admin', 'administrador']
// 2 = INTERCEPCION DE RUTA y 5 = ACCIDENTE / AUXILIO A PERSONAL TECNICO: unicos tipos que admiten Tipo Trabajo NINGUNA.
// Solo en ese caso (tipo 2 o 5 con Tipo Trabajo NINGUNA) la OT y el nro de cliente no se piden.
const TIPOS_CON_TIPO_TRABAJO_NINGUNA = ['2', '5']


/** Checklists por tipo: el 2 usa EPP + vehiculo + herramientas y ademas los items de REVISION segun la revision; el 4 solo los de REVISION (Interna/Externa). */
const CHECKLIST_POR_TIPO: Record<string, { grupos?: string[]; porRevision?: boolean }> = {
  '2': { grupos: ['EPP', 'VEHICULO', 'HERRAMIENTAS'], porRevision: true },
  '4': { porRevision: true },
}
const TITULO_GRUPO_CHECKLIST: Record<string, string> = {
  EPP: 'EPP',
  VEHICULO: 'Vehiculo',
  HERRAMIENTAS: 'Herramientas del tecnico',
  REVISION: 'Revision de campo',
}
/** Titulo del grupo de checklist; en INTERCEPCION DE RUTA (2) los items de REVISION se muestran como "CheckList TipoRevision". */
const tituloGrupoChecklist = (grupo: string, idTipoSupervision?: string): string =>
  grupo === 'REVISION' && (idTipoSupervision ?? '').trim() === '2' ? 'CheckList TipoRevision' : TITULO_GRUPO_CHECKLIST[grupo] ?? grupo
// Cada grupo del checklist lleva su color para distinguirlos al desplazarse.
const COLOR_GRUPO_CHECKLIST: Record<string, { caja: string; banda: string }> = {
  REVISION: { caja: 'border-blue-200', banda: 'bg-blue-900 text-white' },
  EPP: { caja: 'border-blue-200', banda: 'bg-blue-700 text-white' },
  VEHICULO: { caja: 'border-blue-200', banda: 'bg-sky-600 text-white' },
  HERRAMIENTAS: { caja: 'border-blue-200', banda: 'bg-sky-500 text-white' },
}
const sinTildes = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
const checklistRespuestaNegativa = (respuesta: string): boolean => ['no', 'incorrecto', 'menor', 'mayor', 'sin senal'].includes(sinTildes(respuesta))
const opcionesDeItemChecklist = (item: ChecklistItem): string[] => {
  if (item.tipoRespuesta === 'SI_NO') return ['Si', 'No']
  if (item.tipoRespuesta === 'CORRECTO_INCORRECTO') return ['Correcto', 'Incorrecto']
  return item.opciones
}

// Si el registro trae un valor que ya no esta en el catalogo, se conserva para no mostrarlo vacio.
const opcionesConActual = (opciones: string[] | undefined, actual: string): string[] => {
  const lista = opciones ?? []
  const valor = actual.trim()
  return valor && !lista.includes(valor) ? [...lista, valor] : lista
}

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()
const normalizeUpperText = (value: string): string => value.trimStart().toUpperCase()

const toOptional = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const isSupervisionCompletada = (row: SupervisionRegistro): boolean =>
  String(row.estadoSup ?? '').trim().toLowerCase().includes('complet')

// Marca para las supervisiones que generaron una llamada de atencion al tecnico.
const tieneLlamadaAtencion = (row: SupervisionRegistro): boolean => Boolean(row.idLlamadaAtencion?.trim()) && row.idLlamadaAtencion?.trim() !== '0'

function MarcaLlamada() {
  return (
    <span
      title="Esta supervision tiene llamada de atencion"
      className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200"
    >
      <FontAwesomeIcon icon={faTriangleExclamation} />
      Llamada de atencion
    </span>
  )
}

const supervisionEstadoBadgeClass = (row: SupervisionRegistro): string =>
  isSupervisionCompletada(row)
    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatDateParts = (value?: string): { date: string; time: string } => {
  if (!value) return { date: '-', time: '-' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: value, time: '-' }
  return {
    date: new Intl.DateTimeFormat('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
    time: new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  }
}

const startOfToday = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const getDateOnly = (value?: string): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const isJornadaToday = (row: SupervisionInicioPendiente): boolean => {
  const date = getDateOnly(row.fechaRegistro)
  return Boolean(date && date.getTime() === startOfToday().getTime())
}

const isJornadaPast = (row: SupervisionInicioPendiente): boolean => {
  const date = getDateOnly(row.fechaRegistro)
  return Boolean(date && date.getTime() < startOfToday().getTime())
}

const resolveImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  if (raw.startsWith('C:/') || raw.startsWith('C:\\')) return null
  if (raw.includes('\\')) return null
  const compact = raw.replace(/\s+/g, '')
  const looksLikeBase64 = compact.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)
  if (raw.includes('/') && !looksLikeBase64) return null
  return `data:image/jpeg;base64,${raw}`
}

const JornadaRemoteImageCard = ({
  queryKey,
  queryFn,
  fullImageQueryFn,
  label,
  alt,
  className = 'h-48 w-full object-cover',
  fallbackValue,
  enabled = true,
  onZoom,
}: {
  queryKey: Array<string | number | boolean>
  queryFn: () => Promise<Blob>
  fullImageQueryFn?: () => Promise<Blob>
  label: string
  alt: string
  className?: string
  fallbackValue?: string
  enabled?: boolean
  onZoom: (src: string) => void
}) => {
  const fallbackSrc = resolveImageSrc(fallbackValue)
  const imageQuery = useQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60_000,
    retry: false,
    enabled: enabled && !fallbackSrc,
  })
  const fullImageQuery = useQuery({
    queryKey: [...queryKey, 'completa'],
    queryFn: fullImageQueryFn ?? queryFn,
    staleTime: 10 * 60_000,
    retry: false,
    enabled: false,
  })
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imageQuery.data) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(imageQuery.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageQuery.data])

  const src = fallbackSrc || objectUrl

  const handleZoom = async () => {
    if (!fullImageQueryFn) {
      if (src) onZoom(src)
      return
    }
    try {
      const result = await fullImageQuery.refetch()
      if (result.data) {
        onZoom(URL.createObjectURL(result.data))
        return
      }
    } catch {
      // Si falla la imagen completa, mantiene disponible la miniatura visible.
    }
    if (src) onZoom(src)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5">
      <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">{label}</p>
      {imageQuery.isLoading ? (
        <p className="mt-2 text-sm font-semibold text-slate-500">Cargando...</p>
      ) : src ? (
        <button
          type="button"
          className="mt-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-progress"
          onClick={handleZoom}
          disabled={fullImageQuery.isFetching}
        >
          <img src={src} alt={alt} className={`rounded-xl border border-slate-300 ${className}`} />
        </button>
      ) : (
        <p className="mt-2 text-2xl font-semibold text-slate-900">-</p>
      )}
    </div>
  )
}

const parseGeoCoords = (value?: string): { lat: number; lng: number } | null => {
  const raw = value?.trim()
  if (!raw) return null
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

const formatSiNoValue = (value?: unknown): string => {
  if (typeof value === 'boolean') return value ? 'SI' : 'NO'
  const raw = String(value ?? '').trim()
  const normalized = raw.toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí') return 'SI'
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return 'NO'
  return raw
}

const isSiValue = (value?: unknown): boolean => formatSiNoValue(value) === 'SI'
const isNoValue = (value?: unknown): boolean => formatSiNoValue(value) === 'NO'

const normalizePersonNameKey = (value?: string): string => {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return ''
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

const mergeTecnicosDisponibles = (
  catalogo: SupervisionTecnico[],
  pendientes: SupervisionInicioPendiente[],
  confirmados: SupervisionInicioPendiente[]
): SupervisionTecnico[] => {
  const byId = new Map<string, SupervisionTecnico>()
  const idByNameKey = new Map<string, string>()

  const addTecnico = (idRaw?: string, nombreRaw?: string) => {
    const id = normalizeId(idRaw)
    const nombre = (nombreRaw ?? '').trim()
    if (!id) return
    const nameKey = normalizePersonNameKey(nombre)
    if (nameKey && idByNameKey.has(nameKey) && idByNameKey.get(nameKey) !== id) {
      return
    }
    if (byId.has(id)) {
      const current = byId.get(id)
      if (current && !current.tecnico.trim() && nombre) {
        byId.set(id, { ...current, tecnico: nombre })
      }
      if (nameKey) {
        idByNameKey.set(nameKey, id)
      }
      return
    }
    byId.set(id, {
      idTecnico: id,
      tecnico: nombre || `Tecnico ${id}`,
    })
    if (nameKey) {
      idByNameKey.set(nameKey, id)
    }
  }

  for (const item of catalogo) {
    addTecnico(item.idTecnico, item.tecnico)
    const id = normalizeId(item.idTecnico)
    if (id) {
      const tecnicoName = item.tecnico?.trim() || `Tecnico ${id}`
      const nameKey = normalizePersonNameKey(tecnicoName)
      if (nameKey && idByNameKey.has(nameKey) && idByNameKey.get(nameKey) !== id) {
        continue
      }
      byId.set(id, { ...item, idTecnico: id, tecnico: tecnicoName })
      if (nameKey) {
        idByNameKey.set(nameKey, id)
      }
    }
  }

  for (const item of pendientes) {
    addTecnico(item.idTecnico, item.tecnicoNombre)
    addTecnico(item.idAuxiliar, item.auxiliarNombre)
  }
  for (const item of confirmados) {
    addTecnico(item.idTecnico, item.tecnicoNombre)
    addTecnico(item.idAuxiliar, item.auxiliarNombre)
  }

  return Array.from(byId.values()).sort((a, b) => (a.tecnico || '').localeCompare(b.tecnico || '', 'es'))
}

const JornadaTecnicoThumb = ({
  idInicio,
  nombre,
  onOpen,
}: {
  idInicio: string
  nombre: string
  onOpen: (src: string) => void
}) => {
  const imagenQuery = useQuery({
    queryKey: ['supervision', 'jornada-imagen-miniatura', idInicio],
    queryFn: () => fetchInicioJornadaImagen(idInicio, 'supervisor', true),
    enabled: Boolean(idInicio),
    staleTime: 10 * 60_000,
    retry: false,
  })
  const imagenCompletaQuery = useQuery({
    queryKey: ['supervision', 'jornada-imagen-completa', idInicio],
    queryFn: () => fetchInicioJornadaImagen(idInicio, 'supervisor', false),
    enabled: false,
    staleTime: 10 * 60_000,
    retry: false,
  })
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagenQuery.data) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(imagenQuery.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imagenQuery.data])

  const handleOpen = async () => {
    try {
      const result = await imagenCompletaQuery.refetch()
      if (result.data) {
        onOpen(URL.createObjectURL(result.data))
        return
      }
    } catch {
      // Si falla la foto completa, al menos abre la miniatura visible.
    }
    if (imagenQuery.data) {
      onOpen(URL.createObjectURL(imagenQuery.data))
    }
  }

  return (
    <div className="flex min-w-[190px] items-center gap-2">
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase text-slate-400 transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default"
        onClick={handleOpen}
        disabled={!objectUrl || imagenCompletaQuery.isFetching}
        title={objectUrl ? `Ver foto de ${nombre}` : 'Sin foto disponible'}
      >
        {objectUrl ? (
          <img src={objectUrl} alt={`Foto ${nombre}`} className="h-full w-full object-cover" loading="lazy" />
        ) : imagenQuery.isLoading ? (
          '...'
        ) : (
          'SF'
        )}
      </button>
      <span className="min-w-0 break-words font-semibold text-slate-800">{nombre}</span>
    </div>
  )
}


const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

/** Reduce la foto antes de enviarla (lado mayor y calidad JPEG); el navegador ya aplica la orientacion EXIF. */
const comprimirImagen = (file: File, maxLado: number, calidad: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
      const ancho = Math.max(1, Math.round(img.naturalWidth * escala))
      const alto = Math.max(1, Math.round(img.naturalHeight * escala))
      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas no disponible.'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, ancho, alto)
      ctx.drawImage(img, 0, 0, ancho, alto)
      resolve(canvas.toDataURL('image/jpeg', calidad))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagen no valida.'))
    }
    img.src = url
  })
}

const AprobacionCard = ({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) => (
  <div className="glass-panel p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5">
      <div>
        <h3 className="page-title">{title}</h3>
        {description ? <p className="text-xs text-slate-600">{description}</p> : null}
      </div>
      {actions}
    </div>
    {children}
  </div>
)

const SupervisorSupervisionV2Page = () => {
  const { validateFileSize, FileSizeLimitModal } = useFileSizeLimitModal()
  const { usuario, roleName } = useAuth()
  const rolNormalizado = (roleName || usuario?.rol || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const rolPermitidoConfigurar = ['backoffice', 'backofficev', 'sistemas'].includes(rolNormalizado)
  const esBackofficeODigitador = ['backoffice', 'backofficev', 'digitador'].includes(rolNormalizado)
  // Solo el supervisor finaliza supervisiones; cualquier otro rol unicamente crea pendientes y consulta.
  const esSupervisor = rolNormalizado === 'supervisor'
  const creaComoPendiente = !esSupervisor
  // BackOffice, Digitador y Sistemas ven las supervisiones de TODOS los supervisores; el supervisor solo las suyas.
  const veTodasLasSupervisiones = esBackofficeODigitador || ROLES_TODOS_LOS_TIPOS.includes(rolNormalizado)
  // Sistemas habilita/deshabilita la tuerca desde /sistemas/configuraciones
  const { data: tuercaHabilitadaValor } = useQuery({
    queryKey: ['configuracion-valor', CONFIG_KEYS.supervisionV2TuercaHabilitada],
    queryFn: () => fetchConfiguracionValor(CONFIG_KEYS.supervisionV2TuercaHabilitada),
    enabled: rolPermitidoConfigurar,
    staleTime: 60_000,
  })
  const puedeConfigurar = rolPermitidoConfigurar && tuercaHabilitadaValor === '1'
  const navigate = useNavigate()
  const [supervisorAsignado, setSupervisorAsignado] = useState('')
  // Nombre del supervisor asignado cuando se esta finalizando la pendiente de otro supervisor (cobertura).
  const [avisoCobertura, setAvisoCobertura] = useState('')
  // Campos obligatorios sin llenar tras intentar guardar (se marcan en rojo).
  const [camposInvalidos, setCamposInvalidos] = useState<string[]>([])
  const inv = (campo: string): boolean => camposInvalidos.includes(campo)
  // Respuestas del checklist por id de item.
  const [checklistRespuestas, setChecklistRespuestas] = useState<Record<number, { respuesta: string; observacion: string }>>({})
  // Intercepcion de ruta (2): grupos de checklist que se aplican (por defecto los 3; minimo 1).
  const [gruposChecklistElegidos, setGruposChecklistElegidos] = useState<string[]>(['EPP', 'VEHICULO', 'HERRAMIENTAS'])
  // Cruce de materiales por id de material: cantidad fisica digitada y observacion.
  // El tecnico auxiliar solo se muestra a peticion (check); si el registro ya trae auxiliar, se muestra solo.
  const [conAuxiliar, setConAuxiliar] = useState(false)
  // Checklist compacto: un grupo abierto a la vez (null = el primero) y observaciones opcionales plegadas.
  const [grupoChecklistAbierto, setGrupoChecklistAbierto] = useState<string | null>(null)
  const [obsChecklistAbiertas, setObsChecklistAbiertas] = useState<Record<number, boolean>>({})
  const [cruceMateriales, setCruceMateriales] = useState<Record<number, { cantFisico: string; observacion: string }>>({})
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SupervisionForm>(emptyForm)
  const [filtroDraft, setFiltroDraft] = useState<SupervisionFiltro>(defaultFiltro)
  const [filtroActivo, setFiltroActivo] = useState<SupervisionFiltro>(defaultFiltro)
  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [llamadaModo, setLlamadaModo] = useState<'crear' | 'firmar' | 'ver' | null>(null)
  const [detalleId, setDetalleId] = useState<string>('')
  const [detalleSupervisorId, setDetalleSupervisorId] = useState<string>('')
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [successForm, setSuccessForm] = useState<string | null>(null)
  // Formulario por pasos: paso activo y hasta donde llego el usuario (solo puede volver a los ya completados).
  const [paso, setPaso] = useState('tecnico')
  const [pasoMax, setPasoMax] = useState(0)
  // Supervision recien guardada: permite generar la llamada de atencion al tecnico desde la confirmacion.
  const [postGuardado, setPostGuardado] = useState<{ id: string; tecnico: string; llamadaGenerada: boolean } | null>(null)
  const [llamadaDesdeGuardado, setLlamadaDesdeGuardado] = useState(false)
  const [tecnicoFilter, setTecnicoFilter] = useState('')
  const [tecnicoPickerOpen, setTecnicoPickerOpen] = useState(false)
  const [vistaTopbar, setVistaTopbar] = useState<'sup_v2' | 'supervisiones' | 'agenda' | 'aprobacion'>('aprobacion')
  // Sup_v2 une Supervisiones y Agenda: mismas tarjetas y filtros de la Agenda, pero con las acciones del supervisor.
  const vistaAgendaActiva = vistaTopbar === 'agenda' || vistaTopbar === 'sup_v2'
  const [agendaEstadoVista, setAgendaEstadoVista] = useState<AgendaEstadoVista>('pendientes')
  const [agendaCodigoFiltro, setAgendaCodigoFiltro] = useState('')
  const [agendaTecnicoFiltro, setAgendaTecnicoFiltro] = useState('')
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [supervisorFiltro, setSupervisorFiltro] = useState('')
  const [agendaPendienteFechaDesdeFiltro, setAgendaPendienteFechaDesdeFiltro] = useState('')
  const [agendaPendienteFechaHastaFiltro, setAgendaPendienteFechaHastaFiltro] = useState('')
  const [agendaCompletadaFechaDesdeFiltro, setAgendaCompletadaFechaDesdeFiltro] = useState(() => getTodayIsoDate())
  const [agendaCompletadaFechaHastaFiltro, setAgendaCompletadaFechaHastaFiltro] = useState(() => getTodayIsoDate())
  const [agendaTipoFechaCompletadoFiltro, setAgendaTipoFechaCompletadoFiltro] = useState<'registro' | 'supervision'>('supervision')
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null)
  const [inicioPendienteDetalle, setInicioPendienteDetalle] = useState<SupervisionInicioPendiente | null>(null)
  const [jornadaDetalleModo, setJornadaDetalleModo] = useState<'inicio' | 'cierre'>('inicio')
  const [realizandoPendienteId, setRealizandoPendienteId] = useState<string>('')
  const [jornadaPendienteFiltro, setJornadaPendienteFiltro] = useState<JornadaPendienteFiltro>('hoy')
  const [rechazoInicioId, setRechazoInicioId] = useState<string>('')
  const [rechazoInicioTecnico, setRechazoInicioTecnico] = useState<string>('')
  const [observacionRechazo, setObservacionRechazo] = useState('')
  const [observacionRechazoError, setObservacionRechazoError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (zoomImageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(zoomImageSrc)
      }
    }
  }, [zoomImageSrc])

  const tecnicosQuery = useQuery({
    queryKey: ['supervision', 'tecnicos', usuario?.idUsuario ?? 0],
    queryFn: () => fetchSupervisionTecnicos({ limit: 2000 }),
    staleTime: 60_000,
    enabled: Boolean(usuario?.idUsuario),
  })

  const tiposSupervisionQuery = useQuery({
    queryKey: ['supervision', 'tipos-supervision'],
    queryFn: fetchSupervisionTiposSupervision,
    staleTime: 300_000,
  })

  const tiposTrabajoQuery = useQuery({
    queryKey: ['supervision', 'tipos-trabajo'],
    queryFn: fetchSupervisionTiposTrabajo,
    staleTime: 300_000,
  })

  const supervisionPorQuery = useQuery({
    queryKey: ['supervision-v2', 'supervision-por'],
    queryFn: fetchSupervisionPorOpciones,
    staleTime: 300_000,
  })

  const tecnologiaQuery = useQuery({
    queryKey: ['supervision-v2', 'tecnologias'],
    queryFn: fetchTecnologiaOpciones,
    staleTime: 300_000,
  })

  const checklistItemsQuery = useQuery({
    queryKey: ['supervision-v2', 'checklist-items'],
    queryFn: fetchChecklistItems,
    staleTime: 300_000,
  })

  const materialesCruceQuery = useQuery({
    queryKey: ['supervision-v2', 'materiales-cruce'],
    queryFn: fetchMaterialesCruce,
    staleTime: 300_000,
  })

  const tipoRevisionQuery = useQuery({
    queryKey: ['supervision-v2', 'tipos-revision'],
    queryFn: fetchTipoRevisionOpciones,
    staleTime: 300_000,
  })

  // Tipo 3 (MEDICIONES DE DOCSIS): la revision es solo EXTERNA y se asigna por defecto.
  const soloRevisionExterna = form.idTipoSupervision.trim() === '3'
  const opcionExterna = (tipoRevisionQuery.data ?? []).find((item) => item.toUpperCase().includes('EXTERNA')) ?? 'EXTERNA'
  useEffect(() => {
    if (soloRevisionExterna && form.tipoRevision !== opcionExterna) {
      setForm((prev) => ({ ...prev, tipoRevision: opcionExterna }))
    }
  }, [soloRevisionExterna, opcionExterna, form.tipoRevision])

  const tiposPenalizacionQuery = useQuery({
    queryKey: ['supervision', 'tipos-penalizacion'],
    queryFn: fetchSupervisionTiposPenalizacion,
    staleTime: 300_000,
  })

  const sucursalesQuery = useQuery({
    queryKey: ['supervision', 'sucursales-filtro'],
    queryFn: fetchMisSucursalesSupervision,
    staleTime: 300_000,
  })

  const supervisoresFiltroQuery = useQuery({
    queryKey: ['supervision', 'supervisores-filtro', sucursalFiltro],
    queryFn: () => fetchSupervisores(sucursalFiltro || undefined),
    staleTime: 300_000,
  })

  // En el listado de pendientes el SP no filtra por id de supervisor: se filtra aqui cuando se elige uno.
  const filtrarPorSupervisorElegido = (rows: SupervisionRegistro[]): SupervisionRegistro[] =>
    supervisorFiltro && supervisorFiltro.toUpperCase() !== 'TODOS'
      ? rows.filter((row) => normalizeId(row.idSupervisor) === normalizeId(supervisorFiltro))
      : rows

  const listadoQuery = useQuery({
    queryKey: ['supervision', 'listado', filtroActivo, sucursalFiltro, supervisorFiltro, veTodasLasSupervisiones],
    queryFn: () => {
      const params = {
        fechaDesde: filtroActivo.fechaDesde || undefined,
        fechaHasta: filtroActivo.fechaHasta || undefined,
        sucursal: sucursalFiltro || undefined,
        idSupervisor: supervisorFiltro || undefined,
        limite: 300,
      }
      return veTodasLasSupervisiones ? fetchBackofficeSupervisionesPorEstado('completado', params) : fetchSupervisiones(params)
    },
  })

  const listadoPendientesQuery = useQuery({
    queryKey: ['supervision', 'listado-pendientes', agendaPendienteFechaDesdeFiltro, agendaPendienteFechaHastaFiltro, sucursalFiltro, supervisorFiltro, veTodasLasSupervisiones],
    queryFn: async () => {
      const params = {
        fechaDesde: agendaPendienteFechaDesdeFiltro || undefined,
        fechaHasta: agendaPendienteFechaHastaFiltro || undefined,
        sucursal: sucursalFiltro || undefined,
        idSupervisor: supervisorFiltro || undefined,
        limite: 300,
      }
      if (!veTodasLasSupervisiones) return fetchSupervisionesPendientes(params)
      return filtrarPorSupervisorElegido(await fetchBackofficeSupervisionesPorEstado('pendiente', params))
    },
  })

  const agendaCompletadasQuery = useQuery({
    queryKey: [
      'supervision',
      'agenda-completadas',
      agendaCompletadaFechaDesdeFiltro,
      agendaCompletadaFechaHastaFiltro,
      sucursalFiltro,
      supervisorFiltro,
      agendaTipoFechaCompletadoFiltro,
      veTodasLasSupervisiones,
    ],
    queryFn: () => {
      const params = {
        fechaDesde: agendaCompletadaFechaDesdeFiltro || undefined,
        fechaHasta: agendaCompletadaFechaHastaFiltro || undefined,
        sucursal: sucursalFiltro || undefined,
        idSupervisor: supervisorFiltro || undefined,
        tipoFecha: agendaTipoFechaCompletadoFiltro,
        limite: 300,
      }
      return veTodasLasSupervisiones ? fetchBackofficeSupervisionesPorEstado('completado', params) : fetchSupervisiones(params)
    },
    enabled: vistaAgendaActiva,
  })

  const detalleQuery = useQuery({
    queryKey: ['supervision', 'detalle', detalleId, detalleSupervisorId],
    queryFn: () => fetchSupervisionDetalle(detalleId, detalleSupervisorId || undefined),
    enabled: detalleModalOpen && Boolean(detalleId),
  })

  const checklistDetalleQuery = useQuery({
    queryKey: ['supervision-v2', 'checklist-respuestas', detalleId],
    queryFn: () => fetchChecklistRespuestas(detalleId),
    enabled: detalleModalOpen && Boolean(detalleId),
    retry: false,
  })

  const cruceDetalleQuery = useQuery({
    queryKey: ['supervision-v2', 'cruce-materiales', detalleId],
    queryFn: () => fetchCruceMateriales(detalleId),
    enabled: detalleModalOpen && Boolean(detalleId),
    retry: false,
  })

  const llamadaDetalleQuery = useQuery({
    queryKey: ['supervision-v2', 'llamada', detalleId],
    queryFn: () => fetchLlamadaSupervision(detalleId),
    enabled: detalleModalOpen && Boolean(detalleId),
    retry: false,
  })

  const iniciosPendientesQuery = useQuery({
    queryKey: ['supervision', 'jornada-pendiente-aprobacion', usuario?.idUsuario ?? 0],
    queryFn: fetchIniciosJornadaPendientesSupervision,
    refetchInterval: 20_000,
    enabled: Boolean(usuario?.idUsuario),
  })
  const iniciosConfirmadosHoyQuery = useQuery({
    queryKey: ['supervision', 'jornada-confirmada-hoy', usuario?.idUsuario ?? 0],
    queryFn: fetchIniciosJornadaConfirmadosHoySupervision,
    refetchInterval: 20_000,
    enabled: Boolean(usuario?.idUsuario),
  })
  const jornadaDetalleQuery = useQuery({
    queryKey: ['supervision', 'jornada-detalle', inicioPendienteDetalle?.idInicio ?? ''],
    queryFn: () => fetchHistoricoJornadaDetalle(inicioPendienteDetalle?.idInicio ?? '', 'supervisor'),
    enabled: Boolean(inicioPendienteDetalle?.idInicio),
  })

  useEffect(() => {
    if (!jornadaDetalleQuery.data?.idInicio) return
    setInicioPendienteDetalle((current) => {
      if (!current || current.idInicio !== jornadaDetalleQuery.data?.idInicio) {
        return current
      }
      return { ...current, ...jornadaDetalleQuery.data } as SupervisionInicioPendiente
    })
  }, [jornadaDetalleQuery.data])

  useEffect(() => {
    setSupervisorFiltro('')
  }, [sucursalFiltro])

  useEffect(() => {
    if (registroModalOpen) {
      setPaso('tecnico')
      setPasoMax(0)
      setConAuxiliar(false)
    }
  }, [registroModalOpen])

  const createPendienteMutation = useMutation({
    mutationFn: (payload: SupervisionCreatePayload & { idSupervisorAsignado: string }) => createSupervisionPendiente(payload),
    onSuccess: (result) => {
      setErrorForm(null)
      setSuccessForm(`Supervision pendiente asignada al supervisor. ID: ${result.idSupervision}`)
      setRegistroModalOpen(false)
      setForm(emptyForm())
      setSupervisorAsignado('')
      setRealizandoPendienteId('')
      // Refresca todas las listas de supervision (notas, pendientes y completadas de la agenda) y los detalles abiertos.
      queryClient.invalidateQueries({ queryKey: ['supervision'] })
      queryClient.invalidateQueries({ queryKey: ['supervision-v2'] })
    },
    onError: (error) => {
      setSuccessForm(null)
      setErrorForm(getApiErrorMessage(error, 'No se pudo registrar la supervision pendiente.'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: SupervisionCreatePayload) => createSupervision(payload),
    onSuccess: (result) => {
      setErrorForm(null)
      setSuccessForm(`Nota de supervision registrada. ID: ${result.idSupervision}`)
      if (esSupervisor) {
        setPostGuardado({ id: String(result.idSupervision), tecnico: tecnicoMap.get(normalizeId(form.idTecnicoPrincipal))?.tecnico ?? '', llamadaGenerada: false })
      }
      setRegistroModalOpen(false)
      setForm(emptyForm())
      setRealizandoPendienteId('')
      // Refresca todas las listas de supervision (notas, pendientes y completadas de la agenda) y los detalles abiertos.
      queryClient.invalidateQueries({ queryKey: ['supervision'] })
      queryClient.invalidateQueries({ queryKey: ['supervision-v2'] })
    },
    onError: (error) => {
      setSuccessForm(null)
      setErrorForm(getApiErrorMessage(error, 'No se pudo registrar la supervision.'))
    },
  })

  const realizarPendienteMutation = useMutation({
    mutationFn: ({ idSupervision, payload }: { idSupervision: string; payload: SupervisionCreatePayload }) =>
      realizarSupervisionPendiente(idSupervision, payload),
    onSuccess: (result) => {
      setErrorForm(null)
      setSuccessForm(`Supervision realizada. ID: ${result.idSupervision}`)
      if (esSupervisor) {
        setPostGuardado({ id: String(result.idSupervision), tecnico: tecnicoMap.get(normalizeId(form.idTecnicoPrincipal))?.tecnico ?? '', llamadaGenerada: false })
      }
      setRegistroModalOpen(false)
      setForm(emptyForm())
      setRealizandoPendienteId('')
      // Refresca todas las listas de supervision (notas, pendientes y completadas de la agenda) y los detalles abiertos.
      queryClient.invalidateQueries({ queryKey: ['supervision'] })
      queryClient.invalidateQueries({ queryKey: ['supervision-v2'] })
    },
    onError: (error) => {
      setSuccessForm(null)
      setErrorForm(getApiErrorMessage(error, 'No se pudo realizar la supervision pendiente.'))
    },
  })

  const aprobarInicioMutation = useMutation({
    mutationFn: (idInicio: string) => aprobarInicioJornadaPendiente(idInicio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervision', 'jornada-pendiente-aprobacion'] })
      queryClient.invalidateQueries({ queryKey: ['supervision', 'jornada-confirmada-hoy'] })
      queryClient.invalidateQueries({ queryKey: ['historico-jornadas'] })
    },
  })

  const rechazarInicioMutation = useMutation({
    mutationFn: ({ idInicio, observacionRechazado }: { idInicio: string; observacionRechazado: string }) =>
      rechazarInicioJornadaPendiente(idInicio, observacionRechazado),
    onSuccess: () => {
      setRechazoInicioId('')
      setRechazoInicioTecnico('')
      setObservacionRechazo('')
      setObservacionRechazoError(null)
      queryClient.invalidateQueries({ queryKey: ['supervision', 'jornada-pendiente-aprobacion'] })
      queryClient.invalidateQueries({ queryKey: ['supervision', 'jornada-confirmada-hoy'] })
      queryClient.invalidateQueries({ queryKey: ['historico-jornadas'] })
    },
    onError: (error) => {
      setObservacionRechazoError(getApiErrorMessage(error, 'No se pudo rechazar el inicio de jornada.'))
    },
  })

  const catalogoTecnicos = tecnicosQuery.data ?? []
  const codigoFiltro = filtroActivo.codigo.trim().toLowerCase()
  const listados = (listadoQuery.data ?? []).filter((row) => !codigoFiltro || (row.codigo ?? '').toLowerCase().includes(codigoFiltro))
  const listadosPendientes = listadoPendientesQuery.data ?? []
  const agendaCompletadas = agendaCompletadasQuery.data ?? []
  const listadosCompletadosAgenda = useMemo(
    () => agendaCompletadas.filter(isSupervisionCompletada),
    [agendaCompletadas]
  )
  const supervisionesCompletadasAgenda = listadosCompletadosAgenda.length
  const agendaCodigoBuscado = agendaCodigoFiltro.trim().toLowerCase()
  const agendaTecnicoBuscado = agendaTecnicoFiltro.trim().toLowerCase()
  const agendaRows = (agendaEstadoVista === 'completadas' ? listadosCompletadosAgenda : listadosPendientes).filter(
    (row) =>
      (!agendaCodigoBuscado || (row.codigo ?? '').toLowerCase().includes(agendaCodigoBuscado)) &&
      (!agendaTecnicoBuscado ||
        (row.tecnicoPrincipal ?? '').toLowerCase().includes(agendaTecnicoBuscado))
  )
  const agendaRowsLoading = agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.isLoading : listadoPendientesQuery.isLoading
  const agendaRowsError = agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.error : listadoPendientesQuery.error
  const agendaRowsIsError = agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.isError : listadoPendientesQuery.isError
  const iniciosPendientes = iniciosPendientesQuery.data ?? []
  const iniciosPendientesHoy = useMemo(
    () => iniciosPendientes.filter(isJornadaToday),
    [iniciosPendientes]
  )
  const iniciosPendientesPasados = useMemo(
    () => iniciosPendientes.filter(isJornadaPast),
    [iniciosPendientes]
  )
  const iniciosPendientesFiltrados = jornadaPendienteFiltro === 'pasados' ? iniciosPendientesPasados : iniciosPendientesHoy
  const iniciosConfirmadosHoy = iniciosConfirmadosHoyQuery.data ?? []
  const jornadasConfirmadasDia = iniciosConfirmadosHoy
  const tieneCierreJornada = (row: SupervisionInicioPendiente): boolean =>
    Boolean(row.fechaCierre) ||
    Boolean(row.codigoClienteCierre) ||
    Boolean(row.danoMaterial) ||
    Boolean(row.danoPersona) ||
    Boolean(row.novedadesTrabajo) ||
    Boolean(row.ubicacionCierreGeoref)
  const iniciosConfirmadosAbiertosHoy = useMemo(
    () => jornadasConfirmadasDia.filter((row) => !tieneCierreJornada(row)),
    [jornadasConfirmadasDia]
  )
  const cierresJornadaHoy = useMemo(
    () => jornadasConfirmadasDia.filter((row) => tieneCierreJornada(row)),
    [jornadasConfirmadasDia]
  )
  const jornadasDiaLoading = iniciosConfirmadosHoyQuery.isLoading
  const jornadasDiaFetching = iniciosConfirmadosHoyQuery.isFetching
  const tecnicos = useMemo(
    () => mergeTecnicosDisponibles(catalogoTecnicos, iniciosPendientes, jornadasConfirmadasDia),
    [catalogoTecnicos, iniciosPendientes, jornadasConfirmadasDia]
  )
  const idsSupervisionesPendientes = useMemo(
    () => new Set(listadosPendientes.map((item) => item.idSupervision)),
    [listadosPendientes]
  )

  const abrirDetalleJornada = (row: SupervisionInicioPendiente, modo: 'inicio' | 'cierre') => {
    setInicioPendienteDetalle(row)
    setJornadaDetalleModo(modo)
  }

  const abrirRechazoInicioModal = (row: SupervisionInicioPendiente) => {
    setRechazoInicioId(row.idInicio)
    setRechazoInicioTecnico(row.tecnicoNombre || row.idTecnico || '')
    setObservacionRechazo('')
    setObservacionRechazoError(null)
  }

  const cerrarRechazoInicioModal = () => {
    if (rechazarInicioMutation.isPending) return
    setRechazoInicioId('')
    setRechazoInicioTecnico('')
    setObservacionRechazo('')
    setObservacionRechazoError(null)
  }

  const confirmarRechazoInicio = () => {
    const observacion = observacionRechazo.trim()
    if (!observacion) {
      setObservacionRechazoError('Debes ingresar la observacion del rechazo.')
      return
    }
    rechazarInicioMutation.mutate({ idInicio: rechazoInicioId, observacionRechazado: observacion })
  }

  const pendientesColumns = useMemo<Column<SupervisionInicioPendiente>[]>(() => {
    const resolveTecnicoNombre = (id?: string, nombre?: string): string => {
      if (nombre?.trim()) return nombre.trim()
      const match = tecnicos.find((item) => normalizeId(item.idTecnico) === normalizeId(id))
      if (match?.tecnico?.trim()) return match.tecnico.trim()
      return id || '-'
    }
    return [
      { key: 'fechaRegistro', header: 'Fec.', render: (row) => formatDateTime(row.fechaRegistro) },
      {
        key: 'tecnicoNombre',
        header: 'Tec.',
        render: (row) => (
          <JornadaTecnicoThumb
            idInicio={row.idInicio}
            nombre={resolveTecnicoNombre(row.idTecnico, row.tecnicoNombre)}
            onOpen={setZoomImageSrc}
          />
        ),
      },
      {
        key: 'auxiliarNombre',
        header: 'Aux.',
        render: (row) => resolveTecnicoNombre(row.idAuxiliar, row.auxiliarNombre),
      },
      {
        key: 'supervisorAproboInicio',
        header: 'Sup Aprueba',
        render: (row) => row.supervisorAproboInicio || '-',
      },
      {
        key: 'fechaAprobacionInicio',
        header: 'Fecha Aprobacion',
        render: (row) => (row.fechaAprobacionInicio ? formatDateTime(row.fechaAprobacionInicio) : '-'),
      },
      { key: 'estado', header: 'Est.', render: (row) => tieneCierreJornada(row) ? 'JORNADA FINALIZADA' : (row.estado || 'PENDIENTE') },
      {
        key: 'acciones',
        header: 'Acc.',
        render: (row) => {
          const isAprobada = String(row.estado ?? '').toUpperCase().includes('APROBAD')
          const isCerrada = tieneCierreJornada(row)
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => abrirDetalleJornada(row, 'inicio')}
                disabled={aprobarInicioMutation.isPending || rechazarInicioMutation.isPending}
              >
                Ver inicio
              </Button>
              {!isAprobada && !isCerrada ? (
                <>
                  <Button
                    type="button"
                    onClick={() => aprobarInicioMutation.mutate(row.idInicio)}
                    disabled={aprobarInicioMutation.isPending || rechazarInicioMutation.isPending}
                  >
                    Aprobar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => abrirRechazoInicioModal(row)}
                    disabled={aprobarInicioMutation.isPending || rechazarInicioMutation.isPending}
                  >
                    Rechazar
                  </Button>
                </>
              ) : null}
            </div>
          )
        },
      },
    ]
  }, [aprobarInicioMutation, rechazarInicioMutation, tecnicos])

  const confirmadasColumns = useMemo<Column<SupervisionInicioPendiente>[]>(() => {
    const baseColumns = pendientesColumns.filter((column) => column.key !== 'acciones')
    return [
      ...baseColumns,
      {
        key: 'acciones',
        header: 'Acciones',
        render: (row) => {
          const tieneInicio = Boolean(row.idInicio)
          return (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => abrirDetalleJornada(row, 'inicio')} disabled={!tieneInicio}>
                {tieneInicio ? 'Ver inicio' : 'Sin inicio'}
              </Button>
              {tieneInicio && tieneCierreJornada(row) ? (
                <Button type="button" variant="secondary" onClick={() => abrirDetalleJornada(row, 'cierre')}>
                  Ver cierre
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ]
  }, [pendientesColumns])

  const tecnicoMap = useMemo(() => {
    const map = new Map<string, (typeof tecnicos)[number]>()
    for (const tecnico of tecnicos) {
      map.set(normalizeId(tecnico.idTecnico), tecnico)
    }
    return map
  }, [tecnicos])

  const esRevisionPenalizadaActiva = realizandoPendienteId.startsWith('REV_PENALIZADA:')
  const camposBaseBloqueados = Boolean(realizandoPendienteId) && !esRevisionPenalizadaActiva
  // Al iniciar un registro, BackOffice y Digitador no llenan la ubicacion (la toma el supervisor al realizarla).
  const camposInicioBloqueados = creaComoPendiente && !realizandoPendienteId
  // Reglas del tipo de supervision elegido (campos y fotos que corresponden).
  const reglaTipo: ReglaTipoSupervision | undefined = REGLAS_TIPO_SUPERVISION[form.idTipoSupervision.trim()]
  const mostrarTipoTrabajo = !reglaTipo || reglaTipo.tipoTrabajo
  const mostrarTipoPenalizacion = !reglaTipo || reglaTipo.tipoPenalizacion
  const mostrarTipoRevision = !reglaTipo || reglaTipo.tipoRevision
  const tipoTrabajoNinguna = (tiposTrabajoQuery.data ?? []).some(
    (item) => normalizeId(item.id) === normalizeId(form.idTipoTrabajo) && item.nombre.trim().toUpperCase() === 'NINGUNA',
  )
  const admiteTipoTrabajoNinguna = TIPOS_CON_TIPO_TRABAJO_NINGUNA.includes(form.idTipoSupervision.trim())
  const otYClienteOpcionales = admiteTipoTrabajoNinguna && mostrarTipoTrabajo && tipoTrabajoNinguna
  const fotosDelTipo = reglaTipo ? photoFields.filter((photo) => reglaTipo.fotos.includes(photo.key)) : []
  // Firmas: tecnico (obligatoria) y auxiliar (opcional) segun el tipo; cliente (obligatoria) en supervision de campo Interna e Interna/Externa.
  const pideFirmaTecnico = Boolean(reglaTipo?.firmaTecnico)
  const pideFirmaAuxiliar = Boolean(reglaTipo?.firmaAuxiliar)
  const pideFirmaCliente = Boolean(reglaTipo?.firmaClienteSegunRevision) && form.tipoRevision.trim().toUpperCase().includes('INTERNA')
  const hayFirmas = pideFirmaTecnico || pideFirmaAuxiliar || pideFirmaCliente
  // Checklist que corresponde al tipo (y a la revision en supervision de campo). El cruce de materiales queda para otra fase.
  const reglaChecklist = CHECKLIST_POR_TIPO[form.idTipoSupervision.trim()]
  const revisionMayus = form.tipoRevision.trim().toUpperCase()
  const itemsChecklist: ChecklistItem[] = (checklistItemsQuery.data ?? []).filter((item) => {
    if (!reglaChecklist || camposInicioBloqueados || item.tipoRespuesta === 'CRUCE_MATERIAL') return false
    if (reglaChecklist.grupos?.includes(item.grupo)) return gruposChecklistElegidos.includes(item.grupo)
    if (reglaChecklist.porRevision && item.grupo === 'REVISION' && revisionMayus) {
      // AMBAS = solo Interna/Externa (Conectorizacion y Validacion de material no aplican a Interna o Externa solas).
      if (item.aplicaRevision === 'AMBAS') return revisionMayus.includes('INTERNA') && revisionMayus.includes('EXTERNA')
      if (item.aplicaRevision === 'INTERNA') return revisionMayus.includes('INTERNA')
      if (item.aplicaRevision === 'EXTERNA') return revisionMayus.includes('EXTERNA')
    }
    return false
  })
  // El checklist del tipo de revision va primero; luego EPP / Vehiculo / Herramientas.
  const gruposChecklist = Array.from(new Set(itemsChecklist.map((item) => item.grupo))).sort((a, b) => Number(b === 'REVISION') - Number(a === 'REVISION'))
  // Cruce de materiales: solo supervision de campo (4) con revision Interna/Externa (el item "Validacion de material" aplica a AMBAS).
  const pideCruceMateriales =
    !camposInicioBloqueados &&
    Boolean(reglaChecklist?.porRevision) &&
    revisionMayus.includes('INTERNA') &&
    revisionMayus.includes('EXTERNA') &&
    (checklistItemsQuery.data ?? []).some((item) => item.tipoRespuesta === 'CRUCE_MATERIAL')
  const materialesCruceCatalogo = pideCruceMateriales ? materialesCruceQuery.data ?? [] : []
  const cantFisicoCruce = (idMaterial: number): string => cruceMateriales[idMaterial]?.cantFisico ?? ''
  const observacionCruce = (idMaterial: number): string => cruceMateriales[idMaterial]?.observacion ?? ''
  // Cant/Sistema: lo que el sistema tiene en la OT (spx_ObtenerMaterialesOT_PSupervision); se cruza por nombre de material.
  const tecnicoCruce = tecnicoMap.get(normalizeId(form.idTecnicoPrincipal))?.tecnico ?? ''
  const materialesSistemaQuery = useQuery({
    queryKey: ['supervision-v2', 'materiales-sistema-ot', form.ordenTrabajo.trim(), form.codigo.trim(), tecnicoCruce],
    queryFn: () => fetchMaterialesSistemaOt(form.ordenTrabajo.trim(), form.codigo.trim(), tecnicoCruce),
    enabled: pideCruceMateriales && Boolean(form.ordenTrabajo.trim()) && Boolean(form.codigo.trim()),
    retry: false,
  })
  const cantSistemaCruce = (material: string): number => {
    const clave = sinTildes(material)
    return (materialesSistemaQuery.data ?? []).filter((fila) => sinTildes(fila.material) === clave).reduce((acc, fila) => acc + fila.cantidad, 0)
  }
  // Solo se cruzan los materiales con cantidad en el sistema (> 0). Mientras la consulta no responde (o falla) se muestra el catalogo completo.
  const materialesCruce = materialesSistemaQuery.isSuccess
    ? materialesCruceCatalogo.filter((material) => cantSistemaCruce(material.material) > 0)
    : materialesCruceCatalogo
  // Diferencia = fisico - sistema; vacia mientras el supervisor no digita el fisico o cuando no hay diferencia.
  const diferenciaCruce = (idMaterial: number, material: string): number | null => {
    const fisico = cantFisicoCruce(idMaterial)
    if (fisico === '') return null
    const diferencia = Number(fisico) - cantSistemaCruce(material)
    return diferencia === 0 ? null : diferencia
  }
  const respuestaChecklist = (idItem: number): string => checklistRespuestas[idItem]?.respuesta ?? ''
  const observacionChecklist = (idItem: number): string => checklistRespuestas[idItem]?.observacion ?? ''
  const checklistExigeObservacion = (item: ChecklistItem): boolean => {
    const respuesta = sinTildes(respuestaChecklist(item.id))
    return Boolean(respuesta) && item.respuestasObliganObs.some((negativa) => sinTildes(negativa) === respuesta)
  }
  // Cada rol solo ve los tipos de supervision que le corresponden.
  const tiposSupervisionPermitidos = (tiposSupervisionQuery.data ?? []).filter((tipo) => {
    const regla = REGLAS_TIPO_SUPERVISION[normalizeId(tipo.id)]
    return !regla || ROLES_TODOS_LOS_TIPOS.includes(rolNormalizado) || regla.roles.includes(rolNormalizado)
  })
  const cambiarTipoSupervision = (idTipo: string) => {
    const regla = REGLAS_TIPO_SUPERVISION[idTipo.trim()]
    setChecklistRespuestas({})
    setCruceMateriales({})
    setForm((prev) => {
      const siguiente: SupervisionForm = { ...prev, idTipoSupervision: idTipo }
      if (regla) {
        // Lo que el tipo no usa se descarta para no guardar datos que no corresponden.
        if (!regla.tipoTrabajo) siguiente.idTipoTrabajo = ''
        if (!TIPOS_CON_TIPO_TRABAJO_NINGUNA.includes(idTipo.trim()) && tiposTrabajoQuery.data?.some((item) => normalizeId(item.id) === normalizeId(prev.idTipoTrabajo) && item.nombre.trim().toUpperCase() === 'NINGUNA')) siguiente.idTipoTrabajo = ''
        if (!regla.tipoPenalizacion) siguiente.idTipoPenalizacion = ''
        if (!regla.tipoRevision) siguiente.tipoRevision = ''
        for (const photo of photoFields) {
          if (!regla.fotos.includes(photo.key)) siguiente[photo.key] = ''
        }
        if (!regla.firmaTecnico) siguiente.firmaTecnico = ''
        if (!regla.firmaAuxiliar) siguiente.firmaAuxiliar = ''
        if (!regla.firmaClienteSegunRevision) siguiente.firmaCliente = ''
      }
      return siguiente
    })
  }
  // "Observaciones de Agenda" (descripcion adicional) la escribe BackOffice/Digitador; el Supervisor solo la ve.
  const descripcionAdicionalBloqueada = camposBaseBloqueados || esSupervisor

  const abrirRealizarPendiente = (row: SupervisionRegistro) => {
    // BackOffice y Digitador solo consultan: ven el detalle de lectura y no pueden finalizar la supervision.
    if (creaComoPendiente) {
      setDetalleId(row.idSupervision)
      setDetalleSupervisorId(normalizeId(row.idSupervisor) || supervisorFiltro)
      setDetalleModalOpen(true)
      return
    }
    setForm({
      idTecnicoPrincipal: normalizeId(row.idTecnicoPrincipal),
      idTecnicoAuxiliar: (row.tecnicoAuxiliar || row.idTecnicoAuxiliar || '').trim().toUpperCase(),
      idTipoSupervision: normalizeId(row.idTipoSupervision),
      idTipoTrabajo: normalizeId(row.idTipoTrabajo),
      idTipoPenalizacion: normalizeId(row.idTipoPenalizacion),
      supervisionPor: row.supervisionPor || '',
      tecnologia: row.tecnologia || '',
      codigo: row.codigo || '',
      ordenTrabajo: row.ordenTrabajo || '',
      tipoRevision: row.tipoRevision || '',
      ubicacion: row.ubicacion || '',
      observacion: row.observacion || '',
      descripcionAdicionalObservacion: row.descripcionAdicionalObservacion || '',
      fotoBoletaSupervision: row.fotoBoletaSupervision || '',
      fotoCanalesPilos: row.fotoCanalesPilos || '',
      fotoNivelesDocsis: row.fotoNivelesDocsis || '',
      fotoMedicionRuido: row.fotoMedicionRuido || '',
      fotoBarridoCanales: row.fotoBarridoCanales || '',
      fotoObservacion1: row.fotoObservacion1 || '',
      fotoObservacion2: row.fotoObservacion2 || '',
      fotoObservacion3: row.fotoObservacion3 || '',
      fotoObservacion4: row.fotoObservacion4 || '',
      firmaTecnico: row.firmaTecnico || '',
      firmaAuxiliar: row.firmaAuxiliar || '',
      firmaCliente: row.firmaCliente || '',
    })
    // Cobertura: si la pendiente esta asignada a otro supervisor, se avisa que al finalizarla pasa a ser responsable.
    const idAsignado = normalizeId(row.idSupervisor)
    const esDeOtro = Boolean(idAsignado) && idAsignado !== normalizeId(usuario?.idUsuario)
    setAvisoCobertura(esDeOtro ? row.supervisor || `supervisor ${idAsignado}` : '')
    setRealizandoPendienteId(row.idSupervision)
    setTecnicoFilter('')
    setErrorForm(null)
    setSuccessForm(null)
    setRegistroModalOpen(true)
  }

  const filterTecnicos = (items: typeof tecnicos) => {
    const query = tecnicoFilter.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const id = normalizeId(item.idTecnico).toLowerCase()
      const nombre = (item.tecnico ?? '').toLowerCase()
      return id.includes(query) || nombre.includes(query)
    })
  }

  // El tecnico ya elegido se conserva en la lista aunque no coincida con la busqueda, para que el select no quede en blanco.
  const tecnicosPrincipalFiltrados = useMemo(() => {
    const filtrados = filterTecnicos(tecnicos)
    const elegido = tecnicos.find((item) => normalizeId(item.idTecnico) === normalizeId(form.idTecnicoPrincipal))
    return elegido && !filtrados.includes(elegido) ? [elegido, ...filtrados] : filtrados
  }, [tecnicoFilter, tecnicos, form.idTecnicoPrincipal])

  const columns = useMemo<Column<SupervisionRegistro>[]>(() => {
    const tipoSupervisionMap = new Map<string, string>(
      (tiposSupervisionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])
    )

    const resolveTipoSupervision = (row: SupervisionRegistro): string => {
      const id = normalizeId(row.idTipoSupervision)
      const porCatalogo = id ? tipoSupervisionMap.get(id) : undefined
      if (porCatalogo?.trim()) return porCatalogo.trim()
      if (row.tipoSupervision?.trim() && row.tipoSupervision.trim() !== id) return row.tipoSupervision.trim()
      return id || '-'
    }

    return [
      {
        key: 'id',
        header: 'Id',
        render: (row) => <span className="font-mono text-[11px] text-slate-700">{row.id || row.idSupervision || '-'}</span>,
      },
      {
        key: 'supervisor',
        header: 'Supervisor',
        render: (row) => <span className="text-[11px] font-medium text-slate-900">{row.supervisor || '-'}</span>,
      },
      {
        key: 'tipoSupervision',
        header: 'Tipo Supervision',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-900">
              {resolveTipoSupervision(row)}
            </span>
            {row.origen === 'CORREO' || row.origen === 'REV_PENALIZADA' || row.origenExterno ? (
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Revision penalizada
              </span>
            ) : null}
            {tieneLlamadaAtencion(row) ? <MarcaLlamada /> : null}
          </div>
        ),
      },
      {
        key: 'tecnicoPrincipal',
        header: 'Tecnico',
        render: (row) => <span className="text-[11px] font-medium text-slate-900">{row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || '-'}</span>,
      },
      {
        key: 'codigo',
        header: 'Codigo Cliente',
        render: (row) => <span className="font-mono text-[11px] text-slate-700">{row.codigo || '-'}</span>,
      },
      {
        key: 'ordenTrabajo',
        header: 'OT',
        render: (row) => <span className="font-mono text-[11px] text-slate-700">{row.ordenTrabajo || '-'}</span>,
      },
      {
        key: 'fechaRegistro',
        header: 'Fecha Agenda',
        render: (row) => {
          const { date, time } = formatDateParts(row.fechaRegistro)
          return (
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-slate-900">{date}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{time}</p>
            </div>
          )
        },
      },
      {
        key: 'fechaSupervision',
        header: 'Fecha Supervision',
        render: (row) => {
          const { date, time } = formatDateParts(row.fechaSupervision)
          return (
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-slate-900">{date}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{time}</p>
            </div>
          )
        },
      },
      {
        key: 'creadoPor',
        header: 'Creado Por',
        render: (row) => <span className="text-[11px] text-slate-700">{row.creadoPor || '-'}</span>,
      },
      {
        key: 'acciones',
        header: 'Acciones',
        render: (row) => {
          const estado = String(row.estadoSup || '').trim().toLowerCase()
          const esPendiente = estado === 'pendiente' || estado === 'pendientes' || idsSupervisionesPendientes.has(row.idSupervision)
          return esPendiente ? (
            <Button type="button" className="px-2.5 py-1 text-[11px]" onClick={() => abrirRealizarPendiente(row)}>
              {creaComoPendiente ? 'Ver detalle' : 'Realizar supervision'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="px-2.5 py-1 text-[11px]"
              onClick={() => {
                setDetalleId(row.idSupervision)
                setDetalleSupervisorId(normalizeId(row.idSupervisor) || supervisorFiltro)
                setDetalleModalOpen(true)
              }}
            >
              Ver detalle
            </Button>
          )
        },
      },
    ]
  }, [idsSupervisionesPendientes, tecnicoMap, tiposSupervisionQuery.data])

  // Agenda Supervision es solo de consulta: misma tabla, pero la accion siempre es "Ver detalle".
  const agendaColumns = useMemo<Column<SupervisionRegistro>[]>(
    () =>
      columns.map((col) =>
        col.key === 'acciones'
          ? {
              ...col,
              render: (row: SupervisionRegistro) => (
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2.5 py-1 text-[11px]"
                  onClick={() => {
                    setDetalleId(row.idSupervision)
                    setDetalleSupervisorId(normalizeId(row.idSupervisor) || supervisorFiltro)
                    setDetalleModalOpen(true)
                  }}
                >
                  Ver detalle
                </Button>
              ),
            }
          : col
      ),
    [columns, supervisorFiltro]
  )

  const tipoSupervisionMap = useMemo(
    () => new Map<string, string>((tiposSupervisionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposSupervisionQuery.data]
  )
  const tipoTrabajoMap = useMemo(
    () => new Map<string, string>((tiposTrabajoQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposTrabajoQuery.data]
  )
  const tipoPenalizacionMap = useMemo(
    () => new Map<string, string>((tiposPenalizacionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposPenalizacionQuery.data]
  )
  const resolveTipoSupervisionDetalle = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoSupervision || row.tipoSupervision)
    const byCatalog = id ? tipoSupervisionMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoSupervision?.trim() && row.tipoSupervision.trim() !== id) return row.tipoSupervision.trim()
    return id || '-'
  }
  const resolveTipoTrabajoDetalle = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoTrabajo || row.tipoTrabajo)
    const byCatalog = id ? tipoTrabajoMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoTrabajo?.trim() && row.tipoTrabajo.trim() !== id) return row.tipoTrabajo.trim()
    return id || '-'
  }
  const resolveTipoPenalizacionDetalle = (row: SupervisionRegistro): string => {
    const id = normalizeId(row.idTipoPenalizacion || row.tipoPenalizacion)
    const byCatalog = id ? tipoPenalizacionMap.get(id) : undefined
    if (byCatalog?.trim()) return byCatalog.trim()
    if (row.tipoPenalizacion?.trim() && row.tipoPenalizacion.trim() !== id) return row.tipoPenalizacion.trim()
    return id || '-'
  }

  const handlePhotoChange = async (field: keyof SupervisionForm, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!validateFileSize(file)) return
    try {
      // Niveles DOCSIS y medicion de ruido se leen numeros: mas resolucion y calidad que el resto.
      const alta = field === 'fotoNivelesDocsis' || field === 'fotoMedicionRuido'
      let dataUrl: string
      try {
        dataUrl = await comprimirImagen(file, alta ? 1600 : 1280, alta ? 0.85 : 0.75)
      } catch {
        dataUrl = await toDataUrl(file)
      }
      setForm((prev) => ({ ...prev, [field]: dataUrl }))
    } catch {
      setErrorForm('No se pudo cargar una imagen seleccionada.')
    }
  }

  const normalizeOnlyDigits = (value: string): string => value.replace(/\D+/g, '')

  const calcularFaltantes = (): string[] => {
    const faltantes: string[] = []
    if (creaComoPendiente && !realizandoPendienteId && !supervisorAsignado.trim()) {
      faltantes.push('supervisorAsignado')
    }
    for (const field of requiredFields) {
      if (field === 'ubicacion' && camposInicioBloqueados) continue
      if (field === 'idTipoTrabajo' && !mostrarTipoTrabajo) continue
      if (field === 'idTipoPenalizacion' && !mostrarTipoPenalizacion) continue
      if (field === 'tipoRevision' && !mostrarTipoRevision) continue
      if ((field === 'codigo' || field === 'ordenTrabajo') && otYClienteOpcionales) continue
      if (!form[field].trim()) faltantes.push(field)
    }
    if (!camposInicioBloqueados) {
      if (pideFirmaTecnico && !form.firmaTecnico.trim()) faltantes.push('firmaTecnico')
      if (pideFirmaCliente && !form.firmaCliente.trim()) faltantes.push('firmaCliente')
    }
    // Checklist: todos los items del tipo se responden; si la respuesta es la negativa, la observacion es obligatoria.
    for (const item of itemsChecklist) {
      if (!respuestaChecklist(item.id)) faltantes.push(`chk_${item.id}`)
      else if (checklistExigeObservacion(item) && !observacionChecklist(item.id).trim()) faltantes.push(`chkobs_${item.id}`)
    }
    // Cruce de materiales: la cantidad fisica de cada material es obligatoria.
    for (const material of materialesCruce) {
      const fisico = cantFisicoCruce(material.id)
      if (fisico === '' || Number(fisico) < 0 || !Number.isInteger(Number(fisico))) faltantes.push(`cruce_${material.id}`)
      else if (diferenciaCruce(material.id, material.material) !== null && !observacionCruce(material.id).trim()) faltantes.push(`cruceobs_${material.id}`)
    }
    return faltantes
  }

  // A que paso del formulario pertenece cada campo obligatorio.
  const pasoDeCampo = (campo: string): string => {
    if (['supervisorAsignado', 'idTecnicoPrincipal', 'idTipoSupervision', 'idTipoTrabajo', 'idTipoPenalizacion', 'supervisionPor', 'codigo', 'ordenTrabajo'].includes(campo)) return 'tecnico'
    if (['tecnologia', 'tipoRevision', 'ubicacion', 'observacion'].includes(campo)) return 'obra'
    if (campo.startsWith('chk')) return 'checklist'
    if (campo.startsWith('cruce')) return 'cruce'
    if (campo === 'firmaTecnico' || campo === 'firmaCliente') return 'firmas'
    return 'fotos'
  }

  const pasosForm = [
    { id: 'tecnico', titulo: 'Tecnico y supervision' },
    { id: 'obra', titulo: 'Obra y ubicacion' },
    ...(itemsChecklist.length > 0 ? [{ id: 'checklist', titulo: 'Checklist' }] : []),
    ...(materialesCruce.length > 0 ? [{ id: 'cruce', titulo: 'Cruce de materiales' }] : []),
    ...(!camposInicioBloqueados ? [{ id: 'fotos', titulo: 'Archivos y fotos' }] : []),
    ...(!camposInicioBloqueados && hayFirmas ? [{ id: 'firmas', titulo: 'Firmas' }] : []),
  ]
  const pasoIdx = Math.max(0, pasosForm.findIndex((item) => item.id === paso))
  const pasoActualId = pasosForm[pasoIdx].id
  const esUltimoPaso = pasoIdx >= pasosForm.length - 1
  const clasePaso = (id: string): string => (id === pasoActualId ? '' : 'hidden')
  // La firma se dibuja sobre un canvas: se monta recien al llegar a ese paso (oculto no tendria tamano).
  const idxFirmas = pasosForm.findIndex((item) => item.id === 'firmas')
  const firmasMontadas = idxFirmas >= 0 && (pasoIdx >= idxFirmas || pasoMax >= idxFirmas)

  const marcarFaltantes = (faltantes: string[]) => {
    setCamposInvalidos(faltantes)
    window.setTimeout(() => {
      document.querySelector('.field-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  // No se pasa al siguiente paso hasta tener completo el actual.
  const irSiguientePaso = () => {
    const faltantesPaso = calcularFaltantes().filter((campo) => pasoDeCampo(campo) === pasoActualId)
    if (faltantesPaso.length > 0) {
      marcarFaltantes(faltantesPaso)
      setErrorForm('Completa los campos marcados en rojo para continuar.')
      return
    }
    setErrorForm(null)
    setCamposInvalidos([])
    const siguiente = Math.min(pasoIdx + 1, pasosForm.length - 1)
    setPaso(pasosForm[siguiente].id)
    setPasoMax((prev) => Math.max(prev, siguiente))
  }

  const irPasoAnterior = () => {
    setErrorForm(null)
    setPaso(pasosForm[Math.max(0, pasoIdx - 1)].id)
  }

  const validateForm = (): string | null => {
    const faltantes = calcularFaltantes()
    if (faltantes.length === 0) {
      setCamposInvalidos([])
      return null
    }
    // Lleva al primer paso que tenga algo sin completar.
    const primero = pasosForm.findIndex((item) => faltantes.some((campo) => pasoDeCampo(campo) === item.id))
    if (primero >= 0) setPaso(pasosForm[primero].id)
    marcarFaltantes(faltantes)
    return 'Completa los campos marcados en rojo.'
  }

  const submitForm = () => {
    const validationError = validateForm()
    if (validationError) {
      setSuccessForm(null)
      setErrorForm(validationError)
      return
    }

    const payload: SupervisionCreatePayload = {
      idTecnicoPrincipal: form.idTecnicoPrincipal,
      idTecnicoAuxiliar: form.idTecnicoAuxiliar.trim().toUpperCase(),
      idTipoSupervision: form.idTipoSupervision,
      idTipoTrabajo: form.idTipoTrabajo,
      idTipoPenalizacion: form.idTipoPenalizacion,
      supervisionPor: form.supervisionPor.trim(),
      tecnologia: form.tecnologia.trim(),
      codigo: form.codigo.trim(),
      ordenTrabajo: form.ordenTrabajo.trim(),
      tipoRevision: form.tipoRevision.trim(),
      ubicacion: form.ubicacion.trim(),
      observacion: toOptional(form.observacion),
      descripcionAdicionalObservacion: toOptional(form.descripcionAdicionalObservacion),
      fotoBoletaSupervision: toOptional(form.fotoBoletaSupervision),
      fotoCanalesPilos: toOptional(form.fotoCanalesPilos),
      fotoNivelesDocsis: toOptional(form.fotoNivelesDocsis),
      fotoMedicionRuido: toOptional(form.fotoMedicionRuido),
      fotoBarridoCanales: toOptional(form.fotoBarridoCanales),
      fotoObservacion1: toOptional(form.fotoObservacion1),
      fotoObservacion2: toOptional(form.fotoObservacion2),
      fotoObservacion3: toOptional(form.fotoObservacion3),
      fotoObservacion4: toOptional(form.fotoObservacion4),
      // Solo se envian las firmas que el tipo (y la revision) realmente piden.
      firmaTecnico: pideFirmaTecnico ? toOptional(form.firmaTecnico) : undefined,
      firmaAuxiliar: pideFirmaAuxiliar ? toOptional(form.firmaAuxiliar) : undefined,
      firmaCliente: pideFirmaCliente ? toOptional(form.firmaCliente) : undefined,
      checklist:
        itemsChecklist.length > 0
          ? itemsChecklist.map((item) => ({
              idItem: item.id,
              respuesta: respuestaChecklist(item.id),
              observacion: toOptional(observacionChecklist(item.id)),
            }))
          : undefined,
      materialesCruce:
        materialesCruce.length > 0
          ? materialesCruce.map((material) => ({
              idMaterial: material.id,
              cantSistema: cantSistemaCruce(material.material),
              cantFisico: Number(cantFisicoCruce(material.id)),
              observacion: toOptional(observacionCruce(material.id)),
            }))
          : undefined,
    }

    setErrorForm(null)
    setSuccessForm(null)
    if (realizandoPendienteId) {
      realizarPendienteMutation.mutate({ idSupervision: realizandoPendienteId, payload })
    } else if (creaComoPendiente) {
      // BackOffice / Digitador no finalizan: dejan la supervision PENDIENTE para el supervisor elegido.
      createPendienteMutation.mutate({ ...payload, idSupervisorAsignado: supervisorAsignado })
    } else {
      createMutation.mutate(payload)
    }
  }

  // El campo deja de estar en rojo apenas se llena.
  useEffect(() => {
    if (camposInvalidos.length === 0) return
    setCamposInvalidos((prev) => {
      const siguientes = prev.filter((campo) => {
        if (campo === 'supervisorAsignado') return !supervisorAsignado.trim()
        if (campo.startsWith('chk_')) return !respuestaChecklist(Number(campo.slice(4)))
        if (campo.startsWith('cruce_')) return cantFisicoCruce(Number(campo.slice(6))) === ''
        if (campo.startsWith('cruceobs_')) return !observacionCruce(Number(campo.slice(9))).trim()
        if (campo.startsWith('chkobs_')) {
          const item = itemsChecklist.find((it) => it.id === Number(campo.slice(7)))
          return Boolean(item) && checklistExigeObservacion(item as ChecklistItem) && !observacionChecklist((item as ChecklistItem).id).trim()
        }
        return !String(form[campo as keyof SupervisionForm] ?? '').trim()
      })
      return siguientes.length === prev.length ? prev : siguientes
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, supervisorAsignado, checklistRespuestas, cruceMateriales, camposInvalidos.length])

  const closeRegistroModal = () => {
    setRegistroModalOpen(false)
    setPaso('tecnico')
    setPasoMax(0)
    setAvisoCobertura('')
    setChecklistRespuestas({})
    setCruceMateriales({})
    setCamposInvalidos([])
    setSupervisorAsignado('')
    setRealizandoPendienteId('')
    setForm(emptyForm())
    setErrorForm(null)
    setTecnicoFilter('')
  }

  const detalle = detalleQuery.data

  return (
    <div className="bento-page supervision-page gap-2 text-[13px] sm:gap-2.5">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <h2 className="shrink-0 page-title">Supervision</h2>
          {vistaAgendaActiva ? <div className="ml-auto flex gap-1.5">
            <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-blue-100 bg-blue-50/60 px-1.5 py-1 text-center sm:px-2.5">
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-slate-500">Total</p>
              <p className="text-base font-extrabold leading-none text-brand-600">{listadosPendientes.length + supervisionesCompletadasAgenda}</p>
            </div>
            <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-amber-100 bg-amber-50/70 px-1.5 py-1 text-center sm:px-2.5">
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-amber-700">Pend</p>
              <p className="text-base font-extrabold leading-none text-amber-600">{listadosPendientes.length}</p>
            </div>
            <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-emerald-100 bg-emerald-50/70 px-1.5 py-1 text-center sm:px-2.5">
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-emerald-700">Comp</p>
              <p className="text-base font-extrabold leading-none text-emerald-600">{supervisionesCompletadasAgenda}</p>
            </div>
          </div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 px-2 py-1.5 sm:px-3">
          {(
            [
              { key: 'sup_v2' as const, label: 'Sup_v2', icon: faClipboardList, count: 0 },
              { key: 'supervisiones' as const, label: 'Supervisiones', icon: faListUl, count: 0, oculto: true },
              { key: 'agenda' as const, label: 'Agenda Supervisión', icon: faClipboardList, count: 0, oculto: true },
              { key: 'aprobacion' as const, label: 'Aprobación de jornada', icon: faCheckCircle, count: iniciosPendientesPasados.length },
            ]
          ).filter((tab) => !tab.oculto).map((tab) => {
            const active = vistaTopbar === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if ((tab.key === 'agenda' || tab.key === 'sup_v2') && !supervisorFiltro) setSupervisorFiltro('TODOS')
                  setVistaTopbar(tab.key)
                }}
                className={`inline-flex items-center gap-1.5 rounded-t-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
                {tab.count > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? 'bg-blue-500 text-white' : 'bg-red-600 text-white'}`}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                ) : null}
              </button>
            )
          })}
          <button
            type="button"
            title={
              puedeConfigurar
                ? 'Configuración'
                : rolPermitidoConfigurar
                  ? 'Deshabilitada por Sistemas'
                  : 'Solo BackOffice y Sistemas'
            }
            aria-label="Configuración"
            disabled={!puedeConfigurar}
            onClick={() => navigate('/supervisor/supervision_v2Configuracion')}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>

        {vistaTopbar === 'supervisiones' ? (
          <details open className="group border-t border-slate-200 px-2 py-1 sm:px-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
              <span className="group-open:hidden">Mostrar filtros y acciones</span>
              <span className="hidden group-open:inline">Ocultar filtros y acciones</span>
              <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <div className="pb-2 pt-1.5">
              <div className="grid gap-2 md:grid-cols-5">
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Sucursal
                  <select
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                    value={sucursalFiltro}
                    onChange={(event) => setSucursalFiltro(event.target.value)}
                    disabled={sucursalesQuery.isLoading}
                  >
                    <option value="">Mi sucursal</option>
                    <option value="TODOS">Todos</option>
                    {(sucursalesQuery.data ?? []).map((sucursal) => (
                      <option key={sucursal} value={sucursal}>
                        {sucursal}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Supervisor
                  <select
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                    value={supervisorFiltro}
                    onChange={(event) => setSupervisorFiltro(event.target.value)}
                    disabled={supervisoresFiltroQuery.isLoading}
                  >
                    <option value="">Mi usuario</option>
                    <option value="TODOS">Todos</option>
                    {(supervisoresFiltroQuery.data ?? []).map((item) => (
                      <option key={item.idSupervisor} value={item.idSupervisor}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Codigo cliente
                  <input
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                    type="text"
                    inputMode="numeric"
                    maxLength={30}
                    value={filtroDraft.codigo}
                    onChange={(event) => setFiltroDraft((prev) => ({ ...prev, codigo: event.target.value.replace(/[^0-9]/g, '') }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setFiltroActivo(filtroDraft)
                    }}
                  />
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Fecha desde
                  <input
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                    type="date"
                    value={filtroDraft.fechaDesde}
                    onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaDesde: event.target.value }))}
                  />
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Fecha hasta
                  <input
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                    type="date"
                    value={filtroDraft.fechaHasta}
                    onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaHasta: event.target.value }))}
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="px-3 text-xs"
                  onClick={() => {
                    setRealizandoPendienteId('')
                    setForm(emptyForm())
                    setErrorForm(null)
                    setTecnicoFilter('')
                    setRegistroModalOpen(true)
                  }}
                >
                  + Nueva supervision
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 text-xs"
                  onClick={() => { setFiltroDraft(emptyFiltro()); setFiltroActivo(emptyFiltro()) }}
                >
                  Limpiar
                </Button>
                <Button type="button" className="px-3 text-xs" onClick={() => setFiltroActivo(filtroDraft)}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  Buscar
                </Button>
              </div>
            </div>
          </details>
        ) : null}
      </section>

      {vistaTopbar === 'aprobacion' ? (
        <div className="grid grid-cols-1 gap-3">
          <AprobacionCard
            title="Pendientes de aprobacion"
            description={`Pendientes: ${iniciosPendientesFiltrados.length}. Hoy: ${iniciosPendientesHoy.length}. Pasados: ${iniciosPendientesPasados.length}. El tecnico no podra cerrar jornada hasta aprobar.`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={jornadaPendienteFiltro === 'hoy' ? 'primary' : 'secondary'}
                  className="relative !px-3 !py-1.5 !text-xs"
                  onClick={() => setJornadaPendienteFiltro('hoy')}
                >
                  Hoy
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 text-xs font-extrabold leading-none text-slate-800">
                    {iniciosPendientesHoy.length}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={jornadaPendienteFiltro === 'pasados' ? 'primary' : 'secondary'}
                  className="relative !px-3 !py-1.5 !text-xs"
                  onClick={() => setJornadaPendienteFiltro('pasados')}
                >
                  Pasados
                  {iniciosPendientesPasados.length > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-extrabold leading-none text-white shadow">
                      {iniciosPendientesPasados.length > 99 ? '99+' : iniciosPendientesPasados.length}
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 text-xs font-extrabold leading-none text-slate-800">
                      0
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={() => iniciosPendientesQuery.refetch()}
                  disabled={iniciosPendientesQuery.isFetching}
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  Recargar pendientes
                </Button>
              </div>
            }
          >
            <div className="[&_table]:!text-[11px]">
              {iniciosPendientesQuery.isError ? (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getApiErrorMessage(iniciosPendientesQuery.error, 'No se pudo cargar pendientes de jornada.')}
                </div>
              ) : null}
              <Table
                columns={pendientesColumns}
                data={iniciosPendientesFiltrados}
                pageSize={10}
                variant="row-block"
                mobileRowBlockMode="cards"
                mobilePlainCards
                density="compact"
                stickyHeader
                flat
                desktopMinWidthClass="min-w-[760px]"
                emptyLabel={iniciosPendientesQuery.isLoading ? 'Cargando pendientes...' : jornadaPendienteFiltro === 'pasados' ? 'NO HAY PENDIENTES PASADOS' : 'NO HAY PENDIENTES PARA HOY'}
              />
            </div>
          </AprobacionCard>

          <AprobacionCard
            title="Confirmadas hoy"
            description={`Total confirmadas abiertas hoy: ${iniciosConfirmadosAbiertosHoy.length}`}
            actions={
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() => {
                  iniciosConfirmadosHoyQuery.refetch()
                }}
                disabled={jornadasDiaFetching}
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Recargar confirmadas
              </Button>
            }
          >
            <div className="[&_table]:!text-[11px]">
              <Table
                columns={confirmadasColumns}
                data={iniciosConfirmadosAbiertosHoy}
                pageSize={10}
                variant="row-block"
                mobileRowBlockMode="cards"
                mobilePlainCards
                density="compact"
                stickyHeader
                flat
                desktopMinWidthClass="min-w-[980px]"
                emptyLabel={jornadasDiaLoading ? 'Cargando confirmadas...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </AprobacionCard>

          <AprobacionCard
            title="Cierres de jornada"
            description={`Total cerradas hoy: ${cierresJornadaHoy.length}`}
            actions={
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() => {
                  iniciosConfirmadosHoyQuery.refetch()
                }}
                disabled={jornadasDiaFetching}
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Recargar cierres
              </Button>
            }
          >
            <div className="[&_table]:!text-[11px]">
              <Table
                columns={confirmadasColumns}
                data={cierresJornadaHoy}
                pageSize={10}
                variant="row-block"
                mobileRowBlockMode="cards"
                mobilePlainCards
                density="compact"
                stickyHeader
                flat
                desktopMinWidthClass="min-w-[980px]"
                emptyLabel={jornadasDiaLoading ? 'Cargando cierres...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </AprobacionCard>
        </div>
      ) : vistaAgendaActiva ? (
        <div className="grid grid-cols-1 gap-3">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="mb-1 flex flex-wrap items-center gap-1 pb-1">
              <button
                type="button"
                onClick={() => setAgendaEstadoVista('pendientes')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  agendaEstadoVista === 'pendientes' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-brand-700'
                }`}
              >
                <FontAwesomeIcon icon={faClock} />
                <span>Pendientes</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${agendaEstadoVista === 'pendientes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {listadosPendientes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAgendaEstadoVista('completadas')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  agendaEstadoVista === 'completadas' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-brand-700'
                }`}
              >
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Completadas</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${agendaEstadoVista === 'completadas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {supervisionesCompletadasAgenda}
                </span>
              </button>
              <Button
                type="button"
                className="ml-auto"
                onClick={() => {
                  setRealizandoPendienteId('')
                  setForm(emptyForm())
                  setErrorForm(null)
                  setTecnicoFilter('')
                  setRegistroModalOpen(true)
                }}
              >
                <FontAwesomeIcon icon={faCalendarDays} />
                {vistaTopbar === 'sup_v2' ? 'Nuevo' : 'Agendar'}
              </Button>
            </div>

            <details className="group mt-1 rounded-lg border border-slate-200 px-2 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
                <span className="group-open:hidden">Mostrar filtros</span>
                <span className="hidden group-open:inline">Ocultar filtros</span>
                <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
              </summary>
            <div className="min-w-0 pb-1 pt-1.5">
              <div className="grid items-end gap-2 sm:grid-cols-2 md:grid-cols-5">
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Sucursal
                  <select
                    value={sucursalFiltro}
                    onChange={(event) => setSucursalFiltro(event.target.value)}
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                    disabled={sucursalesQuery.isLoading}
                  >
                    <option value="">Mi sucursal</option>
                    <option value="TODOS">Todos</option>
                    {(sucursalesQuery.data ?? []).map((sucursal) => (
                      <option key={sucursal} value={sucursal}>
                        {sucursal}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Supervisor
                  <select
                    value={supervisorFiltro}
                    onChange={(event) => setSupervisorFiltro(event.target.value)}
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                    disabled={supervisoresFiltroQuery.isLoading}
                  >
                    <option value="">Mi usuario</option>
                    <option value="TODOS">Todos</option>
                    {(supervisoresFiltroQuery.data ?? []).map((item) => (
                      <option key={item.idSupervisor} value={item.idSupervisor}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                {agendaEstadoVista === 'completadas' ? (
                  <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                    Buscar por
                    <select
                      value={agendaTipoFechaCompletadoFiltro}
                      onChange={(event) => setAgendaTipoFechaCompletadoFiltro(event.target.value as 'registro' | 'supervision')}
                      className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="supervision">Fecha Supervision</option>
                      <option value="registro">Fecha Registro</option>
                    </select>
                  </label>
                ) : null}
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Tecnico principal
                  <input
                    type="text"
                    maxLength={80}
                    value={agendaTecnicoFiltro}
                    onChange={(event) => setAgendaTecnicoFiltro(event.target.value)}
                    placeholder="Nombre del tecnico"
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Codigo cliente
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={30}
                    value={agendaCodigoFiltro}
                    onChange={(event) => setAgendaCodigoFiltro(event.target.value.replace(/[^0-9]/g, ''))}
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Fecha desde
                  <input
                    type="date"
                    value={agendaEstadoVista === 'completadas' ? agendaCompletadaFechaDesdeFiltro : agendaPendienteFechaDesdeFiltro}
                    onChange={(event) =>
                      agendaEstadoVista === 'completadas'
                        ? setAgendaCompletadaFechaDesdeFiltro(event.target.value || getTodayIsoDate())
                        : setAgendaPendienteFechaDesdeFiltro(event.target.value)
                    }
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Fecha hasta
                  <input
                    type="date"
                    value={agendaEstadoVista === 'completadas' ? agendaCompletadaFechaHastaFiltro : agendaPendienteFechaHastaFiltro}
                    onChange={(event) =>
                      agendaEstadoVista === 'completadas'
                        ? setAgendaCompletadaFechaHastaFiltro(event.target.value || getTodayIsoDate())
                        : setAgendaPendienteFechaHastaFiltro(event.target.value)
                    }
                    className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void (agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.refetch() : listadoPendientesQuery.refetch())}
                  disabled={agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.isFetching : listadoPendientesQuery.isFetching}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-self-start justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60"
                  title="Actualizar"
                >
                  <FontAwesomeIcon
                    icon={faRotateRight}
                    className={(agendaEstadoVista === 'completadas' ? agendaCompletadasQuery.isFetching : listadoPendientesQuery.isFetching) ? 'animate-spin' : ''}
                    aria-hidden="true"
                  />
                  <span className="sr-only">Actualizar</span>
                </button>
              </div>
            </div>
            </details>

            {agendaRowsIsError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getApiErrorMessage(agendaRowsError, 'No se pudo cargar las supervisiones.')}
              </div>
            ) : null}

            <div className="mt-3 space-y-3 rounded-xl bg-slate-900 p-2 md:hidden">
              {agendaRowsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">Cargando supervisiones...</div>
              ) : agendaRows.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">NO HAY DATOS PARA LA FECHA</div>
              ) : (
                agendaRows.map((row) => {
                  const supervisor = row.supervisor || row.idSupervisor || '-'
                  const tecnico = row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || row.idTecnicoPrincipal || '-'
                  const completada = isSupervisionCompletada(row)
                  return (
                    <article key={row.idSupervision} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                      <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-[11px] leading-5 md:grid-cols-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Fecha Agenda</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{formatDateTime(row.fechaRegistro)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Tecnico Principal</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{tecnico}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Supervisor</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{supervisor}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Tipo Supervision</p>
                          <span className="block break-words text-[11px] font-normal text-slate-700">
                            {resolveTipoSupervisionDetalle(row)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Estado</p>
                          <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-normal ${supervisionEstadoBadgeClass(row)}`}>
                            {completada ? 'Completada' : 'Pendiente'}
                          </span>
                          {tieneLlamadaAtencion(row) ? <span className="ml-1"><MarcaLlamada /></span> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Tipo Trabajo</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{resolveTipoTrabajoDetalle(row)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Codigo</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{row.codigo || '-'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">OT</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{row.ordenTrabajo || '-'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-normal uppercase tracking-wide text-slate-500">Id</p>
                          <p className="break-words text-[11px] font-normal text-slate-700">{row.id || row.idSupervision}</p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        {vistaTopbar === 'sup_v2' && !completada ? (
                          <Button type="button" className="w-full justify-center" onClick={() => abrirRealizarPendiente(row)}>
                            {creaComoPendiente ? 'Ver detalle' : 'Realizar supervision'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full justify-center"
                            onClick={() => {
                              // La Agenda es solo de consulta para todos los roles: nadie edita ni finaliza desde aqui.
                              setDetalleId(row.idSupervision)
                              setDetalleSupervisorId(normalizeId(row.idSupervisor) || supervisorFiltro)
                              setDetalleModalOpen(true)
                            }}
                          >
                            Ver detalle
                          </Button>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
            <div className="mt-3 hidden md:block [&_table]:!text-[11px]">
              <Table
                columns={vistaTopbar === 'agenda' ? agendaColumns : columns}
                data={agendaRows}
                stickyHeader
                density="compact"
                desktopMinWidthClass="min-w-[920px]"
                desktopHeightClass="max-h-[55vh]"
                emptyLabel={agendaRowsLoading ? 'Cargando supervisiones...' : 'NO HAY DATOS PARA LA FECHA'}
                flat
              />
            </div>
          </section>
        </div>
      ) : (
        <>
          {successForm ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successForm}</div>
          ) : null}

          <FormCard title="Notas registradas" description={`Total: ${listados.length}`} compact>
            {listadoQuery.isError ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getApiErrorMessage(listadoQuery.error, 'No se pudo cargar las notas de supervision.')}
              </div>
            ) : null}
            <div className="space-y-3 rounded-xl bg-slate-900 p-2 md:hidden">
              {listadoQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Cargando notas...</div>
              ) : listados.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                  <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
                </div>
              ) : (
                listados.map((row) => (
                  <article key={row.idSupervision} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-[13px] leading-5">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha</p>
                          <p className="break-words font-semibold text-slate-700">{formatDateTime(row.fechaRegistro)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tecnico Principal</p>
                          <p className="break-words font-semibold text-slate-700">{row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || '-'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tecnico Auxiliar</p>
                          <p className="break-words font-semibold text-slate-700">{row.tecnicoAuxiliar || tecnicoMap.get(normalizeId(row.idTecnicoAuxiliar))?.tecnico || '-'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo Supervision</p>
                          <span className="block break-words text-xs font-normal text-slate-700">
                            {resolveTipoSupervisionDetalle(row)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                          <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${supervisionEstadoBadgeClass(row)}`}>
                            {isSupervisionCompletada(row) ? 'Completada' : 'Pendiente'}
                          </span>
                          {tieneLlamadaAtencion(row) ? <span className="ml-1"><MarcaLlamada /></span> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo Trabajo</p>
                          <p className="break-words font-semibold text-slate-700">{resolveTipoTrabajoDetalle(row)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Codigo</p>
                          <p className="break-words font-semibold text-slate-700">{row.codigo || '-'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OT</p>
                          <p className="break-words font-semibold text-slate-700">{row.ordenTrabajo || '-'}</p>
                        </div>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full justify-center"
                          onClick={() => {
                            setDetalleId(row.idSupervision)
                            setDetalleSupervisorId(normalizeId(row.idSupervisor) || supervisorFiltro)
                            setDetalleModalOpen(true)
                          }}
                        >
                          Ver detalle
                        </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white [&_table]:!text-[11px] [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!px-2 [&_td]:!py-1.5">
              <Table
                columns={columns}
                data={listados}
                stickyHeader
                density="compact"
                desktopMinWidthClass="min-w-[920px]"
                desktopHeightClass="max-h-[55vh]"
                emptyLabel={listadoQuery.isLoading ? 'Cargando notas...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </FormCard>
        </>
      )}

      <Modal

        compactText
        open={Boolean(rechazoInicioId)}
        title="Rechazar inicio de jornada"
        onClose={cerrarRechazoInicioModal}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={cerrarRechazoInicioModal} disabled={rechazarInicioMutation.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarRechazoInicio} disabled={rechazarInicioMutation.isPending}>
              {rechazarInicioMutation.isPending ? 'Rechazando...' : 'Confirmar rechazo'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {rechazoInicioTecnico ? `Tecnico: ${rechazoInicioTecnico}` : 'Ingresa el motivo para rechazar este inicio de jornada.'}
          </p>
          <Field label="Observacion de rechazo">
            <textarea
              className="input-base min-h-32 resize-y"
              value={observacionRechazo}
              onChange={(event) => {
                setObservacionRechazo(event.target.value)
                if (observacionRechazoError) setObservacionRechazoError(null)
              }}
              placeholder="Escribe por que se rechaza"
              disabled={rechazarInicioMutation.isPending}
            />
          </Field>
          {observacionRechazoError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {observacionRechazoError}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal

        compactText
        open={registroModalOpen}
        title={realizandoPendienteId ? "Realizar supervision pendiente" : "Nueva nota de supervision"}
        onClose={closeRegistroModal}
        maxWidthClass="max-w-5xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeRegistroModal}>
              Cancelar
            </Button>
            {pasoIdx > 0 ? (
              <Button type="button" variant="secondary" onClick={irPasoAnterior}>
                Atras
              </Button>
            ) : null}
            {esUltimoPaso ? (
              <Button type="button" onClick={submitForm} disabled={createMutation.isPending || createPendienteMutation.isPending || realizarPendienteMutation.isPending}>
                {createMutation.isPending || createPendienteMutation.isPending || realizarPendienteMutation.isPending
                  ? 'Guardando...'
                  : realizandoPendienteId
                    ? 'Finalizar supervision'
                    : 'Guardar nota'}
              </Button>
            ) : (
              <Button type="button" onClick={irSiguientePaso}>
                Siguiente
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {realizandoPendienteId && avisoCobertura ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta supervision esta asignada a <strong>{avisoCobertura}</strong>. Al finalizarla pasaras a ser el supervisor responsable;
              el supervisor asignado originalmente quedara registrado.
            </div>
          ) : null}
          <ol className="flex flex-wrap items-center gap-1.5 text-xs">
            {pasosForm.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={i > pasoMax}
                  onClick={() => setPaso(item.id)}
                  className={`rounded-full border px-3 py-1 transition ${
                    item.id === pasoActualId
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : i <= pasoMax
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {i + 1}. {item.titulo}
                </button>
              </li>
            ))}
          </ol>

          <div className={`grid grid-cols-1 gap-4 ${clasePaso('tecnico')}`}>
            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faUserGear} className="text-brand-600" />Informacion del tecnico</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Tecnico principal" invalid={inv('idTecnicoPrincipal')}>
                  <button
                    type="button"
                    className="input-base flex w-full items-center justify-between gap-2 text-left"
                    disabled={tecnicosQuery.isLoading || camposBaseBloqueados}
                    onClick={() => {
                      setTecnicoFilter('')
                      setTecnicoPickerOpen(true)
                    }}
                  >
                    <span className={`min-w-0 flex-1 truncate ${form.idTecnicoPrincipal ? '' : 'text-slate-400'}`}>
                      {tecnicosQuery.isLoading
                        ? 'Cargando tecnicos...'
                        : tecnicos.find((item) => normalizeId(item.idTecnico) === normalizeId(form.idTecnicoPrincipal))?.tecnico || 'Selecciona tecnico'}
                    </span>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-slate-400" />
                  </button>
                  <Modal
                    compactText
                    open={tecnicoPickerOpen}
                    title="Selecciona tecnico"
                    onClose={() => setTecnicoPickerOpen(false)}
                    maxWidthClass="max-w-md"
                  >
                    <input
                      className="input-base mb-2"
                      type="search"
                      autoFocus
                      placeholder="Buscar tecnico por nombre..."
                      value={tecnicoFilter}
                      onChange={(event) => setTecnicoFilter(normalizeUpperText(event.target.value))}
                    />
                    <ul className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto">
                      {tecnicosPrincipalFiltrados.length === 0 ? (
                        <li className="px-2 py-3 text-sm text-slate-500">Sin resultados</li>
                      ) : null}
                      {tecnicosPrincipalFiltrados.map((item) => (
                        <li key={`p-${item.idTecnico}`}>
                          <button
                            type="button"
                            className={`w-full px-2 py-3 text-left text-sm hover:bg-slate-50 ${
                              normalizeId(item.idTecnico) === normalizeId(form.idTecnicoPrincipal) ? 'font-semibold text-brand-700' : 'text-slate-800'
                            }`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, idTecnicoPrincipal: item.idTecnico }))
                              setTecnicoPickerOpen(false)
                            }}
                          >
                            {item.tecnico}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Modal>
                </Field>
                <div className="md:col-span-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={conAuxiliar || Boolean(form.idTecnicoAuxiliar)}
                      disabled={camposBaseBloqueados}
                      onChange={(event) => {
                        setConAuxiliar(event.target.checked)
                        if (!event.target.checked) setForm((prev) => ({ ...prev, idTecnicoAuxiliar: '' }))
                      }}
                    />
                    Agregar tecnico auxiliar
                  </label>
                  {conAuxiliar || form.idTecnicoAuxiliar ? (
                    <div className="mt-2">
                    <Field label="Tecnico auxiliar">
                      <input
                        className="input-base"
                        type="text"
                        placeholder="Escribe el nombre del auxiliar"
                        value={form.idTecnicoAuxiliar}
                        maxLength={150}
                        disabled={camposBaseBloqueados}
                        onChange={(event) => setForm((prev) => ({ ...prev, idTecnicoAuxiliar: normalizeUpperText(event.target.value) }))}
                      />
                    </Field>
                    </div>
                  ) : null}
                </div>
                {creaComoPendiente && !realizandoPendienteId ? (
                  <Field label="Supervisor asignado" invalid={inv('supervisorAsignado')}>
                    <select className="input-base" value={supervisorAsignado} onChange={(e) => setSupervisorAsignado(e.target.value)}>
                      <option value="">Selecciona supervisor</option>
                      {(supervisoresFiltroQuery.data ?? []).map((sup) => (
                        <option key={sup.idSupervisor} value={sup.idSupervisor}>{sup.nombre}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Tipo supervision" invalid={inv('idTipoSupervision')}>
                  <select
                    className="input-base"
                    value={form.idTipoSupervision}
                    disabled={camposBaseBloqueados}
                    onChange={(event) => cambiarTipoSupervision(event.target.value)}
                  >
                    <option value="">Selecciona tipo</option>
                    {tiposSupervisionPermitidos.map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                </Field>
                {mostrarTipoTrabajo ? (
                  <Field label="Tipo trabajo" invalid={inv('idTipoTrabajo')}>
                    <select
                      className="input-base"
                      value={form.idTipoTrabajo}
                      disabled={camposBaseBloqueados}
                      onChange={(event) => setForm((prev) => ({ ...prev, idTipoTrabajo: event.target.value }))}
                    >
                      <option value="">Selecciona tipo</option>
                      {(tiposTrabajoQuery.data ?? []).filter((item) => admiteTipoTrabajoNinguna || item.nombre.trim().toUpperCase() !== 'NINGUNA').map((item) => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                {mostrarTipoPenalizacion ? (
                  <Field label="Tipo penalizacion" invalid={inv('idTipoPenalizacion')}>
                    <select
                      className="input-base"
                      value={form.idTipoPenalizacion}
                      disabled={camposBaseBloqueados}
                      onChange={(event) => setForm((prev) => ({ ...prev, idTipoPenalizacion: event.target.value }))}
                    >
                      <option value="">Selecciona tipo</option>
                      {(tiposPenalizacionQuery.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Supervision por" invalid={inv('supervisionPor')}>
                  <select className="input-base" value={form.supervisionPor} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, supervisionPor: e.target.value }))}>
                    <option value="">Selecciona supervision</option>
                    {opcionesConActual(supervisionPorQuery.data, form.supervisionPor).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Codigo cliente" invalid={inv('codigo')}>
                  <input
                    className="input-base"
                    type="text"
                    inputMode="numeric"
                    value={form.codigo}
                    maxLength={30}
                    disabled={camposBaseBloqueados}
                    onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.replace(/[^0-9]/g, '') }))}
                  />
                </Field>
                <Field label="Orden de trabajo" invalid={inv('ordenTrabajo')}>
                  <input
                    className="input-base"
                    value={form.ordenTrabajo}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={20}
                    disabled={camposBaseBloqueados}
                    onChange={(e) => setForm((p) => ({ ...p, ordenTrabajo: normalizeOnlyDigits(e.target.value) }))}
                  />
                </Field>
              </div>
            </section>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${camposInicioBloqueados ? '' : 'xl:grid-cols-[2fr_1fr]'} ${clasePaso('obra')}`}>
            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faScrewdriverWrench} className="text-brand-600" />Informacion de obra</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tecnologia" invalid={inv('tecnologia')}>
                  <select className="input-base" value={form.tecnologia} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, tecnologia: e.target.value }))}>
                    <option value="">Selecciona tecnologia</option>
                    {opcionesConActual(tecnologiaQuery.data, form.tecnologia).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                {mostrarTipoRevision ? (
                  <Field label="Tipo revision" invalid={inv('tipoRevision')}>
                    <select className="input-base" value={form.tipoRevision} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, tipoRevision: e.target.value }))}>
                      <option value="">Selecciona tipo revision</option>
                      {(soloRevisionExterna
                        ? [opcionExterna]
                        : (() => {
                            const base = opcionesConActual(tipoRevisionQuery.data, form.tipoRevision)
                            // INTERCEPCION DE RUTA (2): ademas de las del catalogo se puede elegir NINGUNA.
                            return form.idTipoSupervision.trim() === '2' && !base.some((item) => item.toUpperCase() === 'NINGUNA') ? [...base, 'NINGUNA'] : base
                          })()
                      ).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </div>
            </section>

            {/* La ubicacion la toma el supervisor al realizar la supervision: no se muestra al crear la pendiente. */}
            {!camposInicioBloqueados ? (
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faLocationDot} className="text-brand-600" />Ubicacion</h4>
                <div className="space-y-3">
                  <Field label="Coordenadas / direccion" invalid={inv('ubicacion')}>
                    <UbicacionAutoCapture
                      compacto
                      soloLectura
                      value={form.ubicacion}
                      onChange={(value) => setForm((p) => ({ ...p, ubicacion: value }))}
                    />
                  </Field>
                </div>
              </section>
            ) : null}
          </div>

          <section className={`rounded-2xl border border-[#cfd8ee] bg-white p-4 ${clasePaso('obra')}`}>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faComments} className="text-brand-600" />Observaciones</h4>
            <div className={`grid grid-cols-1 gap-4 ${camposInicioBloqueados ? '' : 'md:grid-cols-2'}`}>
              {/* La observacion la anota solo el supervisor: no se muestra al crear la pendiente. */}
              {!camposInicioBloqueados ? (
                <Field label="Observacion">
                  <textarea
                    className="input-base min-h-28"
                    value={form.observacion}
                    disabled={creaComoPendiente}
                    onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))}
                  />
                </Field>
              ) : null}
              <Field label="Observaciones de Agenda">
                <textarea
                  className="input-base min-h-28"
                  value={form.descripcionAdicionalObservacion}
                  disabled={descripcionAdicionalBloqueada}
                  onChange={(e) => setForm((p) => ({ ...p, descripcionAdicionalObservacion: e.target.value }))}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Checklist del tipo (2: EPP/vehiculo/herramientas; 4: revision Interna/Externa). Si la respuesta es la negativa, la observacion es obligatoria. */}
        {itemsChecklist.length > 0 ? (
          <section className={`mt-4 rounded-2xl border border-[#cfd8ee] bg-white p-4 ${clasePaso('checklist')}`}>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faListUl} className="text-brand-600" />Checklist</h4>
            {form.idTipoSupervision.trim() === '2' ? (
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">Checklist a aplicar (minimo 1):</span>
                {(reglaChecklist?.grupos ?? []).map((grupo) => {
                  const marcado = gruposChecklistElegidos.includes(grupo)
                  return (
                    <label key={grupo} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={marcado && gruposChecklistElegidos.length === 1}
                        onChange={() =>
                          setGruposChecklistElegidos((prev) => (prev.includes(grupo) ? prev.filter((g) => g !== grupo) : [...prev, grupo]))
                        }
                      />
                      Checklist {TITULO_GRUPO_CHECKLIST[grupo] ?? grupo}
                    </label>
                  )
                })}
              </div>
            ) : null}
            <div className="space-y-2">
              {gruposChecklist.map((grupo) => {
                const itemsGrupo = itemsChecklist.filter((item) => item.grupo === grupo)
                const respondidos = itemsGrupo.filter((item) => respuestaChecklist(item.id)).length
                const conFaltantes = itemsGrupo.some((item) => inv(`chk_${item.id}`) || inv(`chkobs_${item.id}`))
                const abierto = conFaltantes || (grupoChecklistAbierto === null ? gruposChecklist[0] : grupoChecklistAbierto) === grupo
                return (
                  <div key={grupo} className={`rounded-xl border-2 p-1.5 ${COLOR_GRUPO_CHECKLIST[grupo]?.caja ?? 'border-slate-300'}`}>
                    <button
                      type="button"
                      onClick={() => setGrupoChecklistAbierto(abierto && !conFaltantes ? '' : grupo)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left font-bold uppercase tracking-wide ${COLOR_GRUPO_CHECKLIST[grupo]?.banda ?? 'bg-slate-600 text-white'}`}
                    >
                      <span>{tituloGrupoChecklist(grupo, form.idTipoSupervision)}</span>
                      <span className="font-normal normal-case">{respondidos}/{itemsGrupo.length} {abierto ? '\u25B2' : '\u25BC'}</span>
                    </button>
                    <div className={`mt-1.5 space-y-1.5 ${abierto ? '' : 'hidden'}`}>
                      {itemsGrupo.map((item) => {
                        const sinResponder = inv(`chk_${item.id}`)
                        const exigeObs = checklistExigeObservacion(item)
                        const mostrarObs = exigeObs || Boolean(observacionChecklist(item.id)) || Boolean(obsChecklistAbiertas[item.id])
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border px-2.5 py-1.5 ${
                              sinResponder ? 'field-invalid border-rose-400 bg-rose-50/40 ring-2 ring-rose-200' : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="min-w-0 flex-1 basis-40 font-medium text-slate-700">{item.item}</p>
                              {item.tipoRespuesta === 'POTENCIA' ? (
                                <select
                                  className="input-base !w-auto !py-1"
                                  value={respuestaChecklist(item.id)}
                                  onChange={(e) =>
                                    setChecklistRespuestas((prev) => ({ ...prev, [item.id]: { respuesta: e.target.value, observacion: prev[item.id]?.observacion ?? '' } }))
                                  }
                                >
                                  <option value="">Selecciona</option>
                                  {opcionesDeItemChecklist(item).map((opcion) => (
                                    <option key={opcion} value={opcion}>{opcion}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="flex items-center gap-3">
                                  {opcionesDeItemChecklist(item).map((opcion) => (
                                    <label key={opcion} className="inline-flex cursor-pointer items-center gap-1 text-slate-700">
                                      <input
                                        type="radio"
                                        name={`chk_${item.id}`}
                                        checked={respuestaChecklist(item.id) === opcion}
                                        onChange={() =>
                                          setChecklistRespuestas((prev) => ({ ...prev, [item.id]: { respuesta: opcion, observacion: prev[item.id]?.observacion ?? '' } }))
                                        }
                                      />
                                      {opcion}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {mostrarObs ? (
                              <div className={`mt-1.5 ${inv(`chkobs_${item.id}`) ? 'field-invalid' : ''}`}>
                                <input
                                  className="input-base !py-1"
                                  type="text"
                                  maxLength={500}
                                  placeholder={exigeObs ? 'Observacion (obligatoria)' : 'Observacion (opcional)'}
                                  value={observacionChecklist(item.id)}
                                  onChange={(e) =>
                                    setChecklistRespuestas((prev) => ({ ...prev, [item.id]: { respuesta: prev[item.id]?.respuesta ?? '', observacion: e.target.value } }))
                                  }
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="mt-0.5 text-blue-700 hover:underline"
                                onClick={() => setObsChecklistAbiertas((prev) => ({ ...prev, [item.id]: true }))}
                              >
                                + Observacion
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Cruce de materiales (supervision de campo, revision Interna/Externa). Cant/Sistema queda vacia hasta tener su origen (OT + nro de cliente). */}
        {materialesCruce.length > 0 ? (
          <section className={`mt-4 rounded-2xl border border-[#cfd8ee] bg-white p-4 ${clasePaso('cruce')}`}>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faListUl} className="text-brand-600" />Cruce de materiales</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-bold uppercase text-slate-700">
                    <th className="border border-slate-300 px-2 py-1.5">Materiales</th>
                    <th className="border border-slate-300 px-2 py-1.5">Cant/Sistema</th>
                    <th className="border border-slate-300 px-2 py-1.5">Cant/Fisico</th>
                    <th className="border border-slate-300 px-2 py-1.5">Diferencia</th>
                    <th className="border border-slate-300 px-2 py-1.5">Observacion</th>
                  </tr>
                </thead>
                <tbody>
                  {materialesCruce.map((material) => (
                    <tr key={material.id}>
                      <td className="border border-slate-300 px-2 py-1 font-medium text-slate-700">{material.material}</td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-600">{materialesSistemaQuery.isSuccess ? cantSistemaCruce(material.material) : ''}</td>
                      <td className={`border border-slate-300 px-2 py-1 ${inv(`cruce_${material.id}`) ? 'field-invalid bg-rose-50' : ''}`}>
                        <input
                          className="input-base !py-1"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="Digitar"
                          value={cantFisicoCruce(material.id)}
                          onChange={(e) =>
                            setCruceMateriales((prev) => ({ ...prev, [material.id]: { cantFisico: e.target.value.replace(/\D/g, ''), observacion: prev[material.id]?.observacion ?? '' } }))
                          }
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-1 font-semibold text-rose-600">{diferenciaCruce(material.id, material.material) ?? ''}</td>
                      <td className={`border border-slate-300 px-2 py-1 ${inv(`cruceobs_${material.id}`) ? 'field-invalid bg-rose-50' : ''}`}>
                        <input
                          className="input-base !py-1"
                          type="text"
                          maxLength={500}
                          placeholder={diferenciaCruce(material.id, material.material) !== null ? 'Obligatoria' : ''}
                          value={observacionCruce(material.id)}
                          onChange={(e) =>
                            setCruceMateriales((prev) => ({ ...prev, [material.id]: { cantFisico: prev[material.id]?.cantFisico ?? '', observacion: e.target.value } }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Las fotos las sube solo el supervisor al realizar la supervision: no se muestran al crear la pendiente. */}
        {!camposInicioBloqueados ? (
        <section className={`mt-4 rounded-2xl border border-[#cfd8ee] bg-white p-4 ${clasePaso('fotos')}`}>
          <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faCamera} className="text-brand-600" />Archivos y fotos</h4>
          {!reglaTipo ? <p className="text-sm text-slate-500">Selecciona el tipo de supervision para ver las fotos que corresponden.</p> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fotosDelTipo.map((photo) => {
              const src = resolveImageSrc(form[photo.key])
              const tieneFoto = Boolean(src) || esRutaFotoSupervision(form[photo.key])
              return (
                <div key={photo.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {tieneFoto ? (
                      <FotoSupervision
                        value={form[photo.key]}
                        directSrc={src}
                        alt={photo.label}
                        className="h-12 w-12 shrink-0 cursor-zoom-in rounded-md border border-slate-200 object-cover"
                        onOpen={setZoomImageSrc}
                      />
                    ) : null}
                    <p className="truncate text-sm font-medium text-slate-700">{photo.label}</p>
                  </div>
                  <label className="btn-secondary inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap !px-3 !py-1.5 text-xs">
                    <input className="hidden" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
                    <FontAwesomeIcon icon={faCloudArrowUp} />
                    {tieneFoto ? 'Cambiar archivo' : 'Subir archivo'}
                  </label>
                </div>
              )
            })}
          </div>
        </section>
        ) : null}

        {/* Firmas digitales segun el tipo: tecnico (obligatoria), auxiliar (opcional), cliente (obligatoria en campo Interna / Interna-Externa). */}
        {!camposInicioBloqueados && hayFirmas && firmasMontadas ? (
          <section className={`mt-4 rounded-2xl border border-[#cfd8ee] bg-white p-4 ${clasePaso('firmas')}`}>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faUserPen} className="text-brand-600" />Firmas</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pideFirmaTecnico ? (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${inv('firmaTecnico') ? 'text-rose-600' : 'text-slate-500'}`}>Firma del tecnico</p>
                  <div className={`rounded-2xl ${inv('firmaTecnico') ? 'field-invalid ring-2 ring-rose-300' : ''}`}>
                    <SignaturePad value={form.firmaTecnico} onChange={(value) => setForm((p) => ({ ...p, firmaTecnico: value }))} />
                  </div>
                </div>
              ) : null}
              {pideFirmaAuxiliar ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Firma del auxiliar (opcional)</p>
                  <SignaturePad value={form.firmaAuxiliar} onChange={(value) => setForm((p) => ({ ...p, firmaAuxiliar: value }))} />
                </div>
              ) : null}
              {pideFirmaCliente ? (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${inv('firmaCliente') ? 'text-rose-600' : 'text-slate-500'}`}>Firma del cliente</p>
                  <div className={`rounded-2xl ${inv('firmaCliente') ? 'field-invalid ring-2 ring-rose-300' : ''}`}>
                    <SignaturePad value={form.firmaCliente} onChange={(value) => setForm((p) => ({ ...p, firmaCliente: value }))} />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {errorForm ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorForm}</div>
        ) : null}
      </Modal>

      <LlamadaAtencionSupervisionModal
        open={llamadaModo !== null}
        modo={llamadaModo ?? 'crear'}
        llamada={llamadaDetalleQuery.data}
        idSupervision={llamadaDesdeGuardado && postGuardado ? postGuardado.id : detalleId}
        tecnico={llamadaDesdeGuardado && postGuardado ? postGuardado.tecnico : detalleQuery.data?.tecnicoPrincipal || ''}
        onGuardado={() => {
          if (llamadaDesdeGuardado) setPostGuardado((prev) => (prev ? { ...prev, llamadaGenerada: true } : prev))
        }}
        onClose={() => {
          setLlamadaModo(null)
          setLlamadaDesdeGuardado(false)
        }}
      />

      <Modal

        compactText
        open={postGuardado !== null && llamadaModo === null}
        title="Supervision registrada"
        onClose={() => setPostGuardado(null)}
        maxWidthClass="max-w-md"
        actions={
          <Button type="button" variant="secondary" onClick={() => setPostGuardado(null)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            La supervision se guardo correctamente. ID: {postGuardado?.id}
          </p>
          {postGuardado?.llamadaGenerada ? (
            <p className="text-slate-600">La llamada de atencion quedo registrada como pendiente de firma.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-600">Tecnico: {postGuardado?.tecnico || ''}</p>
              <Button
                type="button"
                onClick={() => {
                  setLlamadaDesdeGuardado(true)
                  setLlamadaModo('crear')
                }}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
                Generar llamada de atencion al tecnico
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal

        compactText
        open={detalleModalOpen}
        title="Detalle de supervision"
        onClose={() => setDetalleModalOpen(false)}
        maxWidthClass="max-w-6xl"
        actions={
          <Button type="button" variant="secondary" onClick={() => setDetalleModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        {detalleQuery.isLoading ? (
          <p>Cargando detalle...</p>
        ) : detalleQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(detalleQuery.error, 'No se pudo cargar el detalle de supervision.')}
          </div>
        ) : detalle ? (
          <div className="space-y-3 text-slate-800">
            <div className="grid items-start gap-3 lg:grid-cols-[2fr_1fr]">
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faUserGear} className="text-blue-700" />Informacion general</h4>
                  <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
                    <DatoDetalle label="Fecha agendada" value={formatDateTime(detalle.fechaRegistro)} />
                    <DatoDetalle label="Fecha supervision" value={formatDateTime(detalle.fechaSupervision)} />
                    <DatoDetalle label="Supervisor" value={detalle.supervisor || detalle.idSupervisor} />
                    <div className="flex min-w-0 items-start gap-2">
                      <DatoDetalle label="Tecnico principal" value={detalle.tecnicoPrincipal || detalle.idTecnicoPrincipal} />
                      {(() => {
                        const llamada = llamadaDetalleQuery.data
                        const completada = (detalle.estadoSup || '').trim().toLowerCase().includes('complet')
                        if (!completada || !llamada) return null
                        const pendiente = (llamada.estado || '').trim().toLowerCase() === 'pendiente'
                        const soloVista = vistaTopbar === 'agenda' || !esSupervisor
                        // Quien no registra (agenda / otros roles) solo puede ver la llamada si existe.
                        // La llamada se genera al guardar la supervision; aqui solo se firma o se ve la que ya existe.
                        const accion: 'firmar' | 'ver' | null = !llamada.tiene ? null : pendiente && !soloVista ? 'firmar' : 'ver'
                        if (!accion) return null
                        const colores = !llamada.tiene
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : pendiente
                            ? 'border-amber-300 bg-amber-50 text-amber-600'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-600'
                        const titulo = accion === 'firmar' ? 'Hacer firmar la llamada de atencion al tecnico' : 'Ver llamada de atencion'
                        return (
                          <button
                            type="button"
                            title={titulo}
                            aria-label={titulo}
                            className={`mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition hover:brightness-95 ${colores}`}
                            onClick={() => setLlamadaModo(accion)}
                          >
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                          </button>
                        )
                      })()}
                    </div>
                    <DatoDetalle label="Tecnico auxiliar" value={detalle.tecnicoAuxiliar || detalle.idTecnicoAuxiliar} />
                    <DatoDetalle label="Tipo supervision" value={resolveTipoSupervisionDetalle(detalle)} />
                    <DatoDetalle label="Tipo trabajo" value={resolveTipoTrabajoDetalle(detalle)} />
                    <div className="min-w-0 sm:col-span-2">
                      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400"><FontAwesomeIcon icon={faLocationDot} className="text-blue-700" />Ubicacion del servicio</p>
                      <p className="break-words text-xs text-slate-800">
                        {detalle.ubicacion || ''}
                        {(() => {
                          const coords = parseGeoCoords(detalle.ubicacion)
                          if (!coords) return null
                          const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                          return (
                            <button type="button" className="ml-3 text-xs text-blue-700 hover:underline" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
                              Abrir en Google Maps
                            </button>
                          )
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faComments} className="text-rose-600" />Observaciones y comentarios</h4>
                  <div className="space-y-2">
                    <DatoDetalle label="Observacion principal" value={detalle.observacion} />
                    <DatoDetalle label="Observaciones de agenda" value={detalle.descripcionAdicionalObservacion} />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faClipboardList} className="text-blue-700" />Referencias</h4>
                  <div className="space-y-1">
                    <DatoDetalle enLinea label="Orden de trabajo" value={detalle.ordenTrabajo} />
                    <DatoDetalle enLinea label="Codigo" value={detalle.codigo} />
                    <DatoDetalle enLinea label="Tecnologia" value={detalle.tecnologia} />
                    <DatoDetalle enLinea label="Tipo revision" value={detalle.tipoRevision} />
                    {detalle.supervisorAsignado ? <DatoDetalle enLinea label="Asignado originalmente a" value={detalle.supervisorAsignado} /> : null}
                    <DatoDetalle enLinea label="Supervision por" value={detalle.supervisionPor} />
                    <DatoDetalle enLinea label="Penalizacion" value={resolveTipoPenalizacionDetalle(detalle)} />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faIdCard} className="text-blue-700" />Datos de registro</h4>
                  <div className="space-y-1">
                    <DatoDetalle enLinea label="Estado" value={detalle.estadoSup} />
                    <DatoDetalle enLinea label="Sucursal" value={detalle.sucursal} />
                    <DatoDetalle
                      enLinea
                      label="Creado por"
                      value={detalle.creadoPor ? `${detalle.creadoPor}${detalle.cargoCreadoPor ? ` (${detalle.cargoCreadoPor})` : ''}` : ''}
                    />
                  </div>
                </div>

                {(() => {
                  const completada = (detalle.estadoSup || '').trim().toLowerCase().includes('complet')
                  const llamada = llamadaDetalleQuery.data
                  if (!completada || !llamada) return null
                  const pendiente = (llamada.estado || '').trim().toLowerCase() === 'pendiente'
                  return (
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Llamada de atencion</h4>
                      {llamada.tiene ? (
                        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                          <span>{llamada.motivo || ''}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${pendiente ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {pendiente ? 'Pendiente de firma' : 'Firmada'}
                          </span>
                        </p>
                      ) : (
                        <p className="mb-2 text-sm text-slate-500">No tiene</p>
                      )}
                    </div>
                  )
                })()}
              </section>
            </div>

            {detalle.mediosError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                No se pudieron leer las fotos y firmas de esta supervision: {detalle.mediosError}
              </div>
            ) : null}

            {/* Solo se muestran las fotos que existen; si no hay ninguna, no se muestra la galeria. */}
            {(() => {
              const fotosRegistradas = photoFields.filter((p) => resolveImageSrc(detalle[p.key]) || esRutaFotoSupervision(detalle[p.key]))
              if (fotosRegistradas.length === 0) return null
              return (
                <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <FontAwesomeIcon icon={faCamera} className="text-blue-700" />Fotos ({fotosRegistradas.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {fotosRegistradas.map((photo) => (
                      <div key={photo.key}>
                        <FotoSupervision
                          value={detalle[photo.key]}
                          directSrc={resolveImageSrc(detalle[photo.key])}
                          alt={photo.label}
                          className="h-24 w-full cursor-zoom-in rounded-md object-cover"
                          onOpen={setZoomImageSrc}
                        />
                        <p className="mt-1 truncate text-[11px] text-slate-500">{photo.label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })()}

            {(() => {
              const firmasRegistradas = (
                [
                  { key: 'firmaTecnico', label: 'Firma del tecnico' },
                  { key: 'firmaAuxiliar', label: 'Firma del auxiliar' },
                  { key: 'firmaCliente', label: 'Firma del cliente' },
                ] as const
              ).filter((firma) => resolveImageSrc(detalle[firma.key]) || esRutaFotoSupervision(detalle[firma.key]))
              if (firmasRegistradas.length === 0) return null
              return (
                <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faUserPen} className="text-blue-700" />Firmas</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {firmasRegistradas.map((firma) => (
                      <div key={firma.key}>
                        <FotoSupervision
                          value={detalle[firma.key]}
                          directSrc={resolveImageSrc(detalle[firma.key])}
                          alt={firma.label}
                          className="h-20 w-full cursor-zoom-in rounded-md bg-white object-contain"
                          onOpen={setZoomImageSrc}
                        />
                        <p className="mt-1 truncate text-[11px] text-slate-500">{firma.label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })()}

            {(checklistDetalleQuery.data ?? []).length > 0 ? (
              <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faListUl} className="text-blue-700" />Checklist</h4>
                <div className="divide-y divide-slate-100">
                  {(checklistDetalleQuery.data ?? []).map((fila) => (
                    <div key={fila.idItem} className="grid gap-1 py-1 text-sm md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                      <span className="text-slate-700">
                        <span className="mr-2 text-[10px] uppercase text-slate-400">{tituloGrupoChecklist(fila.grupo, detalle.idTipoSupervision)}</span>
                        {fila.item}
                      </span>
                      <span className={checklistRespuestaNegativa(fila.respuesta) ? 'text-rose-600' : 'text-emerald-700'}>{fila.respuesta}</span>
                      <span className="text-xs text-slate-500">{fila.observacion || ''}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(cruceDetalleQuery.data ?? []).length > 0 ? (
              <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><FontAwesomeIcon icon={faListUl} className="text-blue-700" />Cruce de materiales</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-slate-400">
                        <th className="py-1 pr-2">Material</th>
                        <th className="py-1 pr-2">Cant/Sistema</th>
                        <th className="py-1 pr-2">Cant/Fisico</th>
                        <th className="py-1 pr-2">Diferencia</th>
                        <th className="py-1">Observacion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(cruceDetalleQuery.data ?? []).map((fila) => (
                        <tr key={fila.idMaterial}>
                          <td className="py-1 pr-2 text-slate-700">{fila.material}</td>
                          <td className="py-1 pr-2 text-slate-600">{fila.cantSistema ?? ''}</td>
                          <td className="py-1 pr-2 text-slate-600">{fila.cantFisico ?? ''}</td>
                          <td className="py-1 pr-2 text-slate-600">{fila.diferencia ? fila.diferencia : ''}</td>
                          <td className="py-1 text-xs text-slate-500">{fila.observacion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        compactText
        open={Boolean(inicioPendienteDetalle)}
        title={jornadaDetalleModo === 'cierre' ? 'Formulario de cierre de jornada' : 'Formulario de inicio de jornada'}
        onClose={() => setInicioPendienteDetalle(null)}
        maxWidthClass="max-w-3xl"
        actions={
          <Button type="button" variant="secondary" onClick={() => setInicioPendienteDetalle(null)}>
            Cerrar
          </Button>
        }
      >
        {inicioPendienteDetalle ? (
          <div className="space-y-4">
            {jornadaDetalleModo === 'inicio' ? (
              <>
                <JornadaRemoteImageCard
                  queryKey={['supervision', 'jornada-imagen-modal', inicioPendienteDetalle.idInicio]}
                  queryFn={() => fetchInicioJornadaImagen(inicioPendienteDetalle.idInicio, 'supervisor', true)}
                  fullImageQueryFn={() => fetchInicioJornadaImagen(inicioPendienteDetalle.idInicio, 'supervisor', false)}
                  label="Imagen inicio"
                  alt="Inicio jornada"
                  onZoom={setZoomImageSrc}
                />
                <JornadaRemoteImageCard
                  queryKey={['supervision', 'jornada-firma-inicio', inicioPendienteDetalle.idInicio]}
                  queryFn={() => fetchInicioJornadaFirma(inicioPendienteDetalle.idInicio, 'inicio', 'supervisor')}
                  label="Firma inicio"
                  alt="Firma inicio"
                  className="h-36 w-64 bg-white object-contain"
                  fallbackValue={inicioPendienteDetalle.firmaInicio}
                  enabled={!jornadaDetalleQuery.isLoading}
                  onZoom={setZoomImageSrc}
                />
                <JornadaRemoteImageCard
                  queryKey={['supervision', 'jornada-imagen-auxiliar-modal', inicioPendienteDetalle.idInicio]}
                  queryFn={() => fetchInicioJornadaImagenAuxiliar(inicioPendienteDetalle.idInicio, 'supervisor', true)}
                  fullImageQueryFn={() => fetchInicioJornadaImagenAuxiliar(inicioPendienteDetalle.idInicio, 'supervisor', false)}
                  label="Imagen auxiliar"
                  alt="Auxiliar inicio jornada"
                  fallbackValue={inicioPendienteDetalle.imagenAuxiliar}
                  enabled={!jornadaDetalleQuery.isLoading}
                  onZoom={setZoomImageSrc}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Tecnico', value: inicioPendienteDetalle.tecnicoNombre || inicioPendienteDetalle.idTecnico || '-' },
                    { label: 'Auxiliar', value: inicioPendienteDetalle.auxiliarNombre || inicioPendienteDetalle.idAuxiliar || '-' },
                    { label: 'Capacitado', value: inicioPendienteDetalle.capacitado || '-' },
                    { label: 'Charla', value: inicioPendienteDetalle.charla || '-' },
                    { label: 'Botiquin', value: inicioPendienteDetalle.botiquin || '-' },
                    { label: 'Extintor', value: inicioPendienteDetalle.extintor || '-' },
                    { label: 'Fecha vencimiento', value: inicioPendienteDetalle.fechaVencimiento || '-' },
                    { label: 'ESTOY TRABAJANDO SOLO', value: inicioPendienteDetalle.estoyTrabajandoSolo ? String(inicioPendienteDetalle.estoyTrabajandoSolo) : '-' },
                    { label: 'Equipo EPP', value: inicioPendienteDetalle.equipoEpp || '-' },
                    { label: 'Estado EPP', value: inicioPendienteDetalle.estadoEpp || '-' },
                    { label: 'APR', value: inicioPendienteDetalle.apr || '-' },
                    { label: 'Escalera', value: inicioPendienteDetalle.escalera || '-' },
                    { label: 'Anclaje', value: inicioPendienteDetalle.anclaje || '-' },
                  ].map((item) => {
                    const showAsStatus = isSiValue(item.value) || isNoValue(item.value)
                    return (
                      <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-4">
                        <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">{item.label}</p>
                        {showAsStatus ? (
                          <p className={`mt-2 flex items-center gap-2 text-2xl font-semibold sm:text-3xl ${isSiValue(item.value) ? 'text-emerald-700' : 'text-rose-700'}`}>
                            <FontAwesomeIcon icon={isSiValue(item.value) ? faCheckCircle : faCameraRetro} className="text-3xl" />
                            <span className="text-2xl">{formatSiNoValue(item.value)}</span>
                          </p>
                        ) : (
                          <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{item.value}</p>
                        )}
                      </div>
                    )
                  })}
                  <div className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-4 sm:col-span-2">
                    <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">Ubicacion georef</p>
                    <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">{inicioPendienteDetalle.ubicacionGeoref || '-'}</p>
                    {(() => {
                      const coords = parseGeoCoords(inicioPendienteDetalle.ubicacionGeoref)
                      if (!coords) return null
                      const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                      return (
                        <Button type="button" variant="secondary" className="mt-3" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
                          Abrir en Google Maps
                        </Button>
                      )
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <section className="space-y-4">
                {tieneCierreJornada(inicioPendienteDetalle) ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { label: 'Fecha cierre', value: formatDateTime(inicioPendienteDetalle.fechaCierre) },
                        { label: 'Codigo cliente', value: inicioPendienteDetalle.codigoClienteCierre || '-' },
                        { label: 'Dano material', value: inicioPendienteDetalle.danoMaterial || '-' },
                        { label: 'Dano a persona', value: inicioPendienteDetalle.danoPersona || '-' },
                        { label: 'Novedades de trabajo', value: inicioPendienteDetalle.novedadesTrabajo || '-' },
                        { label: 'Observacion material', value: inicioPendienteDetalle.observacionMaterial || '-' },
                        { label: 'Observacion persona', value: inicioPendienteDetalle.observacionPersona || '-' },
                        { label: 'Observacion novedades', value: inicioPendienteDetalle.observacionNovedades || '-' },
                      ].map((item) => {
                        const showAsStatus = isSiValue(item.value) || isNoValue(item.value)
                        return (
                          <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">{item.label}</p>
                            {showAsStatus ? (
                              <p className={`mt-2 flex items-center gap-2 text-2xl font-semibold sm:text-3xl ${isSiValue(item.value) ? 'text-emerald-700' : 'text-rose-700'}`}>
                                <FontAwesomeIcon icon={isSiValue(item.value) ? faCheckCircle : faCameraRetro} className="text-3xl" />
                                <span className="text-2xl">{formatSiNoValue(item.value)}</span>
                              </p>
                            ) : (
                              <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">{item.value}</p>
                            )}
                          </div>
                        )
                      })}
                      <div className="sm:col-span-2">
                        <JornadaRemoteImageCard
                          queryKey={['supervision', 'jornada-firma-cierre', inicioPendienteDetalle.idInicio]}
                          queryFn={() => fetchInicioJornadaFirma(inicioPendienteDetalle.idInicio, 'cierre', 'supervisor')}
                          label="Firma cierre"
                          alt="Firma cierre"
                          className="h-36 w-64 bg-white object-contain"
                          fallbackValue={inicioPendienteDetalle.firmaCierre}
                          enabled={!jornadaDetalleQuery.isLoading}
                          onZoom={setZoomImageSrc}
                        />
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-100 px-5 py-4 sm:col-span-2">
                        <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">Ubicacion cierre georef</p>
                        <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">{inicioPendienteDetalle.ubicacionCierreGeoref || '-'}</p>
                        {(() => {
                          const coords = parseGeoCoords(inicioPendienteDetalle.ubicacionCierreGeoref)
                          if (!coords) return null
                          const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                          return (
                            <Button type="button" variant="secondary" className="mt-3" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
                              Abrir en Google Maps
                            </Button>
                          )
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Sin formulario de cierre registrado.
                  </div>
                )}
              </section>
            )}
          </div>
        ) : null}
      </Modal>
      <ImageLightbox open={Boolean(zoomImageSrc)} src={zoomImageSrc ?? ''} onClose={() => setZoomImageSrc(null)} />
      <FileSizeLimitModal />
    </div>
  )
}

export default SupervisorSupervisionV2Page

function DatoDetalle({ label, value, enLinea }: { label: string; value?: string | null; enLinea?: boolean }) {
  if (enLinea) {
    return (
      <p className="break-words text-xs text-slate-800">
        <span className="mr-1.5 text-xs uppercase tracking-wide text-slate-400">{label}</span>
        {value || ''}
      </p>
    )
  }
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="break-words text-xs text-slate-800">{value || ''}</p>
    </div>
  )
}
