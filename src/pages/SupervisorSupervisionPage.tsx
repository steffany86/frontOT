import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBriefcase, faCalendarCheck, faCalendarDays, faCamera, faCameraRetro, faCheckCircle, faClipboardList, faClock, faCloudArrowUp, faComments, faEllipsisVertical, faEye, faFilter, faListUl, faLocationDot, faMagnifyingGlass, faRotateRight, faScrewdriverWrench, faUser, faUserGear } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import ImageLightbox from '../components/common/ImageLightbox'
import Modal from '../components/common/Modal'
import Table, { type Column } from '../components/common/Table'
import {
  aprobarInicioJornadaPendiente,
  createSupervision,
  fetchHistoricoJornadaDetalle,
  fetchInicioJornadaImagen,
  fetchIniciosJornadaConfirmadosHoySupervision,
  fetchSupervisionDetalle,
  fetchIniciosJornadaPendientesSupervision,
  rechazarInicioJornadaPendiente,
  fetchSupervisionTecnicos,
  fetchSupervisionTiposPenalizacion,
  fetchSupervisionTiposSupervision,
  fetchSupervisionTiposTrabajo,
  fetchSupervisiones,
  fetchSupervisionesPendientes,
  realizarSupervisionPendiente,
} from '../api/supervisionApi'
import type {
  SupervisionCreatePayload,
  SupervisionInicioPendiente,
  SupervisionRegistro,
  SupervisionTecnico,
} from '../types/supervision'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

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
}

type SupervisionFiltro = {
  fechaDesde: string
  fechaHasta: string
}

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
})

const emptyFiltro = (): SupervisionFiltro => ({
  fechaDesde: '',
  fechaHasta: '',
})

const getTodayIsoDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  { key: 'fotoCanalesPilos', label: 'Foto Canales Pilos' },
  { key: 'fotoNivelesDocsis', label: 'Foto Niveles Docsis' },
  { key: 'fotoMedicionRuido', label: 'Foto Medicion Ruido' },
  { key: 'fotoBarridoCanales', label: 'Foto Barrido Canales' },
  { key: 'fotoObservacion1', label: 'Foto Observacion 1' },
  { key: 'fotoObservacion2', label: 'Foto Observacion 2' },
  { key: 'fotoObservacion3', label: 'Foto Observacion 3' },
  { key: 'fotoObservacion4', label: 'Foto Observacion 4' },
]

const cameraLikeFields: Array<keyof SupervisionForm> = ['fotoCanalesPilos', 'fotoObservacion1', 'fotoObservacion2', 'fotoObservacion3', 'fotoObservacion4']
const SUPERVISION_POR_OPTIONS = ['TIGO', 'MAKIRO'] as const
const TECNOLOGIA_OPTIONS = ['DTH', 'HFC'] as const
const TIPO_REVISION_OPTIONS = ['EXTERNA', 'INTERNA', 'Externa/Interna'] as const

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()
const normalizeUpperText = (value: string): string => value.trimStart().toUpperCase()

const toOptional = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

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

const formatIsoDateDisplay = (value?: string): string => {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
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
  if (raw.includes('/') || raw.includes('\\')) return null
  return `data:image/jpeg;base64,${raw}`
}

const resolveInicioImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  return `data:image/jpeg;base64,${raw}`
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

const isSiValue = (value?: string): boolean => String(value ?? '').trim().toUpperCase() === 'SI'
const isNoValue = (value?: string): boolean => String(value ?? '').trim().toUpperCase() === 'NO'

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

const SupervisorSupervisionPage = () => {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SupervisionForm>(emptyForm)
  const [filtroDraft, setFiltroDraft] = useState<SupervisionFiltro>(emptyFiltro)
  const [filtroActivo, setFiltroActivo] = useState<SupervisionFiltro>(emptyFiltro)
  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [detalleId, setDetalleId] = useState<string>('')
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [successForm, setSuccessForm] = useState<string | null>(null)
  const [tecnicoFilter, setTecnicoFilter] = useState('')
  const [vistaTopbar, setVistaTopbar] = useState<'supervisiones' | 'agenda' | 'aprobacion'>('aprobacion')
  const [ubicacionResolviendo, setUbicacionResolviendo] = useState(false)
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

  const tiposPenalizacionQuery = useQuery({
    queryKey: ['supervision', 'tipos-penalizacion'],
    queryFn: fetchSupervisionTiposPenalizacion,
    staleTime: 300_000,
  })

  const listadoQuery = useQuery({
    queryKey: ['supervision', 'listado', filtroActivo],
    queryFn: () =>
      fetchSupervisiones({
        fechaDesde: filtroActivo.fechaDesde || undefined,
        fechaHasta: filtroActivo.fechaHasta || undefined,
        limite: 300,
      }),
  })

  const listadoPendientesQuery = useQuery({
    queryKey: ['supervision', 'listado-pendientes', filtroActivo],
    queryFn: () =>
      fetchSupervisionesPendientes({
        fechaDesde: filtroActivo.fechaDesde || undefined,
        fechaHasta: filtroActivo.fechaHasta || undefined,
        limite: 300,
      }),
  })

  const detalleQuery = useQuery({
    queryKey: ['supervision', 'detalle', detalleId],
    queryFn: () => fetchSupervisionDetalle(detalleId),
    enabled: detalleModalOpen && Boolean(detalleId),
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

  const createMutation = useMutation({
    mutationFn: (payload: SupervisionCreatePayload) => createSupervision(payload),
    onSuccess: (result) => {
      setErrorForm(null)
      setSuccessForm(`Nota de supervision registrada. ID: ${result.idSupervision}`)
      setRegistroModalOpen(false)
      setForm(emptyForm())
      setRealizandoPendienteId('')
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado'] })
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado-pendientes'] })
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
      setRegistroModalOpen(false)
      setForm(emptyForm())
      setRealizandoPendienteId('')
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado'] })
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado-pendientes'] })
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
  const listados = listadoQuery.data ?? []
  const listadosPendientes = listadoPendientesQuery.data ?? []
  const agendaFechaSeleccionada = filtroActivo.fechaDesde || filtroDraft.fechaDesde || getTodayIsoDate()
  const supervisionesCompletadasAgenda = useMemo(
    () => listados.filter((row) => String(row.estadoSup ?? '').trim().toLowerCase().includes('complet')).length,
    [listados]
  )
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
  const tieneCierreJornada = (row: SupervisionInicioPendiente): boolean =>
    Boolean(row.fechaCierre) ||
    Boolean(row.codigoClienteCierre) ||
    Boolean(row.danoMaterial) ||
    Boolean(row.danoPersona) ||
    Boolean(row.novedadesTrabajo) ||
    Boolean(row.ubicacionCierreGeoref)
  const iniciosConfirmadosAbiertosHoy = useMemo(
    () => iniciosConfirmadosHoy.filter((row) => !tieneCierreJornada(row)),
    [iniciosConfirmadosHoy]
  )
  const cierresJornadaHoy = useMemo(
    () => iniciosConfirmadosHoy.filter((row) => tieneCierreJornada(row)),
    [iniciosConfirmadosHoy]
  )
  const tecnicos = useMemo(
    () => mergeTecnicosDisponibles(catalogoTecnicos, iniciosPendientes, iniciosConfirmadosHoy),
    [catalogoTecnicos, iniciosConfirmadosHoy, iniciosPendientes]
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
      { key: 'fechaRegistro', header: 'Fecha', render: (row) => formatDateTime(row.fechaRegistro) },
      {
        key: 'tecnicoNombre',
        header: 'Tecnico',
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
        header: 'Tecnico Auxiliar',
        render: (row) => resolveTecnicoNombre(row.idAuxiliar, row.auxiliarNombre),
      },
      {
        key: 'supervisorNombre',
        header: 'Supervisor',
        render: (row) => row.supervisorNombre || row.idSupervisor || '-',
      },
      { key: 'estado', header: 'Estado', render: (row) => tieneCierreJornada(row) ? 'JORNADA FINALIZADA' : (row.estado || 'PENDIENTE') },
      {
        key: 'acciones',
        header: 'Acciones',
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
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => abrirDetalleJornada(row, 'inicio')}>
              Ver inicio
            </Button>
            {tieneCierreJornada(row) ? (
              <Button type="button" variant="secondary" onClick={() => abrirDetalleJornada(row, 'cierre')}>
                Ver cierre
              </Button>
            ) : null}
          </div>
        ),
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

  const abrirRealizarPendiente = (row: SupervisionRegistro) => {
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
    })
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

  const tecnicosPrincipalFiltrados = useMemo(() => filterTecnicos(tecnicos), [tecnicoFilter, tecnicos])

  const columns = useMemo<Column<SupervisionRegistro>[]>(() => {
    const tipoSupervisionMap = new Map<string, string>(
      (tiposSupervisionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])
    )
    const tipoTrabajoMap = new Map<string, string>(
      (tiposTrabajoQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])
    )

    const resolveTipoSupervision = (row: SupervisionRegistro): string => {
      const id = normalizeId(row.idTipoSupervision)
      const porCatalogo = id ? tipoSupervisionMap.get(id) : undefined
      if (porCatalogo?.trim()) return porCatalogo.trim()
      if (row.tipoSupervision?.trim() && row.tipoSupervision.trim() !== id) return row.tipoSupervision.trim()
      return id || '-'
    }

    const resolveTipoTrabajo = (row: SupervisionRegistro): string => {
      const id = normalizeId(row.idTipoTrabajo)
      const porCatalogo = id ? tipoTrabajoMap.get(id) : undefined
      if (porCatalogo?.trim()) return porCatalogo.trim()
      if (row.tipoTrabajo?.trim() && row.tipoTrabajo.trim() !== id) return row.tipoTrabajo.trim()
      return id || '-'
    }

    return [
      {
        key: 'fechaRegistro',
        header: 'Fecha',
        render: (row) => {
          const { date, time } = formatDateParts(row.fechaRegistro)
          return (
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">{date}</p>
              <p className="mt-1 text-xs text-slate-500">{time}</p>
            </div>
          )
        },
      },
      {
        key: 'tecnicoPrincipal',
        header: 'Tecnico Principal',
        render: (row) => <span className="text-sm font-bold text-slate-900">{row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || '-'}</span>,
      },
      {
        key: 'tecnicoAuxiliar',
        header: 'Tecnico Auxiliar',
        render: (row) => <span className="text-sm font-medium text-slate-700">{row.tecnicoAuxiliar || tecnicoMap.get(normalizeId(row.idTecnicoAuxiliar))?.tecnico || '-'}</span>,
      },
      {
        key: 'tipoSupervision',
        header: 'Tipo Supervision',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="inline-flex w-fit items-center rounded-full bg-blue-200 px-3 py-1 text-xs font-bold text-[#0f2f63]">
              {resolveTipoSupervision(row)}
            </span>
            {row.origen === 'REV_PENALIZADA' || row.origenExterno ? (
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                Revision penalizada
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'tipoTrabajo',
        header: 'Tipo Trabajo',
        render: (row) => <span className="text-sm font-medium text-slate-700">{resolveTipoTrabajo(row)}</span>,
      },
      {
        key: 'codigo',
        header: 'Codigo',
        render: (row) => <span className="font-mono text-sm font-medium text-slate-700">{row.codigo || '-'}</span>,
      },
      {
        key: 'ordenTrabajo',
        header: 'OT',
        render: (row) => <span className="font-mono text-sm font-medium text-slate-700">{row.ordenTrabajo || '-'}</span>,
      },
      {
        key: 'acciones',
        header: 'Acciones',
        render: (row) => {
          const estado = String(row.estadoSup || '').trim().toLowerCase()
          const esPendiente = estado === 'pendiente' || estado === 'pendientes' || idsSupervisionesPendientes.has(row.idSupervision)
          return esPendiente ? (
            <Button type="button" onClick={() => abrirRealizarPendiente(row)}>
              Realizar supervision
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDetalleId(row.idSupervision)
                setDetalleModalOpen(true)
              }}
            >
              Ver detalle
            </Button>
          )
        },
      },
    ]
  }, [idsSupervisionesPendientes, tecnicoMap, tiposSupervisionQuery.data, tiposTrabajoQuery.data])

  const tipoSupervisionMap = useMemo(
    () => new Map<string, string>((tiposSupervisionQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposSupervisionQuery.data]
  )
  const tipoTrabajoMap = useMemo(
    () => new Map<string, string>((tiposTrabajoQuery.data ?? []).map((item) => [normalizeId(item.id), item.nombre])),
    [tiposTrabajoQuery.data]
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

  useEffect(() => {
    if (!registroModalOpen) return
    resolverUbicacionAltaPrecision()
  }, [registroModalOpen])

  const handlePhotoChange = async (field: keyof SupervisionForm, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await toDataUrl(file)
      setForm((prev) => ({ ...prev, [field]: dataUrl }))
    } catch {
      setErrorForm('No se pudo cargar una imagen seleccionada.')
    }
  }

  const normalizeOnlyDigits = (value: string): string => value.replace(/\D+/g, '')

  const resolverUbicacionAltaPrecision = () => {
    if (!navigator.geolocation) {
      setErrorForm('Tu navegador no soporta geolocalizacion.')
      return
    }
    setUbicacionResolviendo(true)
    setErrorForm(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const acc = position.coords.accuracy
        setForm((prev) => ({ ...prev, ubicacion: `${lat.toFixed(7)},${lng.toFixed(7)} (+/-${Math.round(acc)}m)` }))
        setUbicacionResolviendo(false)
      },
      (error) => {
        const msg = error.code === 1
          ? 'Permiso de ubicacion denegado.'
          : error.code === 2
            ? 'No se pudo determinar tu ubicacion.'
            : 'Tiempo de espera agotado al obtener ubicacion.'
        setErrorForm(msg)
        setUbicacionResolviendo(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const validateForm = (): string | null => {
    for (const field of requiredFields) {
      if (!form[field].trim()) {
        return `El campo ${field} es obligatorio.`
      }
    }
    return null
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
    }

    setErrorForm(null)
    setSuccessForm(null)
    if (realizandoPendienteId) {
      realizarPendienteMutation.mutate({ idSupervision: realizandoPendienteId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const closeRegistroModal = () => {
    setRegistroModalOpen(false)
    setRealizandoPendienteId('')
    setForm(emptyForm())
    setErrorForm(null)
    setTecnicoFilter('')
  }

  const detalle = detalleQuery.data

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Supervision</h2>
        <p className="text-sm text-slate-500">Registro manual de notas de supervision para supervisor.</p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <Button type="button" className="min-w-[180px] justify-center" variant={vistaTopbar === 'supervisiones' ? 'primary' : 'secondary'} onClick={() => setVistaTopbar('supervisiones')}>
          <FontAwesomeIcon icon={faListUl} />
          Supervisiones
        </Button>
        <Button type="button" className="min-w-[220px] justify-center" variant={vistaTopbar === 'agenda' ? 'primary' : 'secondary'} onClick={() => setVistaTopbar('agenda')}>
          <FontAwesomeIcon icon={faClipboardList} />
          Agenda Supervisión
        </Button>
        <Button type="button" className="relative min-w-[220px] justify-center" variant={vistaTopbar === 'aprobacion' ? 'primary' : 'secondary'} onClick={() => setVistaTopbar('aprobacion')}>
          <FontAwesomeIcon icon={faCheckCircle} />
          Aprobacion de jornada
          {iniciosPendientesPasados.length > 0 ? (
            <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-extrabold leading-none text-white shadow">
              {iniciosPendientesPasados.length > 99 ? '99+' : iniciosPendientesPasados.length}
            </span>
          ) : null}
        </Button>
      </div>

      {vistaTopbar === 'aprobacion' ? (
        <>
          <FormCard
            title="Confirmadas hoy"
            description={`Total confirmadas abiertas hoy: ${iniciosConfirmadosAbiertosHoy.length}`}
            actions={
              <Button
                type="button"
                variant="secondary"
                className="px-5"
                onClick={() => iniciosConfirmadosHoyQuery.refetch()}
                disabled={iniciosConfirmadosHoyQuery.isFetching}
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Recargar confirmadas
              </Button>
            }
          >
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <Table
                columns={confirmadasColumns}
                data={iniciosConfirmadosAbiertosHoy}
                stickyHeader
                desktopMinWidthClass="min-w-[980px]"
                emptyLabel={iniciosConfirmadosHoyQuery.isLoading ? 'Cargando confirmadas...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </FormCard>

          <FormCard
            title="Cierres de jornada"
            description={`Total cerradas hoy: ${cierresJornadaHoy.length}`}
            actions={
              <Button
                type="button"
                variant="secondary"
                className="px-5"
                onClick={() => iniciosConfirmadosHoyQuery.refetch()}
                disabled={iniciosConfirmadosHoyQuery.isFetching}
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Recargar cierres
              </Button>
            }
          >
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
              <Table
                columns={confirmadasColumns}
                data={cierresJornadaHoy}
                stickyHeader
                desktopMinWidthClass="min-w-[980px]"
                emptyLabel={iniciosConfirmadosHoyQuery.isLoading ? 'Cargando cierres...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </FormCard>

          <FormCard
            title="Pendientes de aprobacion"
            description={`Pendientes: ${iniciosPendientesFiltrados.length}. Hoy: ${iniciosPendientesHoy.length}. Pasados: ${iniciosPendientesPasados.length}. El tecnico no podra cerrar jornada hasta aprobar.`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={jornadaPendienteFiltro === 'hoy' ? 'primary' : 'secondary'}
                  className="relative px-5"
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
                  className="relative px-5"
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
                  className="px-5"
                  onClick={() => iniciosPendientesQuery.refetch()}
                  disabled={iniciosPendientesQuery.isFetching}
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  Recargar pendientes
                </Button>
              </div>
            }
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
              {iniciosPendientesQuery.isError ? (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {getApiErrorMessage(iniciosPendientesQuery.error, 'No se pudo cargar pendientes de jornada.')}
                </div>
              ) : null}
              <Table
                columns={pendientesColumns}
                data={iniciosPendientesFiltrados}
                stickyHeader
                desktopMinWidthClass="min-w-[760px]"
                emptyLabel={iniciosPendientesQuery.isLoading ? 'Cargando pendientes...' : jornadaPendienteFiltro === 'pasados' ? 'NO HAY PENDIENTES PASADOS' : 'NO HAY PENDIENTES PARA HOY'}
              />
            </div>
          </FormCard>
        </>
      ) : vistaTopbar === 'agenda' ? (
        <div className="grid gap-4">
          <section className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-white px-4 py-5 shadow-sm sm:px-5">
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-brand-600">
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#081a4b]">Supervisiones pendientes</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">Gestiona las supervisiones agendadas para supervisores.</p>
                  <Button
                    type="button"
                    className="mt-4 px-5"
                    onClick={() => {
                      setRealizandoPendienteId('')
                      setForm(emptyForm())
                      setErrorForm(null)
                      setTecnicoFilter('')
                      setRegistroModalOpen(true)
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendarDays} />
                    Agendar supervision
                  </Button>
                </div>
              </div>
              <div className="hidden h-28 w-32 shrink-0 items-center justify-center sm:flex">
                <div className="relative h-24 w-24 rotate-6 rounded-2xl border border-blue-100 bg-white shadow-sm">
                  <div className="h-7 rounded-t-2xl bg-blue-100" />
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span key={index} className="h-3 rounded bg-blue-100" />
                    ))}
                  </div>
                  <span className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-brand-600">
                  <FontAwesomeIcon icon={faBriefcase} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Total</p>
                  <p className="text-2xl font-extrabold leading-none text-brand-600">{listadosPendientes.length}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Supervisiones</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <FontAwesomeIcon icon={faClock} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pendientes</p>
                  <p className="text-2xl font-extrabold leading-none text-amber-600">{listadosPendientes.length}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Supervisiones</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Completadas</p>
                  <p className="text-2xl font-extrabold leading-none text-emerald-600">{supervisionesCompletadasAgenda}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Supervisiones</p>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-brand-600">
                <FontAwesomeIcon icon={faCalendarDays} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-500">Fecha</span>
                <input
                  className="mt-1 w-full border-0 bg-transparent p-0 text-base font-extrabold text-slate-900 outline-none"
                  type="date"
                  value={agendaFechaSeleccionada}
                  onChange={(event) => {
                    const nextFiltro = { fechaDesde: event.target.value, fechaHasta: event.target.value }
                    setFiltroDraft(nextFiltro)
                    setFiltroActivo(nextFiltro)
                  }}
                />
              </span>
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#081a4b]">Supervisiones pendientes agendadas</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Total: {listadosPendientes.length} supervisiones pendientes del {formatIsoDateDisplay(agendaFechaSeleccionada)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <FontAwesomeIcon icon={faClock} />
                  Pendientes
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{listadosPendientes.length}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Completadas
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">{supervisionesCompletadasAgenda}</span>
                </span>
              </div>
            </div>

            {listadoPendientesQuery.isError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getApiErrorMessage(listadoPendientesQuery.error, 'No se pudo cargar las supervisiones pendientes.')}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {listadoPendientesQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">Cargando pendientes...</div>
              ) : listadosPendientes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">NO HAY DATOS PARA LA FECHA</div>
              ) : (
                listadosPendientes.map((row) => {
                  const { date, time } = formatDateParts(row.fechaRegistro)
                  const supervisor = row.supervisor || row.idSupervisor || '-'
                  const tecnico = row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || row.idTecnicoPrincipal || '-'
                  const auxiliar = row.tecnicoAuxiliar || tecnicoMap.get(normalizeId(row.idTecnicoAuxiliar))?.tecnico || row.idTecnicoAuxiliar || '-'
                  return (
                    <article key={row.idSupervision} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-l-4 border-amber-400 p-4">
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                            <FontAwesomeIcon icon={faClock} />
                            Pendiente
                          </span>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr_1.4fr_1fr_1fr]">
                          <div>
                            <p className="text-xs font-bold text-slate-500">ID Supervision</p>
                            <p className="mt-1 text-xl font-extrabold text-[#081a4b]">{row.idSupervision}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <FontAwesomeIcon icon={faUser} />
                              Supervisor
                            </p>
                            <p className="mt-1 text-sm font-extrabold uppercase text-slate-900">{supervisor}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <FontAwesomeIcon icon={faScrewdriverWrench} />
                              Tecnico
                            </p>
                            <p className="mt-1 text-sm font-extrabold uppercase text-slate-900">{tecnico}</p>
                            {auxiliar !== '-' ? <p className="mt-0.5 text-xs font-semibold uppercase text-slate-500">{auxiliar}</p> : null}
                          </div>
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <FontAwesomeIcon icon={faBriefcase} />
                              Orden de Trabajo
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-slate-900">{row.ordenTrabajo || '-'}</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <FontAwesomeIcon icon={faCalendarDays} />
                              Fecha
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-slate-900">{date}</p>
                            <p className="text-xs font-semibold text-slate-700">{time}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" className="px-4" onClick={() => abrirRealizarPendiente(row)}>
                              <FontAwesomeIcon icon={faEye} />
                              Ver detalle
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-4"
                              onClick={() => {
                                setRealizandoPendienteId('')
                                setForm((prev) => ({
                                  ...prev,
                                  idTecnicoPrincipal: normalizeId(row.idTecnicoPrincipal),
                                  idTecnicoAuxiliar: normalizeId(row.idTecnicoAuxiliar),
                                  idTipoSupervision: normalizeId(row.idTipoSupervision),
                                  idTipoTrabajo: normalizeId(row.idTipoTrabajo),
                                  idTipoPenalizacion: normalizeId(row.idTipoPenalizacion),
                                  supervisionPor: row.supervisionPor || '',
                                  tecnologia: row.tecnologia || '',
                                  codigo: row.codigo || '',
                                  ordenTrabajo: row.ordenTrabajo || '',
                                  tipoRevision: row.tipoRevision || '',
                                  ubicacion: row.ubicacion || '',
                                }))
                                setErrorForm(null)
                                setTecnicoFilter('')
                                setRegistroModalOpen(true)
                              }}
                            >
                              <FontAwesomeIcon icon={faCalendarDays} />
                              Reagendar
                            </Button>
                          </div>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
                            aria-label="Mas opciones"
                          >
                            <FontAwesomeIcon icon={faEllipsisVertical} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>
        </div>
      ) : (
        <>
          <FormCard
            title="Filtros"
            description="Filtra notas por rango de fechas."
            actions={
              <>
                <Button
                  type="button"
                  onClick={() => {
                    setRealizandoPendienteId('')
                    setForm(emptyForm())
                    setErrorForm(null)
                    setTecnicoFilter('')
                    setRegistroModalOpen(true)
                  }}
                  className="px-5"
                >
                  + Nueva supervision
                </Button>
                <Button type="button" variant="secondary" className="px-5" onClick={() => { setFiltroDraft(emptyFiltro()); setFiltroActivo(emptyFiltro()) }}>
                  Limpiar
                </Button>
                <Button type="button" className="px-5" onClick={() => setFiltroActivo(filtroDraft)}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  Buscar
                </Button>
              </>
            }
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FontAwesomeIcon icon={faFilter} className="text-brand-600" />
              Busqueda por rango de fechas
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fecha desde">
                <input
                  className="input-base"
                  type="date"
                  value={filtroDraft.fechaDesde}
                  onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaDesde: event.target.value }))}
                />
              </Field>
              <Field label="Fecha hasta">
                <input
                  className="input-base"
                  type="date"
                  value={filtroDraft.fechaHasta}
                  onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaHasta: event.target.value }))}
                />
              </Field>
            </div>
          </FormCard>

          {successForm ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successForm}</div>
          ) : null}

          <FormCard title="Notas registradas" description={`Total: ${listados.length}`}>
            {listadoQuery.isError ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getApiErrorMessage(listadoQuery.error, 'No se pudo cargar las notas de supervision.')}
              </div>
            ) : null}
            <div className="md:hidden space-y-3">
              {listadoQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Cargando notas...</div>
              ) : listados.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                  <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
                </div>
              ) : (
                listados.map((row) => (
                  <article key={row.idSupervision} className="rounded-3xl border border-[#cfd8ee] bg-white p-3 shadow-sm">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] leading-5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha</p>
                          <p className="font-semibold text-slate-700">{formatDateTime(row.fechaRegistro)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tecnico Principal</p>
                          <p className="font-semibold text-slate-700">{row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tecnico Auxiliar</p>
                          <p className="font-semibold text-slate-700">{row.tecnicoAuxiliar || tecnicoMap.get(normalizeId(row.idTecnicoAuxiliar))?.tecnico || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo Supervision</p>
                          <p className="font-semibold text-slate-700">{resolveTipoSupervisionDetalle(row)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo Trabajo</p>
                          <p className="font-semibold text-slate-700">{resolveTipoTrabajoDetalle(row)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Codigo</p>
                          <p className="font-semibold text-slate-700">{row.codigo || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OT</p>
                          <p className="font-semibold text-slate-700">{row.ordenTrabajo || '-'}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full justify-center"
                          onClick={() => {
                            setDetalleId(row.idSupervision)
                            setDetalleModalOpen(true)
                          }}
                        >
                          Ver detalle
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="hidden md:block rounded-2xl border border-slate-200 bg-white p-2">
              <Table
                columns={columns}
                data={listados}
                stickyHeader
                density="compact"
                desktopMinWidthClass="min-w-[920px]"
                emptyLabel={listadoQuery.isLoading ? 'Cargando notas...' : 'NO HAY DATOS PARA LA FECHA'}
              />
            </div>
          </FormCard>
        </>
      )}

      <Modal
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
        open={registroModalOpen}
        title={realizandoPendienteId ? "Realizar supervision pendiente" : "Nueva nota de supervision"}
        onClose={closeRegistroModal}
        maxWidthClass="max-w-5xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeRegistroModal}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitForm} disabled={createMutation.isPending || realizarPendienteMutation.isPending}>
              {createMutation.isPending || realizarPendienteMutation.isPending
                ? 'Guardando...'
                : realizandoPendienteId
                  ? 'Finalizar supervision'
                  : 'Guardar nota'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faUserGear} className="text-brand-600" />Informacion del tecnico</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Filtro rapido de tecnicos">
                  <input
                    className="input-base"
                    type="text"
                    placeholder="Buscar por nombre o ID..."
                    value={tecnicoFilter}
                    onChange={(e) => setTecnicoFilter(e.target.value)}
                    disabled={tecnicosQuery.isLoading || camposBaseBloqueados}
                  />
                </Field>
                <div />
                <Field label="Tecnico principal (Obligatorio)">
                  <select
                    className="input-base"
                    value={form.idTecnicoPrincipal}
                    disabled={tecnicosQuery.isLoading || camposBaseBloqueados}
                    onChange={(event) => {
                      const selectedId = event.target.value
                      setForm((prev) => ({
                        ...prev,
                        idTecnicoPrincipal: selectedId,
                      }))
                    }}
                  >
                    <option value="">{tecnicosQuery.isLoading ? 'Cargando tecnicos...' : 'Selecciona tecnico'}</option>
                    {tecnicosPrincipalFiltrados.map((item) => (
                      <option key={`p-${item.idTecnico}`} value={item.idTecnico}>
                        {item.tecnico}
                      </option>
                    ))}
                  </select>
                </Field>
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
                <Field label="Codigo cliente (Obligatorio)">
                  <input
                    className="input-base"
                    value={form.codigo}
                    maxLength={30}
                    onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.trimStart().toUpperCase() }))}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faClipboardList} className="text-brand-600" />Detalles de supervision</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo supervision (Obligatorio)">
                  <select
                    className="input-base"
                    value={form.idTipoSupervision}
                    disabled={camposBaseBloqueados}
                    onChange={(event) => setForm((prev) => ({ ...prev, idTipoSupervision: event.target.value }))}
                  >
                    <option value="">Selecciona tipo</option>
                    {(tiposSupervisionQuery.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo trabajo (Obligatorio)">
                  <select
                    className="input-base"
                    value={form.idTipoTrabajo}
                    disabled={camposBaseBloqueados}
                    onChange={(event) => setForm((prev) => ({ ...prev, idTipoTrabajo: event.target.value }))}
                  >
                    <option value="">Selecciona tipo</option>
                    {(tiposTrabajoQuery.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo penalizacion (Obligatorio)">
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
                <Field label="Supervision por (Obligatorio)">
                  <select className="input-base" value={form.supervisionPor} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, supervisionPor: e.target.value }))}>
                    <option value="">Selecciona supervision</option>
                    {SUPERVISION_POR_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faScrewdriverWrench} className="text-brand-600" />Informacion de obra</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tecnologia (Obligatorio)">
                  <select className="input-base" value={form.tecnologia} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, tecnologia: e.target.value }))}>
                    <option value="">Selecciona tecnologia</option>
                    {TECNOLOGIA_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo revision (Obligatorio)">
                  <select className="input-base" value={form.tipoRevision} disabled={camposBaseBloqueados} onChange={(e) => setForm((p) => ({ ...p, tipoRevision: e.target.value }))}>
                    <option value="">Selecciona tipo revision</option>
                    {TIPO_REVISION_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Orden de trabajo (Obligatorio)">
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

            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faLocationDot} className="text-brand-600" />Ubicacion</h4>
              <div className="space-y-3">
                <Field label="Coordenadas / direccion">
                  <input className="input-base bg-slate-100" value={form.ubicacion} readOnly />
                </Field>
                <Button type="button" variant="secondary" onClick={resolverUbicacionAltaPrecision} disabled={ubicacionResolviendo} className="w-full">
                  {ubicacionResolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion exacta'}
                </Button>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faComments} className="text-brand-600" />Observaciones</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Observacion">
                <textarea className="input-base min-h-28" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
              </Field>
              <Field label="Descripcion adicional observacion">
                <textarea className="input-base min-h-28" value={form.descripcionAdicionalObservacion} onChange={(e) => setForm((p) => ({ ...p, descripcionAdicionalObservacion: e.target.value }))} />
              </Field>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-[#cfd8ee] bg-white p-4">
          <h4 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-800"><FontAwesomeIcon icon={faCamera} className="text-brand-600" />Archivos y fotos</h4>
          <div className="grid gap-4 md:grid-cols-2">
            {photoFields.map((photo) => (
              <div key={photo.key} className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{photo.label}</p>
                {resolveImageSrc(form[photo.key]) ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <img
                      src={resolveImageSrc(form[photo.key]) ?? ''}
                      alt={photo.label}
                      className="h-32 w-full cursor-zoom-in rounded-lg border border-slate-200 object-cover"
                      onClick={() => setZoomImageSrc(resolveImageSrc(form[photo.key]) ?? null)}
                    />
                    <input className="mt-3 input-base" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
                  </div>
                ) : (
                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
                    <input className="hidden" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
                    <FontAwesomeIcon icon={cameraLikeFields.includes(photo.key) ? faCameraRetro : faCloudArrowUp} className="mb-2 text-xl text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">
                      {cameraLikeFields.includes(photo.key) ? 'Tomar fotografia' : 'Haz clic para subir o arrastra el archivo'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cameraLikeFields.includes(photo.key) ? 'Usa la camara del dispositivo' : 'JPG, PNG o PDF (Max. 10MB)'}
                    </p>
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>

        {errorForm ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorForm}</div>
        ) : null}
      </Modal>

      <Modal
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
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><FontAwesomeIcon icon={faUserGear} className="text-blue-700" />Informacion General</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Fecha</p><p className="text-sm font-semibold">{formatDateTime(detalle.fechaRegistro)}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Supervisor</p><p className="text-sm font-semibold">{detalle.supervisor || detalle.idSupervisor || '-'}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Tecnico principal</p><p className="text-sm font-semibold">{detalle.tecnicoPrincipal || detalle.idTecnicoPrincipal || '-'}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Tecnico auxiliar</p><p className="text-sm font-semibold">{detalle.tecnicoAuxiliar || detalle.idTecnicoAuxiliar || '-'}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Tipo supervision</p><p className="text-sm font-semibold">{resolveTipoSupervisionDetalle(detalle)}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-500">Tipo trabajo</p><p className="text-sm font-semibold">{resolveTipoTrabajoDetalle(detalle)}</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><FontAwesomeIcon icon={faClipboardList} className="text-blue-700" />Referencias</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Orden de trabajo:</span> <span className="font-semibold">{detalle.ordenTrabajo || '-'}</span></p>
                  <p><span className="text-slate-500">Codigo:</span> <span className="font-semibold">{detalle.codigo || '-'}</span></p>
                  <p><span className="text-slate-500">Tecnologia:</span> <span className="font-semibold">{detalle.tecnologia || '-'}</span></p>
                  <p><span className="text-slate-500">Tipo revision:</span> <span className="font-semibold">{detalle.tipoRevision || '-'}</span></p>
                  <p><span className="text-slate-500">Supervision por:</span> <span className="font-semibold">{detalle.supervisionPor || '-'}</span></p>
                  <p><span className="text-slate-500">Penalizacion:</span> <span className="font-semibold">{detalle.tipoPenalizacion || '-'}</span></p>
                </div>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><FontAwesomeIcon icon={faLocationDot} className="text-blue-700" />Ubicacion del Servicio</h4>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">{detalle.ubicacion || '-'}</div>
                {(() => {
                  const coords = parseGeoCoords(detalle.ubicacion)
                  if (!coords) return null
                  const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                  return (
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir en Google Maps
                    </Button>
                  )
                })()}
              </section>
              <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><FontAwesomeIcon icon={faComments} className="text-rose-600" />Observaciones y Comentarios</h4>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] uppercase text-slate-500">Observacion principal</p>
                    <p className="text-sm">{detalle.observacion || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] uppercase text-slate-500">Descripcion adicional</p>
                    <p className="text-sm">{detalle.descripcionAdicionalObservacion || '-'}</p>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FontAwesomeIcon icon={faCamera} className="text-blue-700" />Galeria de Evidencias</h4>
                <span className="text-xs text-slate-500">{photoFields.filter((p) => resolveImageSrc(detalle[p.key])).length} fotos registradas</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {photoFields.map((photo) => {
                const src = resolveImageSrc(detalle[photo.key])
                return (
                  <div key={photo.key} className="rounded-xl border border-slate-200 bg-white p-2">
                    {src ? (
                      <img
                        src={src}
                        alt={photo.label}
                        className="h-28 w-full cursor-zoom-in rounded-lg border border-slate-200 object-cover"
                        onClick={() => setZoomImageSrc(src)}
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">Sin imagen</div>
                    )}
                    <p className="mt-2 truncate text-[11px] text-slate-500">{photo.label}</p>
                  </div>
                )
              })}
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
      <Modal
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
                <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5">
                  <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">Imagen inicio</p>
                  {resolveInicioImageSrc(inicioPendienteDetalle.imagen) ? (
                    <button
                      type="button"
                      className="mt-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                      onClick={() => setZoomImageSrc(resolveInicioImageSrc(inicioPendienteDetalle.imagen))}
                    >
                      <img
                        src={resolveInicioImageSrc(inicioPendienteDetalle.imagen) ?? ''}
                        alt="Inicio jornada"
                        className="h-48 w-full rounded-xl border border-slate-300 object-cover"
                      />
                    </button>
                  ) : (
                    <p className="mt-2 text-2xl font-semibold text-slate-900">-</p>
                  )}
                </div>
                {resolveInicioImageSrc(inicioPendienteDetalle.imagenAuxiliar) ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5">
                    <p className="text-sm font-semibold tracking-[0.2em] text-slate-700">Imagen auxiliar</p>
                    <button
                      type="button"
                      className="mt-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                      onClick={() => setZoomImageSrc(resolveInicioImageSrc(inicioPendienteDetalle.imagenAuxiliar))}
                    >
                      <img
                        src={resolveInicioImageSrc(inicioPendienteDetalle.imagenAuxiliar) ?? ''}
                        alt="Auxiliar inicio jornada"
                        className="h-48 w-full rounded-xl border border-slate-300 object-cover"
                      />
                    </button>
                  </div>
                ) : null}
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
                            <span className="text-2xl">{item.value}</span>
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
                                <span className="text-2xl">{item.value}</span>
                              </p>
                            ) : (
                              <p className="mt-2 text-2xl font-semibold leading-tight text-slate-900">{item.value}</p>
                            )}
                          </div>
                        )
                      })}
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
    </div>
  )
}

export default SupervisorSupervisionPage
