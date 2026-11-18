import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faDownload, faFilter, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import type { Worksheet } from 'exceljs'
import Button from '../components/common/Button'
import ImageLightbox from '../components/common/ImageLightbox'
import Modal from '../components/common/Modal'
import Table, { type Column } from '../components/common/Table'
import {
  fetchHistoricoJornadaDetalle,
  fetchHistoricoJornadas,
  fetchInicioJornadaImagen,
  fetchInicioJornadaImagenAuxiliar,
} from '../api/supervisionApi'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'
import type { SupervisionJornadaHistorico } from '../types/supervision'

const formatLocalDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

const sheetNameForDate = (value: string): string => {
  const clean = value.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
  return clean || 'Sin fecha'
}

const dateKeyFromRow = (row: SupervisionJornadaHistorico): string => {
  if (row.fecha) return row.fecha.slice(0, 10)
  if (row.fechaInicio) return row.fechaInicio.slice(0, 10)
  return 'Sin fecha'
}

const normalizeRole = (role?: string): string => (role ?? '').trim().toLowerCase().replace(/[\s_]+/g, '')

const FILTRO_INPUT_CLASS = 'h-8 w-full rounded-md bg-slate-100 px-2.5 text-xs text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100'

type FiltroInicio = 'todos' | 'iniciaron' | 'rechazados' | 'no-iniciaron'
type ModalJornadaModo = 'inicio' | 'cierre'

const normalizeEstadoJornada = (value?: string): string => (value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
const booleanLike = (value: unknown): boolean => {
  const text = String(value ?? '').trim().toLowerCase()
  return text === 'true' || text === '1' || text === 'si' || text === 'sí'
}

const noInicio = (row: SupervisionJornadaHistorico): boolean => normalizeEstadoJornada(row.estadoJornada) === 'NO_INICIO' || row.sinInicio === true

const esRechazado = (row: SupervisionJornadaHistorico): boolean =>
  normalizeEstadoJornada(row.estadoJornada) === 'RECHAZADO' || row.rechazado === true || booleanLike(row.eEliminado)

const inicioJornada = (row: SupervisionJornadaHistorico): boolean => !noInicio(row)

const noMarcoCierre = (row: SupervisionJornadaHistorico): boolean =>
  !esRechazado(row) &&
  (normalizeEstadoJornada(row.estadoJornada) === 'NO_REALIZO_CIERRE' ||
    normalizeEstadoJornada(row.estadoJornada) === 'SIN_CIERRE' ||
    row.sinCierre === true ||
    booleanLike(row.noMarcoCierre) ||
    !row.fechaCierre)

const estadoLabel = (row: SupervisionJornadaHistorico): string => {
  if (esRechazado(row)) return 'Estado rechazado'
  if (noInicio(row)) return 'Confirmada en cuadrilla pero no inicio'
  if (normalizeEstadoJornada(row.estadoJornada) === 'NO_APROBADO_SUPERVISOR') return 'Estado no aprobado por supervisor'
  if (noMarcoCierre(row)) return 'Estado no marco cierre'
  return 'Estado jornada completa'
}

const estadoClass = (row: SupervisionJornadaHistorico): string => {
  if (esRechazado(row)) return 'bg-fuchsia-700 text-white ring-1 ring-fuchsia-800'
  if (noInicio(row)) return 'bg-red-600 text-white ring-1 ring-red-700'
  if (normalizeEstadoJornada(row.estadoJornada) === 'NO_APROBADO_SUPERVISOR') return 'bg-amber-500 text-white ring-1 ring-amber-600'
  if (noMarcoCierre(row)) return 'bg-yellow-400 text-slate-950 ring-1 ring-yellow-500'
  return 'bg-green-600 text-white ring-1 ring-green-700'
}

const jornadaRowClass = (row: SupervisionJornadaHistorico): string =>
  esRechazado(row) ? 'bg-fuchsia-50/90' : noInicio(row) ? 'bg-red-100/90' : ''

const resolveInicioImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  return `data:image/jpeg;base64,${raw}`
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

const JornadaImageCard = ({
  label,
  value,
  alt,
  className = 'h-32 w-24 object-cover',
  onZoom,
}: {
  label: string
  value?: string
  alt: string
  className?: string
  onZoom: (src: string) => void
}) => {
  const src = resolveInicioImageSrc(value)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
      <p className="text-[10px] font-medium uppercase text-slate-500">{label}</p>
      {src ? (
        <button
          type="button"
          className="mt-1.5 block rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          onClick={() => onZoom(src)}
        >
          <img src={src} alt={alt} className={`rounded-xl border border-slate-300 ${className}`} />
        </button>
      ) : (
        <p className="mt-0.5 font-semibold text-slate-900">-</p>
      )}
    </div>
  )
}

const getExcelImagePayload = (value?: string): { base64: string; extension: 'jpeg' | 'png' } | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return null
  const src = raw.startsWith('data:image') ? raw : `data:image/jpeg;base64,${raw}`
  return {
    base64: src,
    extension: src.includes('image/png') ? 'png' : 'jpeg',
  }
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
const isEmptyAuxiliarValue = (value?: string | boolean | null): boolean => {
  const normalized = String(value ?? '').trim()
  return normalized === '' || normalized === '0'
}
const formatOptionalSiNo = (value?: string | boolean): string => {
  if (typeof value === 'boolean') return value ? 'SI' : 'NO'
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const normalized = raw.toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí') return 'SI'
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return 'NO'
  return raw
}
const requiereFotoAuxiliar = (row: SupervisionJornadaHistorico): boolean =>
  row.requiereFotoAuxiliar === true && !isEmptyAuxiliarValue(row.idAuxiliarCuadrilla)
const resolveAuxiliarDisplay = (row: SupervisionJornadaHistorico): string => {
  const values = [row.auxiliarNombre, row.idAuxiliar, row.auxiliarCuadrilla, row.idAuxiliarCuadrilla]
  return values.find((value) => !isEmptyAuxiliarValue(value)) ?? ''
}

const inicioChecklistKeys: Array<keyof SupervisionJornadaHistorico> = [
  'capacitado',
  'charla',
  'botiquin',
  'extintor',
  'equipoEpp',
  'estadoEpp',
  'apr',
  'escalera',
  'anclaje',
]

const inicioChecklistLabels: Partial<Record<keyof SupervisionJornadaHistorico, string>> = {
  capacitado: 'Capacitado en NO',
  charla: 'Charla en NO',
  botiquin: 'Botiquin en NO',
  extintor: 'Extintor en NO',
  equipoEpp: 'Equipo EPP en NO',
  estadoEpp: 'Estado EPP en NO',
  apr: 'APR en NO',
  escalera: 'Escalera en NO',
  anclaje: 'Anclaje en NO',
}

const parseDateOnly = (value?: string): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const extintorVencido = (row: SupervisionJornadaHistorico): boolean => {
  const vencimiento = parseDateOnly(row.fechaVencimiento)
  const registro = parseDateOnly(row.fecha || row.fechaInicio)
  if (!vencimiento || !registro) return false
  return vencimiento.getTime() < registro.getTime()
}

const hasInicioImage = (row: SupervisionJornadaHistorico): boolean =>
  row.tieneImagenInicio === true || Boolean(resolveInicioImageSrc(row.imagen))

const hasAuxiliarImage = (row: SupervisionJornadaHistorico): boolean =>
  row.tieneImagenAuxiliar === true || Boolean(resolveInicioImageSrc(row.imagenAuxiliar))

const getInicioObservaciones = (row: SupervisionJornadaHistorico): string[] => {
  const observaciones = inicioChecklistKeys
    .filter((key) => isNoValue(row[key] as string | undefined))
    .map((key) => inicioChecklistLabels[key] ?? String(key))
  if (!parseGeoCoords(row.ubicacionGeoref)) observaciones.push('Ubicacion georef faltante')
  if (row.tieneImagenInicio === false || (row.tieneImagenInicio === undefined && row.imagen && !hasInicioImage(row))) {
    observaciones.push('Foto inicio faltante')
  }
  if (requiereFotoAuxiliar(row) && !hasAuxiliarImage(row)) {
    observaciones.push('Foto auxiliar faltante')
  }
  if (extintorVencido(row)) {
    observaciones.push('Extintor vencido')
  }
  return observaciones
}

const cierreChecklistKeys: Array<keyof SupervisionJornadaHistorico> = ['danoMaterial', 'danoPersona', 'novedadesTrabajo']

const countCierreObservaciones = (row: SupervisionJornadaHistorico): number =>
  cierreChecklistKeys.filter((key) => isSiValue(row[key] as string | undefined)).length

const tieneCierreJornada = (row: SupervisionJornadaHistorico): boolean =>
  Boolean(row.fechaCierre) ||
  Boolean(row.codigoClienteCierre) ||
  Boolean(row.danoMaterial) ||
  Boolean(row.danoPersona) ||
  Boolean(row.novedadesTrabajo) ||
  Boolean(row.ubicacionCierreGeoref)

const DetailCard = ({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) => {
  const displayValue = value?.trim() || '-'
  const showAsStatus = isSiValue(displayValue) || isNoValue(displayValue)
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[10px] font-medium uppercase text-slate-500">{label}</p>
      {showAsStatus ? (
        <p className={`mt-1 flex items-center gap-2 font-semibold ${isSiValue(displayValue) ? 'text-emerald-700' : 'text-red-700'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isSiValue(displayValue) ? 'bg-emerald-700' : 'bg-red-700'} text-white`}>
            <FontAwesomeIcon icon={faCheckCircle} className="text-[11px]" />
          </span>
          {displayValue}
        </p>
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap font-semibold leading-tight text-slate-900">{displayValue}</p>
      )}
    </div>
  )
}

const GeoCard = ({ label, value }: { label: string; value?: string }) => {
  const coords = parseGeoCoords(value)
  const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 sm:col-span-2">
      <p className="text-[10px] font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 break-words font-semibold leading-tight text-slate-900">{value?.trim() || '-'}</p>
      {mapsUrl ? (
        <Button type="button" variant="secondary" className="mt-1.5" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
          Abrir en Google Maps
        </Button>
      ) : null}
    </div>
  )
}

const HistoricoJornadasPage = () => {
  const { roleName } = useAuth()
  const isSupervisor = normalizeRole(roleName) === 'supervisor'
  const [usarRangoFechas, setUsarRangoFechas] = useState(false)
  const [fecha, setFecha] = useState(() => formatLocalDateInput(new Date()))
  const [fechaDesde, setFechaDesde] = useState(() => formatLocalDateInput(new Date()))
  const [fechaHasta, setFechaHasta] = useState(() => formatLocalDateInput(new Date()))
  const [sucursal, setSucursal] = useState('')
  const [idTecnico, setIdTecnico] = useState('')
  const [filtroInicio, setFiltroInicio] = useState<FiltroInicio>('todos')
  const [detalleJornada, setDetalleJornada] = useState<{ row: SupervisionJornadaHistorico; modo: ModalJornadaModo } | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null)

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-historico-jornadas'],
    queryFn: fetchSucursales,
    enabled: !isSupervisor,
    staleTime: 300_000,
  })

  const fechaDesdeConsulta = usarRangoFechas ? fechaDesde : fecha
  const fechaHastaConsulta = usarRangoFechas ? fechaHasta : fecha

  const jornadasQuery = useQuery({
    queryKey: ['historico-jornadas', isSupervisor ? 'supervisor' : 'backoffice', fechaDesdeConsulta, fechaHastaConsulta, sucursal],
    queryFn: () =>
      fetchHistoricoJornadas({
        scope: isSupervisor ? 'supervisor' : 'backoffice',
        fechaDesde: fechaDesdeConsulta,
        fechaHasta: fechaHastaConsulta,
        sucursal: isSupervisor ? undefined : sucursal,
      }),
    enabled: Boolean(fechaDesdeConsulta && fechaHastaConsulta),
  })

  const rows = jornadasQuery.data ?? []
  const tecnicoOptions = useMemo(() => {
    const map = new Map<string, { nombre: string; usuarioRetirado: boolean }>()
    for (const row of rows) {
      const id = row.idTecnico.trim()
      if (!id) continue
      const current = map.get(id)
      const nombre = row.tecnicoNombre || `Tecnico ${id}`
      map.set(id, {
        nombre: current?.nombre || nombre,
        usuarioRetirado: Boolean(current?.usuarioRetirado || row.usuarioRetirado),
      })
    }
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }, [rows])

  const filteredRows = useMemo(() => {
    const tecnico = idTecnico.trim()
    return rows
      .filter((row) => {
        if (tecnico && row.idTecnico !== tecnico) return false
        if (filtroInicio === 'iniciaron') return inicioJornada(row)
        if (filtroInicio === 'rechazados') return esRechazado(row)
        if (filtroInicio === 'no-iniciaron') return noInicio(row)
        return true
      })
      .sort((a, b) => {
        const inicioCompare = Number(inicioJornada(b)) - Number(inicioJornada(a))
        if (inicioCompare !== 0) return inicioCompare
        return (a.tecnicoNombre || '').localeCompare(b.tecnicoNombre || '', 'es', { sensitivity: 'base' })
      })
  }, [rows, idTecnico, filtroInicio])

  const abrirDetalleJornada = async (row: SupervisionJornadaHistorico, modo: ModalJornadaModo) => {
    setDetalleJornada({ row, modo })
    if (!row.idInicio) return
    setDetalleLoading(true)
    try {
      const detalle = await fetchHistoricoJornadaDetalle(row.idInicio, isSupervisor ? 'supervisor' : 'backoffice')
      let imagenInicio = detalle.imagen
      if (!resolveInicioImageSrc(imagenInicio)) {
        try {
          const blob = await fetchInicioJornadaImagen(row.idInicio, isSupervisor ? 'supervisor' : 'backoffice', false)
          imagenInicio = await blobToDataUrl(blob)
        } catch {
          imagenInicio = detalle.imagen
        }
      }
      let imagenAuxiliar = detalle.imagenAuxiliar || row.imagenAuxiliar
      if (!resolveInicioImageSrc(imagenAuxiliar)) {
        try {
          const blob = await fetchInicioJornadaImagenAuxiliar(row.idInicio, isSupervisor ? 'supervisor' : 'backoffice', false)
          imagenAuxiliar = await blobToDataUrl(blob)
        } catch {
          imagenAuxiliar = detalle.imagenAuxiliar || row.imagenAuxiliar
        }
      }
      setDetalleJornada({
        row: {
          ...row,
          ...detalle,
          idTecnico: row.idTecnico,
          idUsuarioInicio: row.idUsuarioInicio || detalle.idUsuarioInicio || detalle.idTecnico,
          tecnicoNombre: detalle.tecnicoNombre || row.tecnicoNombre,
          auxiliarNombre: detalle.auxiliarNombre || row.auxiliarNombre || detalle.auxiliarCuadrilla || row.auxiliarCuadrilla,
          imagen: imagenInicio || detalle.imagen || row.imagen,
          imagenAuxiliar,
          tieneImagenInicio: detalle.tieneImagenInicio ?? row.tieneImagenInicio,
          tieneImagenAuxiliar: detalle.tieneImagenAuxiliar ?? row.tieneImagenAuxiliar,
          idAuxiliarCuadrilla: detalle.idAuxiliarCuadrilla || row.idAuxiliarCuadrilla,
          auxiliarCuadrilla: detalle.auxiliarCuadrilla || row.auxiliarCuadrilla,
          requiereFotoAuxiliar: detalle.requiereFotoAuxiliar || row.requiereFotoAuxiliar,
        },
        modo,
      })
    } catch {
      setDetalleJornada({ row, modo })
    } finally {
      setDetalleLoading(false)
    }
  }

  const exportarExcel = async () => {
    setExportandoExcel(true)
    const detalleRows: SupervisionJornadaHistorico[] = []
    try {
      for (const row of filteredRows) {
        if (!row.idInicio) {
          detalleRows.push(row)
          continue
        }
        try {
          const detalle = await fetchHistoricoJornadaDetalle(row.idInicio, isSupervisor ? 'supervisor' : 'backoffice')
          let imagenInicio = detalle.imagen || row.imagen
          if (!resolveInicioImageSrc(imagenInicio)) {
            try {
              const blob = await fetchInicioJornadaImagen(row.idInicio, isSupervisor ? 'supervisor' : 'backoffice', false)
              imagenInicio = await blobToDataUrl(blob)
            } catch {
              imagenInicio = detalle.imagen || row.imagen
            }
          }
          detalleRows.push({
            ...row,
            ...detalle,
            idTecnico: row.idTecnico,
            idUsuarioInicio: row.idUsuarioInicio || detalle.idUsuarioInicio || detalle.idTecnico,
            tecnicoNombre: detalle.tecnicoNombre || row.tecnicoNombre,
            auxiliarNombre: detalle.auxiliarNombre || row.auxiliarNombre || detalle.auxiliarCuadrilla || row.auxiliarCuadrilla,
            imagen: imagenInicio || detalle.imagen || row.imagen,
            imagenAuxiliar: detalle.imagenAuxiliar || row.imagenAuxiliar,
            tieneImagenInicio: detalle.tieneImagenInicio ?? row.tieneImagenInicio,
            tieneImagenAuxiliar: detalle.tieneImagenAuxiliar ?? row.tieneImagenAuxiliar,
            idAuxiliarCuadrilla: detalle.idAuxiliarCuadrilla || row.idAuxiliarCuadrilla,
            auxiliarCuadrilla: detalle.auxiliarCuadrilla || row.auxiliarCuadrilla,
            requiereFotoAuxiliar: detalle.requiereFotoAuxiliar || row.requiereFotoAuxiliar,
          })
        } catch {
          detalleRows.push(row)
        }
      }
    } finally {
      setExportandoExcel(false)
    }

    const grouped = new Map<string, SupervisionJornadaHistorico[]>()
    for (const row of detalleRows) {
      const key = dateKeyFromRow(row)
      grouped.set(key, [...(grouped.get(key) ?? []), row])
    }

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'TigoStar'
    workbook.created = new Date()

    const border = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
    const labelFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } }
    const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F766E' } }
    const titleFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE2E8F0' } }
    const sectionFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } }

    const setBox = (sheet: Worksheet, address: string, value: string, fill = labelFill) => {
      const cell = sheet.getCell(address)
      cell.value = value || '-'
      cell.fill = fill
      cell.border = { top: border, left: border, bottom: border, right: border }
      cell.alignment = { vertical: 'top', wrapText: true }
    }

    const setLabel = (sheet: Worksheet, address: string, value: string) => {
      const cell = sheet.getCell(address)
      cell.value = value
      cell.font = { bold: true, color: { argb: 'FF334155' } }
      cell.fill = labelFill
      cell.border = { top: border, left: border, bottom: border, right: border }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }

    const addStatusCell = (sheet: Worksheet, address: string, row: SupervisionJornadaHistorico) => {
      const cell = sheet.getCell(address)
      cell.value = estadoLabel(row)
      cell.font = { bold: true, color: { argb: noInicio(row) || esRechazado(row) ? 'FFFFFFFF' : noMarcoCierre(row) ? 'FF111827' : 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: esRechazado(row) ? 'FFA21CAF' : noInicio(row) ? 'FFDC2626' : noMarcoCierre(row) ? 'FFFACC15' : 'FF16A34A' },
      }
      cell.border = { top: border, left: border, bottom: border, right: border }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }

    const addImage = (sheet: Worksheet, row: SupervisionJornadaHistorico, startRow: number) => {
      const image = getExcelImagePayload(row.imagen)
      if (!image) {
        setBox(sheet, `D${startRow}`, 'Sin imagen')
        return
      }
      const imageId = workbook.addImage(image)
      sheet.mergeCells(`D${startRow}:E${startRow + 8}`)
      sheet.addImage(imageId, {
        tl: { col: 3.05, row: startRow - 0.9 },
        ext: { width: 145, height: 190 },
      })
      for (let r = startRow; r <= startRow + 8; r += 1) {
        sheet.getRow(r).height = 22
      }
    }

    for (const day of Array.from(grouped.keys()).sort()) {
      const sheet = workbook.addWorksheet(sheetNameForDate(day), {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      sheet.views = [{ state: 'frozen', ySplit: 3 }]
      sheet.columns = [
        { width: 18 },
        { width: 24 },
        { width: 26 },
        { width: 18 },
        { width: 20 },
        { width: 24 },
        { width: 24 },
        { width: 28 },
      ]
      sheet.mergeCells('A1:H1')
      sheet.getCell('A1').value = `Historico de jornadas - ${day}`
      sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F172A' } }
      sheet.getCell('A1').fill = titleFill
      sheet.getRow(1).height = 28

      let cursor = 3
      for (const row of grouped.get(day) ?? []) {
        sheet.mergeCells(`A${cursor}:I${cursor}`)
        sheet.getCell(`A${cursor}`).value = `Resumen - ${row.tecnicoNombre || '-'}`
        sheet.getCell(`A${cursor}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        sheet.getCell(`A${cursor}`).fill = headerFill

        const summaryHeaders = ['Sucursal', 'Grupo', 'Tecnico', 'ID tecnico', 'ID usuario inicio', 'Sup Aprueba', 'Fecha Aprobacion', 'Fecha inicio', 'Estado']
        summaryHeaders.forEach((header, index) => setLabel(sheet, `${String.fromCharCode(65 + index)}${cursor + 1}`, header))
        ;[
          row.sucursal || '-',
          row.grupo || '-',
          row.tecnicoNombre || '-',
          row.idTecnico || '-',
          row.idUsuarioInicio || '-',
          row.supervisorAproboInicio || '-',
          row.fechaAprobacionInicio ? formatDateTime(row.fechaAprobacionInicio) : '-',
          formatDateTime(row.fechaInicio),
        ].forEach((value, index) => setBox(sheet, `${String.fromCharCode(65 + index)}${cursor + 2}`, value))
        addStatusCell(sheet, `I${cursor + 2}`, row)
        sheet.getRow(cursor + 2).height = 45

        cursor += 5
        sheet.mergeCells(`A${cursor}:B${cursor}`)
        sheet.getCell(`A${cursor}`).value = 'Formulario inicio jornada'
        sheet.getCell(`A${cursor}`).font = { bold: true, color: { argb: 'FF0F172A' } }
        sheet.getCell(`A${cursor}`).fill = sectionFill
        sheet.mergeCells(`D${cursor}:E${cursor}`)
        sheet.getCell(`D${cursor}`).value = 'Imagen inicio'
        sheet.getCell(`D${cursor}`).font = { bold: true, color: { argb: 'FF0F172A' } }
        sheet.getCell(`D${cursor}`).fill = sectionFill

        const inicioFields = [
          ['Tecnico', row.tecnicoNombre || row.idTecnico || '-'],
          ['ID usuario inicio', row.idUsuarioInicio || '-'],
          ['Auxiliar', resolveAuxiliarDisplay(row) || '-'],
          ['Usuario retirado', row.usuarioRetirado ? 'SI' : 'NO'],
          ['Capacitado', row.capacitado || '-'],
          ['Charla', row.charla || '-'],
          ['Botiquin', row.botiquin || '-'],
          ['Extintor', row.extintor || '-'],
          ['Fecha vencimiento', row.fechaVencimiento || '-'],
          ['ESTOY TRABAJANDO SOLO', formatOptionalSiNo(row.estoyTrabajandoSolo)],
          ['Equipo EPP', row.equipoEpp || '-'],
          ['Estado EPP', row.estadoEpp || '-'],
          ['APR', row.apr || '-'],
          ['Escalera', row.escalera || '-'],
          ['Anclaje', row.anclaje || '-'],
          ['Ubicacion georef', row.ubicacionGeoref || '-'],
        ]
        inicioFields.forEach(([label, value], index) => {
          const r = cursor + 1 + index
          setBox(sheet, `A${r}`, label, sectionFill)
          setBox(sheet, `B${r}:C${r}`.split(':')[0], value)
          sheet.mergeCells(`B${r}:C${r}`)
        })
        addImage(sheet, row, cursor + 1)

        cursor += Math.max(inicioFields.length + 3, 14)
        sheet.mergeCells(`A${cursor}:B${cursor}`)
        sheet.getCell(`A${cursor}`).value = 'Formulario cierre'
        sheet.getCell(`A${cursor}`).font = { bold: true, color: { argb: 'FF0F172A' } }
        sheet.getCell(`A${cursor}`).fill = sectionFill

        const cierreFields = [
          ['Fecha cierre', formatDateTime(row.fechaCierre)],
          ['Codigo cliente', row.codigoClienteCierre || '-'],
          ['Dano material', row.danoMaterial || '-'],
          ['Observacion material', row.observacionMaterial || '-'],
          ['Dano persona', row.danoPersona || '-'],
          ['Observacion persona', row.observacionPersona || '-'],
          ['Novedades trabajo', row.novedadesTrabajo || '-'],
          ['Observacion novedades', row.observacionNovedades || '-'],
          ['Ubicacion cierre', row.ubicacionCierreGeoref || '-'],
        ]
        cierreFields.forEach(([label, value], index) => {
          const r = cursor + 1 + index
          setBox(sheet, `A${r}`, label, sectionFill)
          sheet.mergeCells(`B${r}:E${r}`)
          setBox(sheet, `B${r}`, value)
        })

        cursor += cierreFields.length + 3
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historico-jornadas-${fechaDesdeConsulta}-a-${fechaHastaConsulta}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const columns = useMemo<Column<SupervisionJornadaHistorico>[]>(
    () => [
      { key: 'sucursal', header: 'Sucursal', className: 'w-[9%] text-[11px] leading-tight', render: (row) => row.sucursal || '-' },
      { key: 'grupo', header: 'Grupo', className: 'w-[18%] break-all text-[11px] leading-tight', render: (row) => row.grupo || '-' },
      {
        key: 'tecnicoNombre',
        header: 'Tecnico',
        className: 'w-[22%] text-[11px] leading-tight',
        render: (row) => (
          <div>
            <p className="break-words font-semibold text-slate-900">{row.tecnicoNombre}</p>
            <p className="text-[10px] text-slate-500">ID {row.idTecnico}</p>
            {row.idUsuarioInicio && row.idUsuarioInicio !== row.idTecnico ? (
              <p className="break-words text-[10px] font-semibold text-red-600">Usuario inicio {row.idUsuarioInicio}</p>
            ) : null}
          </div>
        ),
      },
      { key: 'supervisorAproboInicio', header: 'Sup Aprueba', className: 'w-[18%] text-[11px] leading-tight', render: (row) => row.supervisorAproboInicio || '-' },
      {
        key: 'fechaAprobacionInicio',
        header: 'Fecha Aprobacion',
        className: 'w-[13%] text-[11px] leading-tight',
        render: (row) => (row.fechaAprobacionInicio ? formatDateTime(row.fechaAprobacionInicio) : '-'),
      },
      { key: 'fechaInicio', header: 'Inicio', className: 'w-[13%] text-[11px] leading-tight', render: (row) => formatDateTime(row.fechaInicio) },
      {
        key: 'fechaCierre',
        header: 'Estado',
        className: 'w-[10%] text-[11px] leading-tight',
        render: (row) => (
          <span className={`inline-flex max-w-full rounded-full px-2 py-1 text-[10px] font-bold leading-tight ${estadoClass(row)}`}>{estadoLabel(row)}</span>
        ),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'w-[10%] text-[11px] leading-tight',
        render: (row) => {
          const inicioObservacionesDetalle = noInicio(row) ? [] : getInicioObservaciones(row)
          const inicioObservaciones = inicioObservacionesDetalle.length
          const cierreObservaciones = tieneCierreJornada(row) ? countCierreObservaciones(row) : 0
          return (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="relative overflow-visible px-2 py-1 text-[10px]"
                disabled={noInicio(row)}
                title={inicioObservaciones > 0 ? inicioObservacionesDetalle.join(', ') : undefined}
                onClick={() => abrirDetalleJornada(row, 'inicio')}
              >
                Inicio
                {inicioObservaciones > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    {inicioObservaciones}
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="relative overflow-visible px-2 py-1 text-[10px]"
                disabled={!tieneCierreJornada(row)}
                title={cierreObservaciones > 0 ? `${cierreObservaciones} campo(s) de cierre en SI` : undefined}
                onClick={() => abrirDetalleJornada(row, 'cierre')}
              >
                Cierre
                {cierreObservaciones > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    {cierreObservaciones}
                  </span>
                ) : null}
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  const detalle = detalleJornada?.row
  const detalleModo = detalleJornada?.modo ?? 'inicio'

  return (
    <div className="bento-page supervision-page sup-v2-fs gap-2 text-[13px] sm:gap-2.5">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <h3 className="page-title shrink-0">Historico de jornadas</h3>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex gap-1.5">
              <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-blue-100 bg-blue-50/60 px-1.5 py-1 text-center sm:px-2.5">
                <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-slate-500">Total</p>
                <p className="text-base font-extrabold leading-none text-brand-600">{filteredRows.length}</p>
              </div>
              <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-emerald-100 bg-emerald-50/70 px-1.5 py-1 text-center sm:px-2.5">
                <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-emerald-700">Inicio</p>
                <p className="text-base font-extrabold leading-none text-emerald-600">{filteredRows.filter((row) => inicioJornada(row)).length}</p>
              </div>
              <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-amber-100 bg-amber-50/70 px-1.5 py-1 text-center sm:px-2.5">
                <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-amber-700">Rech</p>
                <p className="text-base font-extrabold leading-none text-amber-600">{filteredRows.filter((row) => esRechazado(row)).length}</p>
              </div>
              <div className="min-w-[54px] sm:min-w-[68px] rounded-lg border border-rose-100 bg-rose-50/70 px-1.5 py-1 text-center sm:px-2.5">
                <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-rose-700">No ini</p>
                <p className="text-base font-extrabold leading-none text-rose-600">{filteredRows.filter((row) => noInicio(row)).length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => jornadasQuery.refetch()}
              disabled={jornadasQuery.isFetching}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60"
              title="Actualizar"
            >
              <FontAwesomeIcon icon={faRotateRight} className={jornadasQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />
              <span className="sr-only">Actualizar</span>
            </button>
          </div>
        </div>
        <details className="group border-t border-slate-200 px-2 py-1 sm:px-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
            <span className="group-open:hidden">Mostrar filtros</span>
            <span className="hidden group-open:inline">Ocultar filtros</span>
            <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="min-w-0 pb-1 pt-1.5">
            <div className="grid items-end gap-2 sm:grid-cols-2 md:grid-cols-5">
              {usarRangoFechas ? (
                <>
                  <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                    Fecha desde
                    <input className={FILTRO_INPUT_CLASS} type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value || formatLocalDateInput(new Date()))} />
                  </label>
                  <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                    Fecha hasta
                    <input className={FILTRO_INPUT_CLASS} type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value || formatLocalDateInput(new Date()))} />
                  </label>
                </>
              ) : (
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Fecha
                  <input className={FILTRO_INPUT_CLASS} type="date" value={fecha} onChange={(event) => setFecha(event.target.value || formatLocalDateInput(new Date()))} />
                </label>
              )}
              <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                Rango
                <span className="flex h-8 items-center gap-2 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={usarRangoFechas}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setUsarRangoFechas(checked)
                      if (checked) {
                        setFechaDesde(fecha)
                        setFechaHasta(fecha)
                      }
                    }}
                  />
                  Usar rango
                </span>
              </label>
              {!isSupervisor ? (
                <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                  Sucursal
                  <select
                    className={FILTRO_INPUT_CLASS}
                    value={sucursal}
                    onChange={(event) => {
                      setSucursal(event.target.value)
                      setIdTecnico('')
                    }}
                    disabled={sucursalesQuery.isLoading}
                  >
                    <option value="">Todas las sucursales</option>
                    {(sucursalesQuery.data?.data ?? []).map((item) => (
                      <option key={item.idSucursal} value={item.sucursal}>
                        {item.sucursal}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                Tecnico
                <select className={FILTRO_INPUT_CLASS} value={idTecnico} onChange={(event) => setIdTecnico(event.target.value)}>
                  <option value="">Todos los tecnicos</option>
                  {tecnicoOptions.map((item) => (
                    <option key={item.id} value={item.id} className={item.usuarioRetirado ? 'text-red-700' : undefined}>
                      {item.nombre} ({item.id}){item.usuarioRetirado ? ' - usuario retirado' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-full flex-col gap-0.5 text-[10px] font-medium text-slate-500">
                Inicio jornada
                <select className={FILTRO_INPUT_CLASS} value={filtroInicio} onChange={(event) => setFiltroInicio(event.target.value as FiltroInicio)}>
                  <option value="todos">Todos</option>
                  <option value="iniciaron">Solo iniciaron</option>
                  <option value="rechazados">Solo rechazados</option>
                  <option value="no-iniciaron">Solo no iniciaron</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIdTecnico('')
                  setFiltroInicio('todos')
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-self-start justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-brand-600"
                title="Limpiar filtros"
              >
                <FontAwesomeIcon icon={faFilter} aria-hidden="true" />
                <span className="sr-only">Limpiar filtros</span>
              </button>
            </div>
          </div>
        </details>
      </section>

      {jornadasQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(jornadasQuery.error, 'No se pudo cargar el historico de jornadas.')}
        </div>
      ) : null}

      <div className="glass-panel p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5">
          <div>
            <h3 className="page-title">Detalle de jornadas</h3>
            <p className="text-xs text-slate-600">{usarRangoFechas ? `Rango seleccionado: ${fechaDesdeConsulta} a ${fechaHastaConsulta}` : `Fecha seleccionada: ${fecha}`}{' · '}{jornadasQuery.isFetching ? 'Cargando...' : `${filteredRows.length} registro(s)`}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={exportarExcel} disabled={filteredRows.length === 0 || exportandoExcel}>
              <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
              {exportandoExcel ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          data={filteredRows}
          emptyLabel={jornadasQuery.isLoading ? 'Cargando jornadas...' : 'NO HAY DATOS PARA LA FECHA'}
          rowClassName={jornadaRowClass}
          desktopMinWidthClass="min-w-0 table-fixed"
          desktopHeightClass="max-h-[calc(100dvh-20rem)]"
          density="compact"
          stickyHeader
          flat
        />
      </div>

      <Modal
        compactText
        open={Boolean(detalle)}
        title={detalleModo === 'cierre' ? 'Formulario de cierre de jornada' : 'Formulario de inicio de jornada'}
        onClose={() => setDetalleJornada(null)}
        maxWidthClass="max-w-3xl"
        actions={
          <Button type="button" variant="secondary" onClick={() => setDetalleJornada(null)}>
            Cerrar
          </Button>
        }
      >
        {detalle ? (
          <div className="space-y-2">
            {detalleLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                Cargando formulario...
              </div>
            ) : null}
            {detalleModo === 'inicio' ? (
              <>
                <JornadaImageCard label="Imagen inicio" value={detalle.imagen} alt="Inicio jornada" onZoom={setZoomImageSrc} />
                <JornadaImageCard
                  label="Firma inicio"
                  value={detalle.firmaInicio}
                  alt="Firma inicio"
                  className="h-24 w-44 bg-white object-contain"
                  onZoom={setZoomImageSrc}
                />
                {requiereFotoAuxiliar(detalle) || resolveAuxiliarDisplay(detalle) || resolveInicioImageSrc(detalle.imagenAuxiliar) ? (
                  <JornadaImageCard label="Imagen auxiliar" value={detalle.imagenAuxiliar} alt="Auxiliar inicio jornada" onZoom={setZoomImageSrc} />
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailCard label="Tecnico" value={detalle.tecnicoNombre || detalle.idTecnico} />
                  <DetailCard label="Auxiliar" value={resolveAuxiliarDisplay(detalle)} />
                  {esRechazado(detalle) ? <DetailCard label="Motivo rechazo" value={detalle.observacionRechazado} wide /> : null}
                  <DetailCard label="Capacitado" value={detalle.capacitado} />
                  <DetailCard label="Charla" value={detalle.charla} />
                  <DetailCard label="Botiquin" value={detalle.botiquin} />
                  <DetailCard label="Extintor" value={detalle.extintor} />
                  <DetailCard label="Fecha vencimiento" value={detalle.fechaVencimiento} />
                  <DetailCard label="ESTOY TRABAJANDO SOLO" value={formatOptionalSiNo(detalle.estoyTrabajandoSolo)} />
                  <DetailCard label="Equipo EPP" value={detalle.equipoEpp} />
                  <DetailCard label="Estado EPP" value={detalle.estadoEpp} />
                  <DetailCard label="APR" value={detalle.apr} />
                  <DetailCard label="Escalera" value={detalle.escalera} />
                  <DetailCard label="Anclaje" value={detalle.anclaje} />
                  <GeoCard label="Ubicacion georef" value={detalle.ubicacionGeoref} />
                </div>
              </>
            ) : tieneCierreJornada(detalle) ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <DetailCard label="Fecha cierre" value={formatDateTime(detalle.fechaCierre)} />
                <DetailCard label="Codigo cliente" value={detalle.codigoClienteCierre} />
                <DetailCard label="Dano material" value={detalle.danoMaterial} />
                <DetailCard label="Dano a persona" value={detalle.danoPersona} />
                <DetailCard label="Novedades de trabajo" value={detalle.novedadesTrabajo} />
                <DetailCard label="Observacion material" value={detalle.observacionMaterial} />
                <DetailCard label="Observacion persona" value={detalle.observacionPersona} />
                <DetailCard label="Observacion novedades" value={detalle.observacionNovedades} />
                <div className="sm:col-span-2">
                  <JornadaImageCard
                    label="Firma cierre"
                    value={detalle.firmaCierre}
                    alt="Firma cierre"
                    className="h-24 w-44 bg-white object-contain"
                    onZoom={setZoomImageSrc}
                  />
                </div>
                <GeoCard label="Ubicacion cierre georef" value={detalle.ubicacionCierreGeoref} />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-slate-500">
                Sin formulario de cierre registrado.
              </div>
            )}
          </div>
        ) : null}
      </Modal>
      <ImageLightbox open={Boolean(zoomImageSrc)} src={zoomImageSrc ?? ''} onClose={() => setZoomImageSrc(null)} />
    </div>
  )
}

export default HistoricoJornadasPage
