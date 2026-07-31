import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDatabase, faFilter, faPlus, faRotate, faTrash, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  crearEstadoCorteTap,
  crearNodoDistrito,
  crearNodoZona,
  eliminarEstadoCorteTap,
  eliminarNodoDistrito,
  eliminarNodoZona,
  fetchEstadoCorteTap,
  fetchNodoDistrito,
  fetchNodoZona,
  type EstadoCorteTapCrearPayload,
  type NodoDistritoCrearPayload,
  type NodoZonaCrearPayload,
  type NodoZonaRow,
} from '../api/nodoZonaApi'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import { getApiErrorMessage } from '../services/httpClient'

type TabKey = 'zona' | 'distrito' | 'estado'
type FormState = Record<string, string>

type FieldConfig = {
  key: string
  label: string
  uppercase?: boolean
  inputType?: 'text' | 'nodo-zona-select' | 'readonly'
}

type TabConfig = {
  key: TabKey
  title: string
  description: string
  createTitle: string
  createSuccess: string
  deleteSuccess: string
  loadingText: string
  confirmText: string
  queryFn: () => Promise<NodoZonaRow[]>
  createFn: (payload: FormState) => Promise<NodoZonaRow>
  deleteFn: (id: number) => Promise<NodoZonaRow>
  fields: FieldConfig[]
}

const emptyFromFields = (fields: FieldConfig[]): FormState => Object.fromEntries(fields.map((field) => [field.key, '']))
const PAGE_SIZE = 25

const tabConfigs: TabConfig[] = [
  {
    key: 'zona',
    title: 'Nodo Zona',
    description: 'Datos de spx_ListadoNodoZona.',
    createTitle: 'Crear nodo zona',
    createSuccess: 'Nodo zona creado correctamente.',
    deleteSuccess: 'Nodo zona eliminado correctamente.',
    loadingText: 'Cargando nodo zona...',
    confirmText: 'Eliminar nodo zona',
    queryFn: fetchNodoZona,
    createFn: (payload) => crearNodoZona(payload as NodoZonaCrearPayload),
    deleteFn: eliminarNodoZona,
    fields: [
      { key: 'nodosAsociados', label: 'Nodo', uppercase: true },
      { key: 'distrito', label: 'Distrito' },
      { key: 'zona', label: 'Zona', uppercase: true },
    ],
  },
  {
    key: 'distrito',
    title: 'Nodo Distrito',
    description: 'Datos de spx_ListadoNodoDistrito.',
    createTitle: 'Crear nodo distrito',
    createSuccess: 'Nodo distrito creado correctamente.',
    deleteSuccess: 'Nodo distrito eliminado correctamente.',
    loadingText: 'Cargando nodo distrito...',
    confirmText: 'Eliminar nodo distrito',
    queryFn: fetchNodoDistrito,
    createFn: (payload) => crearNodoDistrito(payload as NodoDistritoCrearPayload),
    deleteFn: eliminarNodoDistrito,
    fields: [
      { key: 'nodosAsociados', label: 'Nodo zona asociado', uppercase: true, inputType: 'nodo-zona-select' },
      { key: 'distrito', label: 'Distrito' },
      { key: 'zona', label: 'Zona', uppercase: true, inputType: 'readonly' },
      { key: 'distritoNuevo', label: 'Distrito nuevo', uppercase: true },
    ],
  },
  {
    key: 'estado',
    title: 'Estado Corte TAP',
    description: 'Datos de spx_ListadoEstadoCorteTap.',
    createTitle: 'Crear estado corte TAP',
    createSuccess: 'Estado corte TAP creado correctamente.',
    deleteSuccess: 'Estado corte TAP eliminado correctamente.',
    loadingText: 'Cargando estados...',
    confirmText: 'Eliminar estado corte TAP',
    queryFn: fetchEstadoCorteTap,
    createFn: (payload) => crearEstadoCorteTap(payload as EstadoCorteTapCrearPayload),
    deleteFn: eliminarEstadoCorteTap,
    fields: [{ key: 'estado', label: 'Estado', uppercase: true }],
  },
]

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'SI' : 'NO'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const getColumns = (rows: NodoZonaRow[]): string[] => {
  const columns = new Set<string>()
  for (const row of rows) {
    Object.keys(row).forEach((key) => columns.add(key))
  }
  return Array.from(columns)
}

const getRowId = (row: NodoZonaRow): number | null => {
  const value = row.NroTrans ?? row.nroTrans ?? row.id ?? row.Id ?? row.ID
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const readText = (row: NodoZonaRow, keys: string[]): string => {
  for (const key of keys) {
    const text = formatCell(row[key]).trim()
    if (text && text !== '-') return text
  }
  return ''
}

const NodoZonaPage = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('zona')
  const activeConfig = tabConfigs.find((item) => item.key === activeTab) ?? tabConfigs[0]
  const [search, setSearch] = useState('')
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({ zona: 1, distrito: 1, estado: 1 })
  const [showCreate, setShowCreate] = useState(false)
  const [nodoZonaSearch, setNodoZonaSearch] = useState('')
  const [nodoZonaSuggestionsOpen, setNodoZonaSuggestionsOpen] = useState(false)
  const [forms, setForms] = useState<Record<TabKey, FormState>>({
    zona: emptyFromFields(tabConfigs[0].fields),
    distrito: emptyFromFields(tabConfigs[1].fields),
    estado: emptyFromFields(tabConfigs[2].fields),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['backoffice', 'nodo-zona', activeTab],
    queryFn: activeConfig.queryFn,
    staleTime: 120_000,
  })

  const zonasQuery = useQuery({
    queryKey: ['backoffice', 'nodo-zona', 'zonas-disponibles'],
    queryFn: fetchNodoZona,
    enabled: activeTab === 'distrito' && showCreate,
    staleTime: 120_000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: FormState) => activeConfig.createFn(payload),
    onMutate: () => {
      setError(null)
      setMessage(null)
    },
    onSuccess: () => {
      setForms((prev) => ({ ...prev, [activeTab]: emptyFromFields(activeConfig.fields) }))
      setShowCreate(false)
      setMessage(activeConfig.createSuccess)
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'nodo-zona', activeTab] })
    },
    onError: (mutationError) => setError(getApiErrorMessage(mutationError, `No se pudo crear ${activeConfig.title.toLowerCase()}.`)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activeConfig.deleteFn(id),
    onMutate: () => {
      setError(null)
      setMessage(null)
    },
    onSuccess: () => {
      setMessage(activeConfig.deleteSuccess)
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'nodo-zona', activeTab] })
    },
    onError: (mutationError) => setError(getApiErrorMessage(mutationError, `No se pudo eliminar ${activeConfig.title.toLowerCase()}.`)),
  })

  const form = forms[activeTab]
  const rows = query.data ?? []
  const columns = useMemo(() => getColumns(rows), [rows])
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => columns.some((column) => formatCell(row[column]).toLowerCase().includes(term)))
  }, [columns, rows, search])
  const currentPage = pageByTab[activeTab] ?? 1
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, safePage])
  const nodoZonaOptions = useMemo(() => {
    const seen = new Set<string>()
    const values: Array<{ value: string; label: string; nodo: string; zona: string }> = []
    for (const row of zonasQuery.data ?? []) {
      const nodo = readText(row, ['Nodos_Asociados', 'nodosAsociados', 'NODOS_ASOCIADOS'])
      const zona = readText(row, ['Zona', 'zona', 'ZONA'])
      if (!nodo || !zona) continue
      const value = `${nodo}|||${zona}`
      if (seen.has(value)) continue
      seen.add(value)
      values.push({ value, label: `${nodo} - ${zona}`, nodo, zona })
    }
    return values.sort((a, b) => a.label.localeCompare(b.label))
  }, [zonasQuery.data])
  const filteredNodoZonaOptions = useMemo(() => {
    const term = nodoZonaSearch.trim().toLowerCase()
    const base = term ? nodoZonaOptions.filter((option) => option.label.toLowerCase().includes(term)) : nodoZonaOptions
    return base.slice(0, 30)
  }, [nodoZonaOptions, nodoZonaSearch])
  const canSubmit = activeConfig.fields.every((field) => form[field.key]?.trim()) && !createMutation.isPending

  const setActivePage = (nextPage: number) => {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages)
    setPageByTab((prev) => ({ ...prev, [activeTab]: normalizedPage }))
  }

  const updateForm = (field: FieldConfig, value: string) => {
    const nextValue = field.uppercase ? value.toUpperCase() : value
    setForms((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field.key]: nextValue,
      },
    }))
  }

  const selectNodoZonaAsociado = (value: string) => {
    const option = nodoZonaOptions.find((item) => item.value === value)
    setForms((prev) => ({
      ...prev,
      distrito: {
        ...prev.distrito,
        nodosAsociados: option?.nodo ?? '',
        zona: option?.zona ?? '',
      },
    }))
    setNodoZonaSearch(option?.label ?? '')
    setNodoZonaSuggestionsOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Nodo Zona</h2>
          <p className="text-sm text-slate-500">Catalogos de nodos, distritos y estados de corte TAP.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setShowCreate((value) => !value)}>
            <FontAwesomeIcon icon={showCreate ? faXmark : faPlus} />
            <span>{showCreate ? 'Cancelar' : 'Crear'}</span>
          </Button>
          <Button type="button" variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
            <FontAwesomeIcon icon={faRotate} />
            <span>{query.isFetching ? 'Actualizando...' : 'Actualizar'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabConfigs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => {
              setActiveTab(tab.key)
              setSearch('')
              setPageByTab((prev) => ({ ...prev, [tab.key]: 1 }))
              setShowCreate(false)
              setNodoZonaSearch('')
              setNodoZonaSuggestionsOpen(false)
              setError(null)
              setMessage(null)
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      {query.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(query.error, `No se pudo cargar ${activeConfig.title.toLowerCase()}.`)}
        </div>
      ) : null}

      {showCreate ? (
        <FormCard title={activeConfig.createTitle} description="Registrar nuevo dato activo." overflowVisible>
          <form
            className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
              createMutation.mutate(payload)
            }}
          >
            {activeConfig.fields.map((field) => (
              <label key={field.key} className="relative space-y-1 text-sm font-semibold text-slate-700">
                <span>{field.label}</span>
                {field.inputType === 'nodo-zona-select' ? (
                  <div className="relative">
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={nodoZonaSearch}
                      placeholder={zonasQuery.isLoading ? 'Cargando nodos...' : 'Buscar nodo zona...'}
                      disabled={zonasQuery.isLoading}
                      onFocus={() => setNodoZonaSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setNodoZonaSuggestionsOpen(false), 150)}
                      onChange={(event) => {
                        setNodoZonaSearch(event.target.value)
                        setNodoZonaSuggestionsOpen(true)
                        setForms((prev) => ({
                          ...prev,
                          distrito: {
                            ...prev.distrito,
                            nodosAsociados: '',
                            zona: '',
                          },
                        }))
                      }}
                    />
                    {nodoZonaSuggestionsOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[80] max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                        {filteredNodoZonaOptions.length > 0 ? (
                          filteredNodoZonaOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                selectNodoZonaAsociado(option.value)
                              }}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : field.inputType === 'readonly' ? (
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
                    value={form[field.key] ?? ''}
                    readOnly
                  />
                ) : (
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    maxLength={field.key === 'estado' ? 150 : 50}
                    value={form[field.key] ?? ''}
                    onChange={(event) => updateForm(field, event.target.value)}
                  />
                )}
              </label>
            ))}
            <div className="flex items-end">
              <Button type="submit" className="h-10 w-full md:w-auto" disabled={!canSubmit}>
                <FontAwesomeIcon icon={faPlus} />
                <span>{createMutation.isPending ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      <FormCard
        title={activeConfig.title}
        description={`${filteredRows.length} de ${rows.length} registros`}
        actions={
          <div className="relative w-full min-w-[260px] max-w-sm">
            <FontAwesomeIcon icon={faFilter} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Filtrar datos..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setActivePage(1)
              }}
            />
          </div>
        }
      >
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
            <FontAwesomeIcon icon={faDatabase} />
            <span>{activeConfig.loadingText}</span>
          </div>
        ) : null}

        {!query.isLoading && columns.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="w-24 whitespace-nowrap px-3 py-2">Acc.</th>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagedRows.map((row, rowIndex) => (
                  <tr key={`${activeTab}-${getRowId(row) ?? rowIndex}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Eliminar"
                        disabled={deleteMutation.isPending || getRowId(row) === null}
                        onClick={() => {
                          const id = getRowId(row)
                          if (id === null) return
                          if (window.confirm(`${activeConfig.confirmText} ${id}?`)) {
                            deleteMutation.mutate(id)
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                    {columns.map((column) => (
                      <td key={column} className="max-w-[360px] whitespace-nowrap px-3 py-2 text-slate-700">
                        <span className="block overflow-hidden text-ellipsis" title={formatCell(row[column])}>
                          {formatCell(row[column])}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!query.isLoading && filteredRows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>No hay datos para mostrar.</span>
          </div>
        ) : null}

        {!query.isLoading && filteredRows.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              Mostrando {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredRows.length)} de {filteredRows.length}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" className="h-9 px-3" disabled={safePage <= 1} onClick={() => setActivePage(safePage - 1)}>
                Anterior
              </Button>
              <span className="font-semibold text-slate-700">
                {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3"
                disabled={safePage >= totalPages}
                onClick={() => setActivePage(safePage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </FormCard>
    </div>
  )
}

export default NodoZonaPage
