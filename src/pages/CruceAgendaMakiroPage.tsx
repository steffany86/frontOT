import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAngleLeft,
  faAngleRight,
  faCalendarDay,
  faChevronRight,
  faClipboardList,
  faDownload,
  faFilePdf,
  faFilter,
  faMagnifyingGlass,
  faRotateRight,
  faSliders,
  faTableList,
} from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import { fetchBoletaDigitalArchivo } from '../api/boletaDigitalApi'
import { fetchCruceAgendaMakiro, type CruceAgendaMakiroRow } from '../api/cruceAgendaMakiroApi'
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

const preferredColumns = [
  'TipoCruce',
  'cliente_nro',
  'CodigoCliente',
  'OT_int',
  'OrdenTrabajo',
  'inicio_agendado',
  'Fecha_Ejecucion',
  'estado',
  'CIERRE',
  'TECNICO',
  'tecnico_nombre',
  'TOR',
  'Sucursal',
  'Sucursal_2',
  'M_ORIGEN',
  'M_CUMPLIMIENTO',
  'RutaPdf',
]

const buildColumns = (rows: CruceAgendaMakiroRow[]): string[] => {
  const all = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((key) => all.add(key)))
  const preferred = preferredColumns.filter((key) => all.has(key))
  const remaining = Array.from(all).filter((key) => !preferred.includes(key))
  return [...preferred, ...remaining]
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

type RowCard = {
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

const toRowCard = (row: CruceAgendaMakiroRow): RowCard => {
  const tipo = readValue(row, ['TipoCruce', 'tipo']) || readByToken(row, ['tipo']) || '-'
  const ot = readValue(row, ['OT_int', 'OrdenTrabajo', 'OT', 'ot']) || readByToken(row, ['ot']) || '-'
  const agenda =
    readValue(row, ['inicio_agendado', 'Agenda', 'CodigoAgenda']) ||
    readByToken(row, ['agenda']) ||
    readByToken(row, ['agendado']) ||
    '-'
  const fecha =
    readValue(row, ['Fecha_Ejecucion', 'fecha_ejecucion', 'fecha']) ||
    readByToken(row, ['fecha', 'ejec']) ||
    readByToken(row, ['fecha']) ||
    '-'
  const estado =
    readValue(row, ['estado', 'Estado', 'CIERRE']) ||
    readByToken(row, ['estado']) ||
    readByToken(row, ['cierre']) ||
    '-'
  const tecnico =
    readValue(row, ['tecnico_nombre', 'TECNICO', 'Tecnico']) ||
    readByToken(row, ['tecnico']) ||
    readByToken(row, ['usuario']) ||
    '-'
  const cliente = readValue(row, ['cliente', 'Cliente']) || readByToken(row, ['cliente'], ['codigo']) || '-'
  const clienteCodigo =
    readValue(row, ['cliente_nro', 'CodigoCliente']) || readByToken(row, ['cliente', 'codigo']) || '-'
  const tor = readValue(row, ['TOR', 'tor']) || '-'
  const sucursal =
    readValue(row, ['Sucursal', 'Sucursal_2', 'Ciudad']) || readByToken(row, ['sucursal']) || readByToken(row, ['ciudad']) || '-'
  const tecnologia =
    readValue(row, ['TipoTecnologia', 'tipo_tecnologia']) || readByToken(row, ['tecnologia']) || '-'
  const nodo = readByToken(row, ['nodo']) || '-'
  const referencia = readByToken(row, ['referencia']) || '-'
  const latitudGps = readByToken(row, ['latitud', 'gps']) || readByToken(row, ['latitud']) || '-'
  const longitudGps = readByToken(row, ['longitud', 'gps']) || readByToken(row, ['longitud']) || '-'
  const latitudIngreso = readByToken(row, ['latitud', 'ingreso']) || '-'
  const longitudIngreso = readByToken(row, ['longitud', 'ingreso']) || '-'
  const observaciones = readByToken(row, ['observ']) || '-'
  const rutaPdf = readValue(row, ['RutaPdf']) || readByToken(row, ['ruta', 'pdf']) || '-'

  return {
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

const CruceAgendaMakiroPage = () => {
  const [fecha, setFecha] = useState(() => formatLocalDateInput(new Date()))
  const [filtro, setFiltro] = useState('')
  const [tipoCruce, setTipoCruce] = useState('')
  const [tecnicoNombre, setTecnicoNombre] = useState('')
  const [estado, setEstado] = useState('')
  const [sucursal, setSucursal] = useState('')
  const [selectedRowIndex, setSelectedRowIndex] = useState(0)
  const [activeDetailTab, setActiveDetailTab] = useState<'resumen' | 'completo' | 'archivo'>('resumen')
  const [page, setPage] = useState(1)
  const [archivoError, setArchivoError] = useState<string | null>(null)
  const [openingArchivo, setOpeningArchivo] = useState(false)

  const pageSize = 10

  const query = useQuery({
    queryKey: ['cruce-agenda-makiro', fecha],
    queryFn: () => fetchCruceAgendaMakiro(fecha),
    enabled: Boolean(fecha),
  })

  const rows = query.data ?? []
  const tipoCruceOptions = useMemo(() => uniqueOptions(rows, ['TipoCruce']), [rows])
  const tecnicoNombreOptions = useMemo(() => uniqueOptions(rows, ['tecnico_nombre', 'TECNICO', 'Tecnico']), [rows])
  const estadoOptions = useMemo(() => uniqueOptions(rows, ['estado', 'Estado', 'CIERRE']), [rows])
  const sucursalOptions = useMemo(() => uniqueOptions(rows, ['Sucursal', 'Sucursal_2']), [rows])

  const filteredRows = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    return rows.filter((row) => {
      if (!matchesSelectFilter(row, ['TipoCruce'], tipoCruce)) return false
      if (!matchesSelectFilter(row, ['tecnico_nombre', 'TECNICO', 'Tecnico'], tecnicoNombre)) return false
      if (!matchesSelectFilter(row, ['estado', 'Estado', 'CIERRE'], estado)) return false
      if (!matchesSelectFilter(row, ['Sucursal', 'Sucursal_2'], sucursal)) return false
      if (!term) return true
      return Object.values(row).some((value) => displayValue(value).toLowerCase().includes(term))
    })
  }, [estado, filtro, rows, sucursal, tecnicoNombre, tipoCruce])

  useEffect(() => {
    setPage(1)
  }, [fecha, filtro, tipoCruce, tecnicoNombre, estado, sucursal])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize)

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

  const columns = useMemo(() => buildColumns(filteredRows.length ? filteredRows : rows), [filteredRows, rows])

  const summary = useMemo(() => {
    const counts = new Map<string, number>()
    rows.forEach((row) => {
      const key = readValue(row, ['TipoCruce']) || 'SIN TIPO'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries())
  }, [rows])

  const errorMessage = query.error ? getApiErrorMessage(query.error, 'No se pudo cargar el cruce.') : null
  const clearFilters = () => {
    setFiltro('')
    setTipoCruce('')
    setTecnicoNombre('')
    setEstado('')
    setSucursal('')
    setPage(1)
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

  const detailRows = useMemo(() => {
    if (!selectedRow) return []
    return Object.entries(selectedRow)
      .map(([key, value]) => ({ key, value: displayValue(value) }))
      .sort((a, b) => a.key.localeCompare(b.key, 'es'))
  }, [selectedRow])

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-blue-700">
              <FontAwesomeIcon icon={faTableList} />
              <h1 className="text-2xl font-bold text-slate-900">Cruce Agenda Makiro</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">Gestion de OT - SantaCruz</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(220px,1fr)_auto_auto]">
            <label className="text-sm font-semibold text-slate-700">
              Fecha
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <FontAwesomeIcon icon={faCalendarDay} className="text-blue-600" />
                <input
                  type="date"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Buscar
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
                <input
                  value={filtro}
                  onChange={(event) => setFiltro(event.target.value)}
                  placeholder="Buscar por OT, cliente, tecnico..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
              <FontAwesomeIcon icon={faRotateRight} />
              Actualizar
            </Button>
            <Button type="button" onClick={() => downloadCsv(filteredRows, columns, fecha)} disabled={!filteredRows.length}>
              <FontAwesomeIcon icon={faDownload} />
              CSV
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="text-sm font-semibold text-slate-700">
            TipoCruce
            <select value={tipoCruce} onChange={(event) => setTipoCruce(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {tipoCruceOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            tecnico_nombre
            <select value={tecnicoNombre} onChange={(event) => setTecnicoNombre(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {tecnicoNombreOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Estado
            <select value={estado} onChange={(event) => setEstado(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Todos</option>
              {estadoOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Sucursal
            <select value={sucursal} onChange={(event) => setSucursal(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Todas</option>
              {sucursalOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" className="self-end" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FontAwesomeIcon icon={faClipboardList} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Total SP</p>
              <p className="text-3xl font-bold text-slate-900">{rows.length}</p>
              <p className="text-xs text-slate-500">Ordenes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FontAwesomeIcon icon={faSliders} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Filtrados</p>
              <p className="text-3xl font-bold text-slate-900">{filteredRows.length}</p>
              <p className="text-xs text-slate-500">Ordenes</p>
            </div>
          </div>
        </div>
        {summary.slice(0, 2).map(([key, total]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="truncate text-xs font-semibold uppercase text-slate-500">{key}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">Ordenes</p>
          </div>
        ))}
      </section>

      {errorMessage ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">Listado de Ordenes de Trabajo</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{filteredRows.length} registros</span>
            <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-slate-400" />
              Vista resumida
            </div>
          </div>
        </div>
        <div className="max-h-[52vh] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Tipo</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">OT / Nro</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Agenda</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Fecha ejecucion</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Estado</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Tecnico</th>
                <th className="w-8 border-b border-slate-200 px-3 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {query.isFetching ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>
                    Cargando datos...
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((row, index) => {
                  const card = toRowCard(row)
                  const isActive = index === selectedRowIndex
                  return (
                    <tr
                      key={`${currentPage}-${index}`}
                      className={`${isActive ? 'bg-blue-50' : 'odd:bg-white even:bg-slate-50'} cursor-pointer transition hover:bg-blue-50/70`}
                      onClick={() => setSelectedRowIndex(index)}
                    >
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-slate-700">{card.tipo}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 font-semibold text-blue-700">{card.ot}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-slate-700">{card.agenda}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-slate-700">{formatCellDate(card.fecha)}</td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(card.estado)}`}>{card.estado}</span>
                      </td>
                      <td className="max-w-[220px] border-b border-slate-100 px-3 py-3 text-slate-700">
                        <span className="line-clamp-2" title={card.tecnico}>
                          {card.tecnico}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-400">
                        <FontAwesomeIcon icon={faChevronRight} />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>
                    Sin datos para la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Mostrando {pageRows.length ? pageStart + 1 : 0} a {pageStart + pageRows.length} de {filteredRows.length} registros
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-bold text-slate-900">Detalle de la OT</h2>
          <p className="ml-auto text-xl font-bold text-blue-700">{selectedCard?.ot ?? '-'}</p>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selectedCard?.estado ?? '')}`}>
            {selectedCard?.estado ?? 'Sin estado'}
          </span>
        </div>

        <div className="border-b border-slate-200 px-4 py-2 sm:px-5">
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
          <div className="space-y-3 p-4 sm:p-5">
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
          <div className="p-4 sm:p-5">
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
          <div className="p-4 sm:p-5">
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
      </section>

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
