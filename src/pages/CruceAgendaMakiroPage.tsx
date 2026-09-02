import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAngleLeft,
  faAngleRight,
  faCalendarDay,
  faChevronRight,
  faCheck,
  faDownload,
  faEye,
  faFilePdf,
  faFilter,
  faMagnifyingGlass,
  faRotateRight,
  faTableList,
} from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { fetchBoletaDigitalArchivo } from '../api/boletaDigitalApi'
import { fetchCruceAgendaMakiro, marcarCruceVerificaBack, type CruceAgendaMakiroRow } from '../api/cruceAgendaMakiroApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const formatLocalDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const normalizeKey = (value: string): string => value.trim().toLowerCase().replace(/[\s_]+/g, '')

const columnAliasGroups = {
  tipoCruce: ['TipoCruce', 'tipo_cruce', 'tipoCruce', 'tipo'],
  tecnicoNombre: ['TECNICO', 'tecnico_nombre', 'tecnico', 'nombre_tecnico', 'Tecnico'],
  estado: ['estado', 'Estado', 'estado_cruce', 'cierre', 'CIERRE'],
  sucursal: ['Sucursal', 'Sucursal_2', 'sucursal', 'Ciudad', 'ciudad'],
  actualizadoNodo: ['Actualizado_NODO_SI_NO', 'Actualizado_NODO', 'actualizado_nodo', 'actualizadoNodo', 'Act_Nodo'],
  actualizadoGeo: ['Actualizado_GEO_SI_NO', 'Actualizado_GEO', 'actualizado_geo', 'actualizadoGeo', 'Act_Geo'],
  actualizadoBoleta: ['Actualizado_BOLETA_SI_NO', 'Actualizado_BOLETA', 'actualizado_boleta', 'actualizadoBoleta', 'Act_Boleta'],
  actualizadoDigitacion: ['Actualizado_DIGITACION_SI_NO', 'Actualizado_DIGITACION', 'actualizado_digitacion', 'actualizadoDigitacion', 'Act_Digitacion'],
  actualizadoVerificaBack: ['Actualizado_VERIFICABACK', 'actualizadoVerificaBack', 'actualizado_verificaback'],
  actualizadoVerificaBackSiNo: ['Actualizado_VERIFICABACK_SI_NO', 'actualizadoVerificaBackSiNo', 'actualizado_verificaback_si_no'],
  usuarioVerificaBack: ['usuarioModificacion_VERIFICABACK', 'usuarioVerificaBack', 'usuario_verificaback'],
  fechaVerificaBack: ['fechaRegistro_VERIFICABACK', 'fechaVerificaBack', 'fecha_verificaback'],
  observacionVerificaBack: ['Observacion_VERIFICABACK', 'observacionVerificaBack', 'observacion_verificaback'],
  idHistorial: ['Id_BO_CITA_MAKIRO_Historial', 'id_BO_CITA_MAKIRO_Historial', 'idBoCitaMakiroHistorial'],
  tieneDetalle: ['TieneDetalle', 'Tiene_Detalle', 'tieneDetalle', 'tiene_detalle'],
  ingresoMaterial: ['IngresoMaterial', 'ingresoMaterial', 'ingreso_material'],
  fechaEjecucion: ['Fecha_Ejecucion', 'fecha_ejecucion', 'fechaEjecucion', 'FechaEjecucion', 'fecha'],
  inicioAgendado: ['inicio_agendado', 'Inicio_Agendado', 'InicioAgendado', 'fechaAgenda', 'FechaAgenda', 'fecha_agenda'],
  ordenTrabajo: ['OT_int', 'OrdenTrabajo', 'ordenTrabajo', 'OT', 'ot', 'numeroOrden', 'NumeroOrden', 'nroOT'],
  clienteNro: ['cliente_nro', 'CodigoCliente', 'codigoCliente', 'Cliente_Nro', 'clienteNro'],
  fechaGeneral: ['Fecha', 'fecha'],
  geosur: ['GeoSur', 'geoSur', 'latitud'],
  geooeste: ['GeoOeste', 'geoOeste', 'longitud'],
  nodoRamalTap: ['Nodo_Ramal_Tap', 'nodoRamalTap'],
  observacion: ['Observacion', 'observacion', 'Observacion_DIGITACION'],
  tipoTecnologia: ['TipoTecnologia', 'tipoTecnologia', 'tipo_tecnologia'],
  rutaPdf: ['RutaPdf', 'RutaPDF', 'rutaPdf', 'ruta_pdf', 'pdf'],
} as const

const readValue = (row: CruceAgendaMakiroRow, keys: string[]): string => {
  for (const key of keys) {
    const direct = row[key]
    if (direct !== undefined && direct !== null && direct !== '') return displayValue(direct)
    const match = Object.keys(row).find((candidate) => normalizeKey(candidate) === normalizeKey(key))
    if (!match) continue
    const value = row[match]
    if (value !== undefined && value !== null && value !== '') return displayValue(value)
  }
  return ''
}

const normalizeFilterValue = (value: string): string => value.trim().toLowerCase()

const normalizeRoleName = (value: string): string => value.trim().toLowerCase().replace(/[\s_]+/g, '')

const isTruthySqlValue = (value: string): boolean => {
  const normalized = normalizeFilterValue(value)
  return ['1', 'true', 'si', 'sí', 'ok', 'yes'].includes(normalized)
}

const uniqueOptions = (rows: CruceAgendaMakiroRow[], keys: string[]): string[] => {
  const values = new Set<string>()
  rows.forEach((row) => {
    const value = readValue(row, keys).trim()
    if (value) {
      values.add(value)
    }
  })
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'es'))
}

const matchesSelectFilter = (row: CruceAgendaMakiroRow, keys: string[], selected: string): boolean => {
  if (!selected) return true
  return normalizeFilterValue(readValue(row, keys)) === normalizeFilterValue(selected)
}

const matchesMultiSelectFilter = (row: CruceAgendaMakiroRow, keys: string[], selected: string[]): boolean => {
  if (!selected.length) return true
  const value = normalizeFilterValue(readValue(row, keys))
  return selected.some((item) => normalizeFilterValue(item) === value)
}

const preliminaryColumns = [
  [...columnAliasGroups.clienteNro],
  [...columnAliasGroups.ordenTrabajo],
  [...columnAliasGroups.estado],
  [...columnAliasGroups.sucursal],
  [...columnAliasGroups.tecnicoNombre],
  [...columnAliasGroups.actualizadoNodo],
  [...columnAliasGroups.actualizadoGeo],
  [...columnAliasGroups.actualizadoBoleta],
  [...columnAliasGroups.actualizadoDigitacion],
  [...columnAliasGroups.ingresoMaterial],
  [...columnAliasGroups.tipoCruce],
]

// Este identificador llega en la fila y se usa para guardar la verificacion,
// pero no forma parte de las columnas visibles del grid.
const isInternalColumn = (column: string): boolean =>
  columnAliasGroups.idHistorial.some((alias) => normalizeKey(alias) === normalizeKey(column))

const buildColumns = (rows: CruceAgendaMakiroRow[]): string[] => {
  const all = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((key) => all.add(key)))
  return preliminaryColumns
    .map((aliases) => Array.from(all).find((column) => aliases.some((alias) => normalizeKey(alias) === normalizeKey(column))))
    .filter((column): column is string => typeof column === 'string' && !isInternalColumn(column))
}

const displayHeaderLabel = (column: string): string => {
  const labels: Record<string, string> = {
    Id_Venta: 'ID VENTA',
    IdVenta: 'ID VENTA',
    idVenta: 'ID VENTA',
    id_venta: 'ID VENTA',
    TipoCruce: 'TIPO CRUCE',
    tipoCruce: 'TIPO CRUCE',
    tipo_cruce: 'TIPO CRUCE',
    cliente_nro: 'CLIENTE',
    codigoCliente: 'CLIENTE',
    Cliente_Nro: 'CLIENTE',
    OT_int: 'OT / NRO',
    OrdenTrabajo: 'OT / NRO',
    ordenTrabajo: 'OT / NRO',
    estado: 'ESTADO',
    estado_cruce: 'ESTADO',
    Sucursal: 'SUCURSAL',
    sucursal: 'SUCURSAL',
    tecnico_nombre: 'TECNICO',
    TECNICO: 'TECNICO',
    tecnico: 'TECNICO',
    Actualizado_NODO_SI_NO: 'REV. NODO',
    Actualizado_NODO: 'REV. NODO',
    actualizadoNodo: 'REV. NODO',
    Actualizado_GEO_SI_NO: 'REV. GEO',
    Actualizado_GEO: 'REV. GEO',
    actualizadoGeo: 'REV. GEO',
    Actualizado_BOLETA_SI_NO: 'REV.BOL',
    Actualizado_BOLETA: 'REV.BOL',
    actualizadoBoleta: 'REV.BOL',
    Actualizado_DIGITACION_SI_NO: 'REV.DIG',
    Actualizado_DIGITACION: 'REV.DIG',
    TieneDetalle: 'INGRESO MATERIAL',
    tiene_detalle: 'INGRESO MATERIAL',
    IngresoMaterial: 'INGRESO MATERIAL',
    ingresoMaterial: 'INGRESO MATERIAL',
    Fecha_Ejecucion: 'FECHA EJECUCION',
    fechaEjecucion: 'FECHA EJECUCION',
    Fecha: 'FECHA',
    inicio_agendado: 'AGENDA',
    fechaAgenda: 'AGENDA',
    TOR: 'TOR',
    M_ORIGEN: 'M ORIGEN',
    M_CUMPLIMIENTO: 'M CUMPLIMIENTO',
    GeoSur: 'GEO SUR',
    GeoOeste: 'GEO OESTE',
    CIERRE: 'CIERRE',
    N_T_B: 'N T B',
    fecha_Ejecuacion_DIGITACION: 'FECHA DIGITACION',
    Estado_DIGITACION: 'ESTADO DIGITACION',
    Observacion_DIGITACION: 'OBS DIGITACION',
    RutaPdf: 'RUTA PDF',
    rutaPdf: 'RUTA PDF',
  }
  return labels[column] ?? column.replace(/_/g, ' ')
}

const renderTableValue = (column: string, row: CruceAgendaMakiroRow): string => {
  const value = row[column]
  if (column === 'estado' && typeof value === 'string') return value
  if (columnAliasGroups.fechaEjecucion.some((alias) => normalizeKey(alias) === normalizeKey(column)) || columnAliasGroups.inicioAgendado.some((alias) => normalizeKey(alias) === normalizeKey(column))) {
    return formatCellDate(displayValue(value))
  }
  if (columnAliasGroups.fechaGeneral.some((alias) => normalizeKey(alias) === normalizeKey(column)) || normalizeKey(column) === 'fechaejecuaciondigitacion') {
    return formatCellDate(displayValue(value))
  }
  return displayValue(value)
}

const csvEscape = (value: unknown): string => {
  const text = displayValue(value).replace(/\r?\n/g, ' ')
  return `"${text.replace(/"/g, '""')}"`
}

const downloadCsv = (rows: CruceAgendaMakiroRow[], columns: string[], fecha: string): void => {
  const csv = [columns.map(csvEscape).join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cruce-agenda-makiro-${fecha}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const readByToken = (row: CruceAgendaMakiroRow, includeTokens: string[], excludeTokens: string[] = []): string => {
  const normalizedIncludes = includeTokens.map((token) => normalizeKey(token))
  const normalizedExcludes = excludeTokens.map((token) => normalizeKey(token))
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue
    const normalized = normalizeKey(key)
    if (normalizedExcludes.some((token) => normalized.includes(token))) continue
    if (!normalizedIncludes.every((token) => normalized.includes(token))) continue
    return displayValue(value)
  }
  return ''
}

const formatCellDate = (value: string): string => {
  const text = value.trim()
  if (!text) return '-'
  const normalized = text.replace('T', ' ')
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/)
  if (!match) return text
  const hh = match[4]
  const mm = match[5]
  const datePart = `${match[3]}/${match[2]}/${match[1]}`
  return hh && mm ? `${datePart} ${hh}:${mm}` : datePart
}

const statusBadgeClass = (status: string): string => {
  const normalized = normalizeFilterValue(status)
  if (normalized.includes('acept')) return 'bg-emerald-100 text-emerald-700'
  if (normalized.includes('final')) return 'bg-blue-100 text-blue-700'
  if (normalized.includes('proceso') || normalized.includes('sitio')) return 'bg-amber-100 text-amber-700'
  if (normalized.includes('pend')) return 'bg-slate-200 text-slate-700'
  if (normalized.includes('fall') || normalized.includes('rechaz')) return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

const getHistorialId = (row: CruceAgendaMakiroRow): number | null => {
  const value = (readValue(row, [...columnAliasGroups.idHistorial]) || readByToken(row, ['id', 'bo', 'cita', 'makiro', 'historial'])).trim()
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const isVerificaBackOk = (row: CruceAgendaMakiroRow): boolean => {
  const value = readValue(row, [...columnAliasGroups.actualizadoVerificaBackSiNo]).trim()
  return normalizeFilterValue(value) === 'si'
}

type RowCard = {
  idHistorial: string
  tipo: string
  ot: string
  agenda: string
  fecha: string
  estado: string
  tecnico: string
  cliente: string
  clienteCodigo: string
  tor: string
  sucursal: string
  tecnologia: string
  nodo: string
  referencia: string
  latitudGps: string
  longitudGps: string
  latitudIngreso: string
  longitudIngreso: string
  observaciones: string
  rutaPdf: string
}

type CruceMetric = {
  label: string
  value: number
  tone: string
}

const toRowCard = (row: CruceAgendaMakiroRow): RowCard => {
  const idHistorial = readValue(row, [...columnAliasGroups.idHistorial]) || readByToken(row, ['id', 'bo', 'cita', 'makiro', 'historial']) || '-'
  const tipo = readValue(row, [...columnAliasGroups.tipoCruce]) || readByToken(row, ['tipo']) || '-'
  const ot = readValue(row, [...columnAliasGroups.ordenTrabajo]) || readByToken(row, ['ot']) || '-'
  const agenda =
    readValue(row, [...columnAliasGroups.inicioAgendado, 'Agenda', 'CodigoAgenda']) ||
    readByToken(row, ['agenda']) ||
    readByToken(row, ['agendado']) ||
    '-'
  const fecha =
    readValue(row, [...columnAliasGroups.fechaEjecucion]) ||
    readByToken(row, ['fecha', 'ejec']) ||
    readByToken(row, ['fecha']) ||
    '-'
  const estado =
    readValue(row, [...columnAliasGroups.estado]) ||
    readByToken(row, ['estado']) ||
    readByToken(row, ['cierre']) ||
    '-'
  const tecnico =
    readValue(row, [...columnAliasGroups.tecnicoNombre]) ||
    readByToken(row, ['tecnico']) ||
    readByToken(row, ['usuario']) ||
    '-'
  const cliente = readValue(row, ['cliente', 'Cliente']) || readByToken(row, ['cliente'], ['codigo']) || '-'
  const clienteCodigo = readValue(row, [...columnAliasGroups.clienteNro]) || readByToken(row, ['cliente', 'codigo']) || '-'
  const tor = readValue(row, ['TOR', 'tor']) || '-'
  const sucursal = readValue(row, [...columnAliasGroups.sucursal]) || readByToken(row, ['sucursal']) || readByToken(row, ['ciudad']) || '-'
  const tecnologia = readValue(row, [...columnAliasGroups.tipoTecnologia]) || readByToken(row, ['tecnologia']) || '-'
  const nodo = readValue(row, [...columnAliasGroups.nodoRamalTap]) || readByToken(row, ['nodo']) || '-'
  const referencia = readByToken(row, ['referencia']) || '-'
  const latitudGps = readValue(row, [...columnAliasGroups.geosur]) || readByToken(row, ['latitud', 'gps']) || readByToken(row, ['latitud']) || '-'
  const longitudGps = readValue(row, [...columnAliasGroups.geooeste]) || readByToken(row, ['longitud', 'gps']) || readByToken(row, ['longitud']) || '-'
  const latitudIngreso = readByToken(row, ['latitud', 'ingreso']) || '-'
  const longitudIngreso = readByToken(row, ['longitud', 'ingreso']) || '-'
  const observaciones = readValue(row, [...columnAliasGroups.observacion]) || readByToken(row, ['observ']) || '-'
  const rutaPdf = readValue(row, [...columnAliasGroups.rutaPdf]) || readByToken(row, ['ruta', 'pdf']) || '-'

  return {
    idHistorial,
    tipo,
    ot,
    agenda,
    fecha,
    estado,
    tecnico,
    cliente,
    clienteCodigo,
    tor,
    sucursal,
    tecnologia,
    nodo,
    referencia,
    latitudGps,
    longitudGps,
    latitudIngreso,
    longitudIngreso,
    observaciones,
    rutaPdf,
  }
}

interface CruceAgendaMakiroPageProps {
  backOffice?: boolean
}

type VerificaBackFilter = 'pendientes' | 'verificados'

const CruceAgendaMakiroPage = ({ backOffice = false }: CruceAgendaMakiroPageProps) => {
  const queryClient = useQueryClient()
  const { roleName } = useAuth()
  const [fecha, setFecha] = useState(() => formatLocalDateInput(new Date()))
  const [filtro, setFiltro] = useState('')
  const [tipoCruce, setTipoCruce] = useState('')
  const [tecnicoNombre, setTecnicoNombre] = useState('')
  const [estadoSeleccionados, setEstadoSeleccionados] = useState<string[]>([])
  const [sucursal, setSucursal] = useState('')
  const [actualizadoNodo, setActualizadoNodo] = useState('')
  const [actualizadoGeo, setActualizadoGeo] = useState('')
  const [actualizadoBoleta, setActualizadoBoleta] = useState('')
  const [actualizadoDigitacion, setActualizadoDigitacion] = useState('')
  const [ingresoMaterial, setIngresoMaterial] = useState('')
  const [selectedRowIndex, setSelectedRowIndex] = useState(0)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<'resumen' | 'completo' | 'archivo'>('resumen')
  const [page, setPage] = useState(1)
  const [archivoError, setArchivoError] = useState<string | null>(null)
  const [openingArchivo, setOpeningArchivo] = useState(false)
  const [estadoMenuOpen, setEstadoMenuOpen] = useState(false)
  const [verificaBackRow, setVerificaBackRow] = useState<CruceAgendaMakiroRow | null>(null)
  const [verificaBackObservacion, setVerificaBackObservacion] = useState('')
  const [verificaBackError, setVerificaBackError] = useState<string | null>(null)
  const [verificaBackFilter, setVerificaBackFilter] = useState<VerificaBackFilter>('pendientes')
  const estadoMenuRef = useRef<HTMLDivElement | null>(null)

  const pageSize = 10
  const canManageVerificaBack = !backOffice && ['backoffice', 'backofficev'].includes(normalizeRoleName(roleName))

  const query = useQuery({
    queryKey: ['cruce-agenda-makiro', fecha],
    queryFn: () => fetchCruceAgendaMakiro(fecha),
    enabled: Boolean(fecha),
  })

  const verificaBackMutation = useMutation({
    mutationFn: ({ idHistorial, observacion }: { idHistorial: number; observacion: string }) =>
      marcarCruceVerificaBack(idHistorial, observacion),
    onSuccess: () => {
      setVerificaBackRow(null)
      setVerificaBackObservacion('')
      setVerificaBackError(null)
      queryClient.invalidateQueries({ queryKey: ['cruce-agenda-makiro', fecha] })
    },
    onError: (error) => {
      setVerificaBackError(getApiErrorMessage(error, 'No se pudo marcar la revision.'))
    },
  })

  const rows = query.data ?? []
  const tipoCruceOptions = useMemo(() => uniqueOptions(rows, [...columnAliasGroups.tipoCruce]), [rows])
  const tecnicoNombreOptions = useMemo(() => uniqueOptions(rows, [...columnAliasGroups.tecnicoNombre]), [rows])
  const estadoOptions = useMemo(() => uniqueOptions(rows, [...columnAliasGroups.estado]), [rows])
  const sucursalOptions = useMemo(() => uniqueOptions(rows, [...columnAliasGroups.sucursal]), [rows])
  const actualizadoNodoOptions = useMemo(
    () => uniqueOptions(rows, [...columnAliasGroups.actualizadoNodo]),
    [rows]
  )
  const actualizadoGeoOptions = useMemo(
    () => uniqueOptions(rows, [...columnAliasGroups.actualizadoGeo]),
    [rows]
  )
  const actualizadoBoletaOptions = useMemo(
    () => uniqueOptions(rows, [...columnAliasGroups.actualizadoBoleta]),
    [rows]
  )
  const actualizadoDigitacionOptions = useMemo(
    () => uniqueOptions(rows, [...columnAliasGroups.actualizadoDigitacion]),
    [rows]
  )
  const ingresoMaterialOptions = useMemo(
    () => uniqueOptions(rows, [...columnAliasGroups.ingresoMaterial]),
    [rows]
  )
  const estadoFilterLabel = useMemo(() => {
    if (!estadoSeleccionados.length) return 'Todos'
    if (estadoSeleccionados.length === 1) return estadoSeleccionados[0]
    return `${estadoSeleccionados.length} seleccionados`
  }, [estadoSeleccionados])

  const filteredRows = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    return rows.filter((row) => {
      if (!matchesSelectFilter(row, [...columnAliasGroups.tipoCruce], tipoCruce)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.tecnicoNombre], tecnicoNombre)) return false
      if (!matchesMultiSelectFilter(row, [...columnAliasGroups.estado], estadoSeleccionados)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.sucursal], sucursal)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.actualizadoNodo], actualizadoNodo)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.actualizadoGeo], actualizadoGeo)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.actualizadoBoleta], actualizadoBoleta)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.actualizadoDigitacion], actualizadoDigitacion)) return false
      if (!matchesSelectFilter(row, [...columnAliasGroups.ingresoMaterial], ingresoMaterial)) return false
      if (!term) return true
      return Object.values(row).some((value) => displayValue(value).toLowerCase().includes(term))
    })
  }, [actualizadoBoleta, actualizadoDigitacion, actualizadoGeo, actualizadoNodo, estadoSeleccionados, filtro, ingresoMaterial, rows, sucursal, tecnicoNombre, tipoCruce])

  const verificaBackCounts = useMemo(() => ({
    pendientes: filteredRows.filter((row) => !isVerificaBackOk(row)).length,
    verificados: filteredRows.filter((row) => isVerificaBackOk(row)).length,
  }), [filteredRows])

  const rowsForDisplay = useMemo(
    () => backOffice
      ? filteredRows.filter((row) => verificaBackFilter === 'verificados' ? isVerificaBackOk(row) : !isVerificaBackOk(row))
      : filteredRows,
    [backOffice, filteredRows, verificaBackFilter]
  )

  useEffect(() => {
    setPage(1)
  }, [actualizadoBoleta, actualizadoDigitacion, actualizadoGeo, actualizadoNodo, fecha, filtro, estadoSeleccionados, ingresoMaterial, sucursal, tecnicoNombre, tipoCruce, verificaBackFilter])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!estadoMenuRef.current) return
      if (!estadoMenuRef.current.contains(event.target as Node)) {
        setEstadoMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEstadoMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(rowsForDisplay.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageRows = rowsForDisplay.slice(pageStart, pageStart + pageSize)

  useEffect(() => {
    if (!pageRows.length) {
      setSelectedRowIndex(0)
      return
    }
    if (selectedRowIndex >= pageRows.length) {
      setSelectedRowIndex(0)
    }
  }, [pageRows, selectedRowIndex])

  const selectedRow = pageRows[selectedRowIndex] ?? pageRows[0] ?? null
  const selectedCard = selectedRow ? toRowCard(selectedRow) : null

  const columns = useMemo(() => buildColumns(rowsForDisplay.length ? rowsForDisplay : rows), [rowsForDisplay, rows])
  const visibleColumns = useMemo(
    () => (backOffice ? columns.filter((column) => !columnAliasGroups.ordenTrabajo.some((alias) => normalizeKey(alias) === normalizeKey(column))) : columns),
    [backOffice, columns]
  )

  const cruceMetrics = useMemo(
    () => {
      const counts = { agenda: 0, ambos: 0, makiro: 0 }
      for (const row of rowsForDisplay) {
        const tipo = readValue(row, [...columnAliasGroups.tipoCruce]).trim().toUpperCase()
        if (tipo === 'AGENDA') counts.agenda += 1
        else if (tipo === 'AMBOS') counts.ambos += 1
        else if (tipo === 'MAKIRO') counts.makiro += 1
      }

      const metrics: CruceMetric[] = [
        { label: 'AGENDA', value: counts.agenda, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
        { label: 'AMBOS', value: counts.ambos, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
        { label: 'MAKIRO', value: counts.makiro, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
        { label: 'TOTAL', value: rowsForDisplay.length, tone: 'bg-slate-50 text-slate-800 border-slate-200' },
      ]
      return metrics
    },
    [rowsForDisplay]
  )

  const errorMessage = query.error ? getApiErrorMessage(query.error, 'No se pudo cargar el cruce.') : null
  const clearFilters = () => {
    setFiltro('')
    setTipoCruce('')
    setTecnicoNombre('')
    setEstadoSeleccionados([])
    setSucursal('')
    setActualizadoNodo('')
    setActualizadoGeo('')
    setActualizadoBoleta('')
    setActualizadoDigitacion('')
    setIngresoMaterial('')
    setPage(1)
    setEstadoMenuOpen(false)
  }

  const toggleEstadoSelection = (value: string) => {
    setEstadoSeleccionados((current) => {
      if (value === '__all__') return []
      if (current.includes(value)) {
        return current.filter((item) => item !== value)
      }
      return [...current, value]
    })
  }

  const handleVisualizarDocumento = async () => {
    const rutaPdf = selectedCard?.rutaPdf?.trim()
    if (!rutaPdf || rutaPdf === '-') {
      setArchivoError('Este registro no tiene documento asociado.')
      return
    }

    setArchivoError(null)
    setOpeningArchivo(true)
    const viewer = window.open('', '_blank')
    try {
      const blob = await fetchBoletaDigitalArchivo(rutaPdf)
      const url = URL.createObjectURL(blob)
      if (viewer) {
        viewer.location.href = url
      } else {
        window.location.href = url
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      if (viewer) {
        viewer.close()
      }
      setArchivoError(getApiErrorMessage(error, 'No se pudo abrir el documento.'))
    } finally {
      setOpeningArchivo(false)
    }
  }

  const verificaBackReadOnly = verificaBackRow ? isVerificaBackOk(verificaBackRow) : false

  const openVerificaBackModal = (row: CruceAgendaMakiroRow) => {
    setVerificaBackRow(row)
    setVerificaBackObservacion(readValue(row, [...columnAliasGroups.observacionVerificaBack]))
    setVerificaBackError(null)
  }

  const submitVerificaBack = () => {
    if (!verificaBackRow) return
    const idHistorial = getHistorialId(verificaBackRow)
    if (!idHistorial) {
      setVerificaBackError('Este registro no tiene Id de historial para guardar la revision.')
      return
    }
    verificaBackMutation.mutate({ idHistorial, observacion: verificaBackObservacion.trim() })
  }

  const marcarVerificaBackRapido = (row: CruceAgendaMakiroRow) => {
    const idHistorial = getHistorialId(row)
    if (!idHistorial) return
    verificaBackMutation.mutate({ idHistorial, observacion: readValue(row, [...columnAliasGroups.observacionVerificaBack]) })
  }

  const renderBackOfficeActions = (row: CruceAgendaMakiroRow) => (
    (() => {
      const revisionesCompletas = [
        columnAliasGroups.actualizadoNodo,
        columnAliasGroups.actualizadoGeo,
        columnAliasGroups.actualizadoBoleta,
        columnAliasGroups.actualizadoDigitacion,
      ].every((aliases) => isTruthySqlValue(readValue(row, [...aliases])))

      return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        title="Ver detalle"
        aria-label="Ver detalle"
        onClick={(event) => {
          event.stopPropagation()
          openVerificaBackModal(row)
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
      >
        <FontAwesomeIcon icon={faEye} />
      </button>
      <button
        type="button"
        title={revisionesCompletas ? 'Verificado' : 'Debe completar todas las revisiones'}
        aria-label={revisionesCompletas ? 'Verificado' : 'Debe completar todas las revisiones'}
        onClick={(event) => {
          event.stopPropagation()
          marcarVerificaBackRapido(row)
        }}
        disabled={verificaBackMutation.isPending || !revisionesCompletas}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faCheck} />
      </button>
    </div>
      )
    })()
  )

  const renderVerificaBackAction = (row: CruceAgendaMakiroRow) => {
    const idHistorial = getHistorialId(row)
    const checked = isVerificaBackOk(row)
    const usuario = readValue(row, [...columnAliasGroups.usuarioVerificaBack])
    const fechaRevision = formatCellDate(readValue(row, [...columnAliasGroups.fechaVerificaBack]))

    if (!idHistorial) {
      return <span className="text-xs font-semibold text-slate-400">Sin id</span>
    }
    if (checked) {
      return (
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700" title={[usuario, fechaRevision].filter(Boolean).join(' - ')}>
          <FontAwesomeIcon icon={faCheck} />
          Revisado
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          openVerificaBackModal(row)
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
      >
        <FontAwesomeIcon icon={faCheck} />
        Todo OK
      </button>
    )
  }

  const detailRows = useMemo(() => {
    if (!selectedRow) return []
    return Object.entries(selectedRow)
      .filter(([key]) => !isInternalColumn(key))
      .map(([key, value]) => ({ key, value: displayValue(value) }))
      .sort((a, b) => a.key.localeCompare(b.key, 'es'))
  }, [selectedRow])

  const openDetailModal = (index: number) => {
    setSelectedRowIndex(index)
    setActiveDetailTab('resumen')
    setArchivoError(null)
    setDetailModalOpen(true)
  }

  return (
    <div className="-mt-2 space-y-3 px-3 py-3 text-[13px] sm:px-4 sm:py-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3 text-blue-700">
              <FontAwesomeIcon icon={faTableList} className="shrink-0" />
              <h1 className="min-w-0 text-xl font-bold text-slate-900 sm:text-2xl">Cruce Agenda Makiro</h1>
            </div>
            <div className="flex w-full flex-col gap-2 xl:max-w-[850px] xl:flex-row xl:items-stretch">
              <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
                {cruceMetrics.map((item) => (
                  <div key={item.label} className={`min-w-0 rounded-xl border px-3 py-1.5 shadow-sm ${item.tone}`}>
                    <p className="truncate text-[11px] font-semibold uppercase">{item.label}</p>
                    <p className="mt-0.5 truncate text-lg font-extrabold leading-none">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="secondary" className="flex-1 px-3 py-2 text-xs xl:flex-none" onClick={() => query.refetch()} disabled={query.isFetching}>
                  <FontAwesomeIcon icon={faRotateRight} />
                  Actualizar
                </Button>
                <Button type="button" className="flex-1 px-3 py-2 text-xs xl:flex-none" onClick={() => downloadCsv(rowsForDisplay, columns, fecha)} disabled={!rowsForDisplay.length}>
                  <FontAwesomeIcon icon={faDownload} />
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
        {backOffice ? (
          <div className="flex items-center gap-1 border-t border-slate-200 px-3 pt-3 sm:px-4">
            {([
              { key: 'pendientes' as const, label: 'Pendientes', count: verificaBackCounts.pendientes },
              { key: 'verificados' as const, label: 'Verificados', count: verificaBackCounts.verificados },
            ]).map((item) => {
              const active = verificaBackFilter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVerificaBackFilter(item.key)}
                  className={`inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-bold transition ${
                    active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {item.count}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
        <details className="group mt-2 border-t border-slate-200 pt-1">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-200">
            <span className="group-open:hidden">Mostrar filtros y acciones</span>
            <span className="hidden group-open:inline">Ocultar filtros y acciones</span>
            <span className="text-lg leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="pt-1">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs font-semibold text-slate-700">
                Fecha
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                  <FontAwesomeIcon icon={faCalendarDay} className="text-blue-600" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Buscar
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5">
                  <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
                  <input
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                    placeholder="Buscar por OT, cliente, tecnico..."
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Tipo cruce
                <select value={tipoCruce} onChange={(event) => setTipoCruce(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
                  <option value="">Todos</option>
                  {tipoCruceOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Sucursal
                <select value={sucursal} onChange={(event) => setSucursal(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
                  <option value="">Todas</option>
                  {sucursalOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-slate-700">
            tecnico_nombre
            <select value={tecnicoNombre} onChange={(event) => setTecnicoNombre(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {tecnicoNombreOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div ref={estadoMenuRef} className="relative text-xs font-semibold text-slate-700">
            Estado
            <button
              type="button"
              onClick={() => setEstadoMenuOpen((current) => !current)}
              className="mt-1 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-blue-500"
              aria-expanded={estadoMenuOpen}
              aria-haspopup="menu"
            >
              <span className="min-w-0 truncate">{estadoFilterLabel}</span>
              <span className="shrink-0 text-slate-400">▾</span>
            </button>
            {estadoMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-300 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  onClick={() => {
                    toggleEstadoSelection('__all__')
                    setEstadoMenuOpen(true)
                  }}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-slate-400 bg-white text-[10px] leading-none">
                    {!estadoSeleccionados.length ? '✓' : ''}
                  </span>
                  <span>Todos</span>
                </button>
                <div className="my-1 border-t border-slate-200" />
                <div className="max-h-56 overflow-auto">
                  {estadoOptions.map((value) => {
                    const checked = estadoSeleccionados.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        onClick={() => toggleEstadoSelection(value)}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-slate-400 bg-white text-[10px] leading-none">
                          {checked ? '✓' : ''}
                        </span>
                        <span className="min-w-0 truncate">{value}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <label className="text-xs font-semibold text-slate-700">
            REV.NODO
            <select value={actualizadoNodo} onChange={(event) => setActualizadoNodo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {actualizadoNodoOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            REV.GEO
            <select value={actualizadoGeo} onChange={(event) => setActualizadoGeo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {actualizadoGeoOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-slate-700">
            REV.BOLETA
            <select value={actualizadoBoleta} onChange={(event) => setActualizadoBoleta(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {actualizadoBoletaOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            REV.DIGITACION
            <select value={actualizadoDigitacion} onChange={(event) => setActualizadoDigitacion(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {actualizadoDigitacionOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            IngresoMaterial
            <select value={ingresoMaterial} onChange={(event) => setIngresoMaterial(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {ingresoMaterialOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" className="self-end px-3 py-2 text-xs" onClick={clearFilters}>
            Limpiar
          </Button>
          </div>
        </details>
      </section>

      {errorMessage ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3 py-2 sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Listado de Ordenes de Trabajo</h2>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{rowsForDisplay.length} registros</span>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 sm:ml-auto">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-slate-400" />
              Vista resumida
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 pb-4 pt-5 md:hidden">
          {query.isFetching ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando datos...</div>
          ) : pageRows.length ? (
            pageRows.map((row, index) => {
              const card = toRowCard(row)
              const isActive = index === selectedRowIndex
              return (
                <div
                  key={`${currentPage}-${index}-mobile`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetailModal(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openDetailModal(index)
                    }
                  }}
                  className={`block w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive ? 'border-blue-100 bg-blue-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase text-slate-500">OT / Cliente</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-bold text-blue-700">{card.ot}</span>
                        <span className="font-semibold text-slate-700">{card.clienteCodigo}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(card.estado)}`}>
                      {card.estado}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold uppercase text-slate-400">Sucursal</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-700">{card.sucursal}</p>
                    </div>
                    <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold uppercase text-slate-400">Tipo</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-700">{card.tipo}</p>
                    </div>
                    <div className="col-span-2 min-w-0 rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold uppercase text-slate-400">Tecnico</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-700">{card.tecnico}</p>
                    </div>
                  </div>
                  {backOffice ? (
                    <div className="mt-3 flex justify-end">{renderBackOfficeActions(row)}</div>
                  ) : canManageVerificaBack ? (
                    <div className="mt-3 flex justify-end">
                      {renderVerificaBackAction(row)}
                    </div>
                  ) : null}
                </div>
              )
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Sin datos para la fecha seleccionada.</div>
          )}
        </div>

        <div className={`hidden max-h-[44vh] overscroll-contain md:block ${backOffice ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}>
          <table className={`${backOffice ? 'w-full table-fixed' : 'min-w-max'} border-separate border-spacing-0 text-left text-xs`}>
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {visibleColumns.map((column) => {
                  const isClienteColumn = columnAliasGroups.clienteNro.some((alias) => normalizeKey(alias) === normalizeKey(column))
                  const isTecnicoColumn = columnAliasGroups.tecnicoNombre.some((alias) => normalizeKey(alias) === normalizeKey(column))
                  return (
                  <th
                    key={column}
                    className={`border-b border-slate-200 px-1.5 py-2 font-bold ${
                      backOffice
                        ? isClienteColumn
                          ? 'w-[95px]'
                          : isTecnicoColumn
                            ? 'w-[105px]'
                            : columnAliasGroups.estado.some((alias) => normalizeKey(alias) === normalizeKey(column))
                              ? 'w-[72px]'
                              : columnAliasGroups.sucursal.some((alias) => normalizeKey(alias) === normalizeKey(column))
                                ? 'w-[65px]'
                                : columnAliasGroups.actualizadoNodo.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                                    columnAliasGroups.actualizadoGeo.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                                    columnAliasGroups.actualizadoBoleta.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                                    columnAliasGroups.actualizadoDigitacion.some((alias) => normalizeKey(alias) === normalizeKey(column))
                                  ? 'w-[50px]'
                                  : columnAliasGroups.ingresoMaterial.some((alias) => normalizeKey(alias) === normalizeKey(column))
                                    ? 'w-[82px]'
                                    : 'w-[70px]'
                        : isTecnicoColumn
                          ? 'w-[140px] max-w-[140px]'
                          : 'whitespace-nowrap'
                    }`}
                  >
                    {backOffice && isClienteColumn ? <><span className="block">COD CLIENTE</span><span className="block">NRO OT</span></> : displayHeaderLabel(column)}
                  </th>
                  )
                })}
                {backOffice ? (
                  <th className="w-[74px] border-b border-slate-200 px-1 py-2 text-center font-bold">ACCIONES</th>
                ) : canManageVerificaBack ? (
                  <th className="whitespace-nowrap border-b border-slate-200 px-2.5 py-2 font-bold">VERIF. BACK</th>
                ) : null}
                <th className="w-8 border-b border-slate-200 px-2.5 py-2 font-bold" />
              </tr>
            </thead>
            <tbody>
              {query.isFetching ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={visibleColumns.length + (backOffice || canManageVerificaBack ? 2 : 1)}>
                    Cargando datos...
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((row, index) => {
                  const isActive = index === selectedRowIndex
                  return (
                    <tr
                      key={`${currentPage}-${index}`}
                      className={`${isActive ? 'bg-blue-50' : 'odd:bg-white even:bg-slate-50'} cursor-pointer transition hover:bg-blue-50/70`}
                      onClick={() => openDetailModal(index)}
                    >
                      {visibleColumns.map((column) => {
                        const isClienteColumn = columnAliasGroups.clienteNro.some((alias) => normalizeKey(alias) === normalizeKey(column))
                        const isTecnicoColumn = columnAliasGroups.tecnicoNombre.some((alias) => normalizeKey(alias) === normalizeKey(column))
                        const rawValue = renderTableValue(column, row)
                        const isEstadoColumn = columnAliasGroups.estado.some((alias) => normalizeKey(alias) === normalizeKey(column))
                        const isNumericColumn =
                          columnAliasGroups.clienteNro.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                          columnAliasGroups.ordenTrabajo.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                          normalizeKey(column) === 'idventa'
                        const isDateColumn =
                          columnAliasGroups.fechaEjecucion.some((alias) => normalizeKey(alias) === normalizeKey(column)) ||
                          columnAliasGroups.inicioAgendado.some((alias) => normalizeKey(alias) === normalizeKey(column))
                        const cellClassName = isClienteColumn
                            ? 'w-[95px] border-b border-slate-100 px-1.5 py-1.5 font-semibold text-slate-700'
                            : isTecnicoColumn
                            ? 'w-[105px] max-w-[105px] border-b border-slate-100 px-1.5 py-1.5 text-slate-700'
                            : isNumericColumn
                              ? 'whitespace-nowrap border-b border-slate-100 px-2.5 py-2 font-semibold text-blue-700'
                              : isDateColumn
                                ? 'whitespace-nowrap border-b border-slate-100 px-2.5 py-2 text-slate-700'
                                : 'border-b border-slate-100 px-2.5 py-2 text-slate-700'
                        return (
                          <td key={column} className={cellClassName}>
                            {isClienteColumn ? (
                              <span className="block leading-5">
                                <span className="block">{readValue(row, [...columnAliasGroups.clienteNro]) || '-'}</span>
                                <span className="block">{readValue(row, [...columnAliasGroups.ordenTrabajo]) || '-'}</span>
                              </span>
                            ) : isEstadoColumn ? (
                              <span className={`inline-flex max-w-full truncate rounded-full px-1.5 py-1 text-[11px] font-semibold ${statusBadgeClass(rawValue)}`}>{rawValue}</span>
                            ) : isDateColumn ? (
                              rawValue
                            ) : isNumericColumn ? (
                              rawValue
                            ) : (
                              <span
                                className={isTecnicoColumn ? 'line-clamp-2 whitespace-normal break-words' : ''}
                                title={rawValue}
                              >
                                {rawValue}
                              </span>
                            )}
                          </td>
                        )
                      })}
                  {backOffice ? (
                    <td className="border-b border-slate-100 px-2.5 py-2 text-center">{renderBackOfficeActions(row)}</td>
                  ) : canManageVerificaBack ? (
                    <td className="whitespace-nowrap border-b border-slate-100 px-2.5 py-2">
                          {renderVerificaBackAction(row)}
                        </td>
                      ) : null}
                      <td className="border-b border-slate-100 px-2.5 py-2 text-slate-400">
                        <FontAwesomeIcon icon={faChevronRight} />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={visibleColumns.length + (backOffice || canManageVerificaBack ? 2 : 1)}>
                    Sin datos para la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-center sm:text-left">
            Mostrando {pageRows.length ? pageStart + 1 : 0} a {pageStart + pageRows.length} de {rowsForDisplay.length} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={detailModalOpen && Boolean(selectedCard)}
        title="Detalle de la OT"
        onClose={() => setDetailModalOpen(false)}
        maxWidthClass="w-[min(96vw,1200px)]"
        contentClassName="text-slate-700"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
          <p className="ml-auto text-xl font-bold text-blue-700">{selectedCard?.ot ?? '-'}</p>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selectedCard?.estado ?? '')}`}>
            {selectedCard?.estado ?? 'Sin estado'}
          </span>
        </div>

        <div className="border-b border-slate-200 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveDetailTab('resumen')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeDetailTab === 'resumen' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('completo')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeDetailTab === 'completo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Detalle completo
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('archivo')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                activeDetailTab === 'archivo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Archivo / Documento
            </button>
          </div>
        </div>

        {activeDetailTab === 'resumen' ? (
          <div className="space-y-3 pt-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">Cliente</p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Nombre</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.cliente ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Codigo cliente</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.clienteCodigo ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Agenda</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.agenda ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fecha agenda/ejecucion</p>
                    <p className="font-semibold text-slate-800">{formatCellDate(selectedCard?.fecha ?? '-')}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">Informacion OT</p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Tecnico</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.tecnico ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tipo / Tecnologia</p>
                    <p className="font-semibold text-slate-800">
                      {selectedCard?.tipo ?? '-'} / {selectedCard?.tecnologia ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">TOR</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.tor ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">NroTrans</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.idHistorial ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ciudad / Sucursal</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.sucursal ?? '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">Ubicacion</p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Latitud (GPS)</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.latitudGps ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Longitud (GPS)</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.longitudGps ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Latitud (Ingreso)</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.latitudIngreso ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Longitud (Ingreso)</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.longitudIngreso ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nodo</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.nodo ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Referencia</p>
                    <p className="font-semibold text-slate-800">{selectedCard?.referencia ?? '-'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">Observaciones</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedCard?.observaciones ?? '-'}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeDetailTab === 'completo' ? (
          <div className="pt-4">
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Campo</th>
                    <th className="px-3 py-2 text-left font-bold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((item) => (
                    <tr key={item.key} className="odd:bg-white even:bg-slate-50">
                      <td className="whitespace-nowrap border-t border-slate-100 px-3 py-2 font-semibold text-slate-700">{item.key}</td>
                      <td className="border-t border-slate-100 px-3 py-2 text-slate-700">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeDetailTab === 'archivo' ? (
          <div className="pt-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-900">Documento / Archivo</p>
              <p className="mt-2 break-words text-sm text-slate-700">{selectedCard?.rutaPdf && selectedCard.rutaPdf !== '-' ? selectedCard.rutaPdf : 'Sin archivo asociado en este registro.'}</p>
              {selectedCard?.rutaPdf && selectedCard.rutaPdf !== '-' ? (
                <Button type="button" className="mt-3" onClick={handleVisualizarDocumento} disabled={openingArchivo}>
                  <FontAwesomeIcon icon={faFilePdf} />
                  {openingArchivo ? 'Abriendo...' : 'Visualizar documento'}
                </Button>
              ) : null}
              {archivoError ? <p className="mt-3 text-sm font-semibold text-rose-600">{archivoError}</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(verificaBackRow)}
        title={verificaBackReadOnly ? 'Detalle de verificacion' : backOffice ? 'Verificar registro' : 'Confirmar revision'}
        onClose={() => {
          if (verificaBackMutation.isPending) return
          setVerificaBackRow(null)
          setVerificaBackObservacion('')
          setVerificaBackError(null)
        }}
        maxWidthClass="w-[min(92vw,520px)]"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setVerificaBackRow(null)
                setVerificaBackObservacion('')
                setVerificaBackError(null)
              }}
              disabled={verificaBackMutation.isPending}
            >
              {verificaBackReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!verificaBackReadOnly ? (
              <Button type="button" onClick={submitVerificaBack} disabled={verificaBackMutation.isPending}>
                <FontAwesomeIcon icon={faCheck} />
                {verificaBackMutation.isPending ? 'Guardando...' : backOffice ? 'Verificado' : 'Confirmar Todo OK'}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs font-bold uppercase text-slate-500">OT / Cliente</p>
            <p className="mt-1 font-bold text-slate-900">
              {verificaBackRow ? toRowCard(verificaBackRow).ot : '-'} / {verificaBackRow ? toRowCard(verificaBackRow).clienteCodigo : '-'}
            </p>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Observacion
            <textarea
              value={verificaBackObservacion}
              onChange={(event) => {
                setVerificaBackObservacion(event.target.value)
                setVerificaBackError(null)
              }}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600"
              placeholder="Escribe la observacion de la revision"
              disabled={verificaBackMutation.isPending || verificaBackReadOnly}
            />
          </label>
          {verificaBackError ? <p className="text-sm font-semibold text-rose-600">{verificaBackError}</p> : null}
        </div>
      </Modal>

      <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">Ver columnas detectadas ({columns.length})</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {columns.map((column) => (
            <span key={column} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {column}
            </span>
          ))}
        </div>
      </details>
    </div>
  )
}

export default CruceAgendaMakiroPage
