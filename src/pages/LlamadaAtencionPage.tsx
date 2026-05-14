import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Column } from '../components/common/Table'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import SignaturePad from '../components/common/SignaturePad'
import api from '../api/http'
import {
  createLlamadaAtencion,
  fetchLlamadaAtencionTecnicos,
  fetchLlamadaAtencionTiposComunicacion,
  fetchLlamadasAtencion,
} from '../api/llamadaAtencionApi'
import type {
  LlamadaAtencionCreatePayload,
  LlamadaAtencionRegistro,
} from '../types/llamadaAtencion'
import { getApiErrorMessage } from '../services/httpClient'

type LlamadaAtencionForm = {
  idTecnico: string
  codEmpleado: string
  idTipoComunicacion: string
  motivo: string
  descripcion: string
  comentarioColaborador: string
  acuerdos: string
  testigo: string
  fechaSeguimiento: string
  firmaTecnico: string
  firmaTestigo: string
}

type LlamadaAtencionFiltro = {
  idTecnico: string
  fecha: string
  rangoFechas: boolean
  fechaDesde: string
  fechaHasta: string
}

type FirmaStep = 'testigo' | 'tecnico'
type TecnicoModalTarget = 'form' | 'filter'

const createEmptyForm = (): LlamadaAtencionForm => ({
  idTecnico: '',
  codEmpleado: '',
  idTipoComunicacion: '',
  motivo: '',
  descripcion: '',
  comentarioColaborador: '',
  acuerdos: '',
  testigo: '',
  fechaSeguimiento: '',
  firmaTecnico: '',
  firmaTestigo: '',
})

const createDefaultFilter = (): LlamadaAtencionFiltro => ({
  idTecnico: '',
  fecha: '',
  rangoFechas: false,
  fechaDesde: '',
  fechaHasta: '',
})

const toOptionalText = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()

const formatDateTime = (value?: string): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const LlamadaAtencionPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<LlamadaAtencionForm>(createEmptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [filterDraft, setFilterDraft] = useState<LlamadaAtencionFiltro>(createDefaultFilter)
  const [activeFilter, setActiveFilter] = useState<LlamadaAtencionFiltro>(createDefaultFilter)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [firmaStep, setFirmaStep] = useState<FirmaStep>('testigo')
  const [firmaTestigoDraft, setFirmaTestigoDraft] = useState('')
  const [firmaTecnicoDraft, setFirmaTecnicoDraft] = useState('')
  const [firmaModalError, setFirmaModalError] = useState<string | null>(null)
  const [tecnicoModalOpen, setTecnicoModalOpen] = useState(false)
  const [tecnicoSearch, setTecnicoSearch] = useState('')
  const [tecnicoModalTarget, setTecnicoModalTarget] = useState<TecnicoModalTarget>('form')
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [detalleRegistro, setDetalleRegistro] = useState<LlamadaAtencionRegistro | null>(null)
  const [detalleFirmaTecnicoSrc, setDetalleFirmaTecnicoSrc] = useState<string | null>(null)
  const [detalleFirmaTestigoSrc, setDetalleFirmaTestigoSrc] = useState<string | null>(null)

  const tecnicosQuery = useQuery({
    queryKey: ['llamada-atencion', 'tecnicos'],
    queryFn: () => fetchLlamadaAtencionTecnicos({ limit: 1000 }),
    staleTime: 60_000,
  })

  const tiposComunicacionQuery = useQuery({
    queryKey: ['llamada-atencion', 'tipos-comunicacion'],
    queryFn: fetchLlamadaAtencionTiposComunicacion,
    staleTime: 300_000,
  })

  const tecnicosModalQuery = useQuery({
    queryKey: ['llamada-atencion', 'tecnicos-modal', tecnicoSearch],
    queryFn: () =>
      fetchLlamadaAtencionTecnicos({
        q: tecnicoSearch.trim() || undefined,
        limit: 1000,
      }),
    enabled: tecnicoModalOpen,
    staleTime: 30_000,
  })

  const llamadasQuery = useQuery({
    queryKey: ['llamada-atencion', 'listado', activeFilter],
    queryFn: () =>
      fetchLlamadasAtencion({
        idTecnico: activeFilter.idTecnico || undefined,
        fechaDesde: activeFilter.rangoFechas ? activeFilter.fechaDesde || undefined : activeFilter.fecha || undefined,
        fechaHasta: activeFilter.rangoFechas ? activeFilter.fechaHasta || undefined : activeFilter.fecha || undefined,
        limite: 300,
      }),
  })

  const crearMutation = useMutation({
    mutationFn: (payload: LlamadaAtencionCreatePayload) => createLlamadaAtencion(payload),
    onSuccess: (result) => {
      setFormError(null)
      setFormSuccess(`Llamada de atencion registrada. ID: ${result.idLlamadaAtencion}`)
      setRegistroModalOpen(false)
      setForm((previous) => ({
        ...createEmptyForm(),
        idTecnico: previous.idTecnico,
        codEmpleado: previous.codEmpleado,
        idTipoComunicacion: previous.idTipoComunicacion,
      }))
      queryClient.invalidateQueries({ queryKey: ['llamada-atencion', 'listado'] })
    },
    onError: (error) => {
      setFormSuccess(null)
      setFormError(getApiErrorMessage(error, 'No se pudo registrar la llamada de atencion.'))
    },
  })

  const tecnicos = tecnicosQuery.data ?? []
  const tecnicosModal = tecnicosModalQuery.data ?? []
  const tiposComunicacion = tiposComunicacionQuery.data ?? []
  const llamadas = llamadasQuery.data ?? []

  const tecnicoById = useMemo(() => {
    const map = new Map<string, (typeof tecnicos)[number]>()
    for (const item of tecnicos) {
      map.set(normalizeId(item.idTecnico), item)
    }
    for (const item of tecnicosModal) {
      const id = normalizeId(item.idTecnico)
      if (!map.has(id)) {
        map.set(id, item)
      }
    }
    return map
  }, [tecnicos, tecnicosModal])

  const describeTecnico = (registro: LlamadaAtencionRegistro): string => {
    const tecnicoRaw = registro.tecnico?.trim() ?? ''
    const idFromRegistro = normalizeId(registro.idTecnico)
    const idFromTecnicoRaw = normalizeId(tecnicoRaw)
    const byId =
      (idFromRegistro ? tecnicoById.get(idFromRegistro) : undefined) ??
      (idFromTecnicoRaw ? tecnicoById.get(idFromTecnicoRaw) : undefined)

    if (byId?.tecnico) return byId.tecnico
    if (tecnicoRaw) return tecnicoRaw
    return idFromRegistro || idFromTecnicoRaw || '-'
  }

  const columns = useMemo<Column<LlamadaAtencionRegistro>[]>(() => {
    return [
      {
        key: 'fechaRegistro',
        header: 'Fecha',
        render: (row) => formatDateTime(row.fechaRegistro),
      },
      {
        key: 'tecnico',
        header: 'Tecnico',
        render: describeTecnico,
      },
      {
        key: 'codEmpleado',
        header: 'Cod. Empleado',
        render: (row) => row.codEmpleado ?? '-',
      },
      {
        key: 'tipoComunicacion',
        header: 'Tipo',
        render: (row) => row.tipoComunicacion ?? '-',
      },
      {
        key: 'motivo',
        header: 'Motivo',
        render: (row) => row.motivo ?? '-',
      },
      {
        key: 'fechaSeguimiento',
        header: 'Seguimiento',
        render: (row) => (row.fechaSeguimiento ? formatDateTime(row.fechaSeguimiento) : '-'),
      },
      {
        key: 'idLlamadaAtencion',
        header: 'ID',
        render: (row) => row.idLlamadaAtencion,
      },
      {
        key: 'idUsuarioSupervisor',
        header: 'Id Supervisor',
        render: (row) => String(row.idUsuarioSupervisor ?? '-'),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        render: (row) => (
          <Button type="button" variant="secondary" onClick={() => openDetalleModal(row)}>
            Ver detalle
          </Button>
        ),
      },
    ]
  }, [tecnicoById])

  const handleFilterApply = () => {
    setActiveFilter(filterDraft)
  }

  const handleFilterReset = () => {
    const reset = createDefaultFilter()
    setFilterDraft(reset)
    setActiveFilter(reset)
  }

  const openRegistroModal = () => {
    setForm(createEmptyForm())
    setFormError(null)
    setFormSuccess(null)
    setRegistroModalOpen(true)
  }

  const closeRegistroModal = () => {
    setRegistroModalOpen(false)
  }

  const handleFormChange = <K extends keyof LlamadaAtencionForm>(field: K, value: LlamadaAtencionForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const openTecnicoModal = (target: TecnicoModalTarget) => {
    setTecnicoModalTarget(target)
    setTecnicoSearch('')
    setTecnicoModalOpen(true)
  }

  const selectTecnicoFromModal = (idTecnico: string) => {
    const tecnicoId = normalizeId(idTecnico)
    const tecnico = tecnicoById.get(tecnicoId)
    const codEmpleado = tecnico?.codEmpleado?.trim() ?? ''
    if (tecnicoModalTarget === 'filter') {
      setFilterDraft((previous) => ({ ...previous, idTecnico: tecnicoId }))
    } else {
      setForm((previous) => ({ ...previous, idTecnico: tecnicoId, codEmpleado }))
    }
    setTecnicoModalOpen(false)
  }

  const openFirmaModal = () => {
    setFirmaStep('testigo')
    setFirmaModalError(null)
    setFirmaTestigoDraft(form.firmaTestigo)
    setFirmaTecnicoDraft(form.firmaTecnico)
    setFirmaModalOpen(true)
  }

  const closeFirmaModal = () => {
    setFirmaModalOpen(false)
    setFirmaStep('testigo')
    setFirmaModalError(null)
  }

  const handleConfirmFirmaStep = () => {
    if (firmaStep === 'testigo') {
      setFirmaModalError(null)
      setFirmaStep('tecnico')
      return
    }

    if (!firmaTecnicoDraft.trim()) {
      setFirmaModalError('La firma del tecnico es requerida.')
      return
    }

    setForm((previous) => ({
      ...previous,
      firmaTestigo: firmaTestigoDraft,
      firmaTecnico: firmaTecnicoDraft,
    }))
    setFirmaModalError(null)
    closeFirmaModal()
  }

  const handleBackFirmaStep = () => {
    if (firmaStep === 'tecnico') {
      setFirmaModalError(null)
      setFirmaStep('testigo')
    }
  }

  const validateForm = (): string | null => {
    if (!form.idTecnico) return 'Selecciona un tecnico.'
    if (!form.codEmpleado.trim()) return 'El tecnico seleccionado no tiene codigo de empleado.'
    if (!form.fechaSeguimiento.trim()) return 'Fecha de seguimiento es requerida.'
    if (!form.idTipoComunicacion) return 'Selecciona tipo de comunicacion.'
    if (!form.motivo.trim()) return 'Motivo es requerido.'
    if (form.fechaSeguimiento && Number.isNaN(new Date(form.fechaSeguimiento).getTime())) {
      return 'Fecha de seguimiento invalida.'
    }
    if (!form.firmaTecnico.trim()) return 'Firma del tecnico es requerida.'
    return null
  }

  const handleSubmit = () => {
    const validationError = validateForm()
    if (validationError) {
      setFormSuccess(null)
      setFormError(validationError)
      return
    }

    const payload: LlamadaAtencionCreatePayload = {
      idTecnico: form.idTecnico,
      codEmpleado: form.codEmpleado.trim(),
      idTipoComunicacion: form.idTipoComunicacion,
      motivo: form.motivo.trim(),
      descripcion: toOptionalText(form.descripcion),
      comentarioColaborador: toOptionalText(form.comentarioColaborador),
      acuerdos: toOptionalText(form.acuerdos),
      testigo: form.testigo.trim(),
      fechaSeguimiento: toOptionalText(form.fechaSeguimiento),
      firmaTecnico: toOptionalText(form.firmaTecnico),
      firmaTestigo: toOptionalText(form.firmaTestigo),
    }

    setFormError(null)
    setFormSuccess(null)
    crearMutation.mutate(payload)
  }

  const openDetalleModal = (registro: LlamadaAtencionRegistro) => {
    setDetalleRegistro(registro)
    setDetalleModalOpen(true)
  }

  const closeDetalleModal = () => {
    setDetalleModalOpen(false)
    setDetalleRegistro(null)
  }

  const getFirmaSrc = (value?: string): string | null => {
    const firma = value?.trim()
    if (!firma) return null
    if (firma.startsWith('data:image')) return firma
    if (firma.startsWith('http://') || firma.startsWith('https://') || firma.startsWith('/')) return firma
    if (firma.startsWith('C:/') || firma.startsWith('C:\\')) return null
    if (firma.includes('/') || firma.includes('\\')) return null
    return `data:image/png;base64,${firma}`
  }

  useEffect(() => {
    if (!detalleModalOpen || !detalleRegistro) {
      setDetalleFirmaTecnicoSrc(null)
      setDetalleFirmaTestigoSrc(null)
      return
    }

    let active = true
    const objectUrls: string[] = []

    const loadFirmaFromPath = async (path: string): Promise<string | null> => {
      try {
        const { data } = await api.get('/supervisor/llamada-atencion/firma', {
          params: { path },
          responseType: 'blob',
        })
        const url = URL.createObjectURL(data)
        objectUrls.push(url)
        return url
      } catch {
        return null
      }
    }

    const resolveFirma = async (value?: string): Promise<string | null> => {
      const firma = value?.trim()
      if (!firma) return null
      const direct = getFirmaSrc(firma)
      if (direct) return direct
      return loadFirmaFromPath(firma)
    }

    ;(async () => {
      const [testigo, tecnico] = await Promise.all([
        resolveFirma(detalleRegistro.firmaTestigo),
        resolveFirma(detalleRegistro.firmaTecnico),
      ])
      if (!active) return
      setDetalleFirmaTestigoSrc(testigo)
      setDetalleFirmaTecnicoSrc(tecnico)
    })()

    return () => {
      active = false
      for (const url of objectUrls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [detalleModalOpen, detalleRegistro])

  const selectedTecnico = form.idTecnico ? tecnicoById.get(normalizeId(form.idTecnico)) : undefined
  const selectedFilterTecnico = filterDraft.idTecnico ? tecnicoById.get(normalizeId(filterDraft.idTecnico)) : undefined

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Llamada de Atencion</h2>
        <p className="text-sm text-slate-500">
          Registro y seguimiento de llamadas de atencion para tecnicos.
        </p>
      </div>

      <FormCard
        title="Filtros"
        description="Consulta historial por tecnico y fecha."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              className="md:hidden"
              onClick={() => setMobileFiltersOpen((previous) => !previous)}
            >
              {mobileFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
            <Button type="button" onClick={openRegistroModal}>
              Nueva llamada
            </Button>
            <Button type="button" variant="secondary" className="hidden md:inline-flex" onClick={handleFilterReset}>
              Limpiar
            </Button>
            <Button type="button" onClick={handleFilterApply}>
              Buscar
            </Button>
          </>
        }
      >
        <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} gap-4 md:grid md:grid-cols-2`}>
          <Field label="Tecnico">
            <div className="flex flex-wrap items-center gap-2">
              {selectedFilterTecnico ? (
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                  <span className="truncate">{selectedFilterTecnico.tecnico}</span>
                  <button
                    type="button"
                    className="rounded-full border border-sky-300 px-1.5 leading-none text-sky-700 transition hover:bg-sky-100"
                    onClick={() => setFilterDraft((previous) => ({ ...previous, idTecnico: '' }))}
                    aria-label="Deseleccionar tecnico"
                  >
                    x
                  </button>
                </span>
              ) : (
                <span className="text-xs text-slate-500">Todos</span>
              )}
              <Button type="button" onClick={() => openTecnicoModal('filter')}>
                {selectedFilterTecnico ? 'Cambiar tecnico' : 'Buscar tecnico'}
              </Button>
            </div>
          </Field>
          <Field label="Fecha">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={filterDraft.rangoFechas}
                  onChange={(event) =>
                    setFilterDraft((previous) => ({
                      ...previous,
                      rangoFechas: event.target.checked,
                    }))
                  }
                />
                Rango de fechas
              </label>

              {filterDraft.rangoFechas ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="input-base"
                    type="date"
                    value={filterDraft.fechaDesde}
                    onChange={(event) => setFilterDraft((previous) => ({ ...previous, fechaDesde: event.target.value }))}
                    placeholder="Desde"
                  />
                  <input
                    className="input-base"
                    type="date"
                    value={filterDraft.fechaHasta}
                    onChange={(event) => setFilterDraft((previous) => ({ ...previous, fechaHasta: event.target.value }))}
                    placeholder="Hasta"
                  />
                </div>
              ) : (
                <input
                  className="input-base"
                  type="date"
                  value={filterDraft.fecha}
                  onChange={(event) => setFilterDraft((previous) => ({ ...previous, fecha: event.target.value }))}
                />
              )}
            </div>
          </Field>
        </div>
      </FormCard>

      {formSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {formSuccess}
        </div>
      ) : null}

      <FormCard title="Historial" description={`Registros encontrados: ${llamadas.length}`}>
        {tecnicosQuery.isError || tiposComunicacionQuery.isError || llamadasQuery.isError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(
              tecnicosQuery.error ?? tiposComunicacionQuery.error ?? llamadasQuery.error,
              'No se pudo cargar la informacion.'
            )}
          </div>
        ) : null}
        <div className="space-y-3 md:hidden">
          {llamadasQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Cargando llamadas...
            </div>
          ) : llamadas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Sin llamadas de atencion registradas.
            </div>
          ) : (
            llamadas.map((registro) => {
              const tecnicoInfo = registro.idTecnico ? tecnicoById.get(normalizeId(registro.idTecnico)) : undefined
              return (
                <div key={registro.idLlamadaAtencion} className="rounded-3xl border border-sky-200 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {formatDateTime(registro.fechaRegistro) || '-'}
                    </p>
                    <span className="rounded-full border border-sky-300 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                      ID {registro.idLlamadaAtencion}
                    </span>
                  </div>

                  <p className="mt-3 text-xl font-bold uppercase leading-tight text-slate-900">{describeTecnico(registro)}</p>

                  <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-700">Tipo:</span> {registro.tipoComunicacion ?? '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Cod. Empleado:</span> {registro.codEmpleado ?? '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Motivo:</span> {registro.motivo ?? '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Id Supervisor:</span> {registro.idUsuarioSupervisor ?? '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Habilidad:</span> {tecnicoInfo?.habilidad || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Vehiculo:</span> {tecnicoInfo?.vehiculo || '-'}
                    </p>
                  </div>

                  <div className="mt-3">
                    <Button type="button" variant="secondary" onClick={() => openDetalleModal(registro)}>
                      Ver detalle
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block">
          <Table
            columns={columns}
            data={llamadas}
            emptyLabel={llamadasQuery.isLoading ? 'Cargando llamadas...' : 'Sin llamadas de atencion registradas.'}
            desktopMinWidthClass="min-w-[920px]"
            stickyHeader
          />
        </div>
      </FormCard>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Tip: para listar por tecnico, primero selecciona un tecnico en filtros y presiona <span className="font-semibold">Buscar</span>.
      </div>

      <Modal
        open={registroModalOpen}
        title="Nueva llamada de atencion"
        onClose={closeRegistroModal}
        maxWidthClass="max-w-4xl"
        contentClassName="pr-1"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeRegistroModal}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={crearMutation.isPending}>
              {crearMutation.isPending ? 'Guardando...' : 'Registrar llamada'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Completa los datos para registrar una nueva llamada.</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Tecnico">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTecnico ? (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                      <span className="truncate">{selectedTecnico.tecnico}</span>
                      <button
                        type="button"
                        className="rounded-full border border-sky-300 px-1.5 leading-none text-sky-700 transition hover:bg-sky-100"
                        onClick={() => setForm((previous) => ({ ...previous, idTecnico: '', codEmpleado: '' }))}
                        aria-label="Quitar tecnico"
                      >
                        x
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Ningun tecnico seleccionado</span>
                  )}
                  <Button type="button" onClick={() => openTecnicoModal('form')}>
                    {selectedTecnico ? 'Cambiar tecnico' : 'Buscar tecnico'}
                  </Button>
                </div>
              </Field>
            </div>
            <Field label="Tipo de comunicacion">
              <select
                className="input-base"
                value={form.idTipoComunicacion}
                onChange={(event) => handleFormChange('idTipoComunicacion', event.target.value)}
                disabled={tiposComunicacionQuery.isLoading}
              >
                <option value="">
                  {tiposComunicacionQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo de comunicacion'}
                </option>
                {tiposComunicacion.map((tipo) => (
                  <option key={tipo.idTipoComunicacion} value={tipo.idTipoComunicacion}>
                    {tipo.tipoComunicacion}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Motivo">
              <input
                className="input-base"
                value={form.motivo}
                onChange={(event) => handleFormChange('motivo', event.target.value)}
                placeholder="Ej: Incumplimiento de proceso"
              />
            </Field>
            <Field label="Codigo empleado">
              <input
                className="input-base bg-slate-100"
                value={form.codEmpleado}
                readOnly
                placeholder="Se completa al seleccionar tecnico"
              />
            </Field>
            <Field label="Fecha seguimiento">
              <input
                className="input-base"
                type="datetime-local"
                value={form.fechaSeguimiento}
                onChange={(event) => handleFormChange('fechaSeguimiento', event.target.value)}
              />
            </Field>
            <Field label="Descripcion">
              <textarea
                className="input-base min-h-24 resize-y"
                value={form.descripcion}
                onChange={(event) => handleFormChange('descripcion', event.target.value)}
                placeholder="Detalle de la incidencia"
              />
            </Field>
            <Field label="Comentario colaborador">
              <textarea
                className="input-base min-h-24 resize-y"
                value={form.comentarioColaborador}
                onChange={(event) => handleFormChange('comentarioColaborador', event.target.value)}
              />
            </Field>
            <Field label="Acuerdos">
              <textarea
                className="input-base min-h-24 resize-y"
                value={form.acuerdos}
                onChange={(event) => handleFormChange('acuerdos', event.target.value)}
              />
            </Field>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Firmas</p>
                  <p className="text-xs text-slate-600">
                    Ingresa primero firma del testigo y luego del tecnico.
                  </p>
                </div>
                <Button type="button" onClick={openFirmaModal}>
                  {form.firmaTecnico && form.firmaTestigo ? 'Reingresar firmas' : 'Ingresar firmas'}
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">Testigo:</span>{' '}
                  <span className={form.firmaTestigo ? 'text-emerald-700' : 'text-slate-500'}>
                    {form.firmaTestigo ? 'Firma cargada' : 'Pendiente'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">Tecnico:</span>{' '}
                  <span className={form.firmaTecnico ? 'text-emerald-700' : 'text-slate-500'}>
                    {form.firmaTecnico ? 'Firma cargada' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedTecnico ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{selectedTecnico.tecnico}</p>
              <p className="mt-1 text-xs text-slate-600">
                Cod. Empleado: {selectedTecnico.codEmpleado || '-'} | Cuenta SF: {selectedTecnico.cuentaSf || '-'} | Habilidad:{' '}
                {selectedTecnico.habilidad || '-'} | Vehiculo:{' '}
                {selectedTecnico.vehiculo || '-'}
              </p>
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={firmaModalOpen}
        title={firmaStep === 'testigo' ? 'Ingrese firma del testigo' : 'Ingrese firma del tecnico'}
        onClose={closeFirmaModal}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeFirmaModal}>
              Cancelar
            </Button>
            {firmaStep === 'tecnico' ? (
              <Button type="button" variant="secondary" onClick={handleBackFirmaStep}>
                Volver
              </Button>
            ) : null}
            <Button type="button" onClick={handleConfirmFirmaStep}>
              {firmaStep === 'testigo' ? 'Confirmar testigo' : 'Confirmar tecnico'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {firmaStep === 'testigo'
              ? 'El testigo debe garabatear y luego presionar Confirmar testigo.'
              : 'Ahora el tecnico debe garabatear y confirmar su firma.'}
          </p>

          {firmaStep === 'testigo' ? (
            <>
              <Field label="Nombre completo del testigo">
                <input
                  className="input-base"
                  value={form.testigo}
                  onChange={(event) => handleFormChange('testigo', event.target.value)}
                  placeholder="Escribe nombre y apellido del testigo"
                />
              </Field>
              <SignaturePad value={firmaTestigoDraft} onChange={setFirmaTestigoDraft} />
            </>
          ) : (
            <SignaturePad value={firmaTecnicoDraft} onChange={setFirmaTecnicoDraft} />
          )}

          {firmaModalError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {firmaModalError}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={tecnicoModalOpen}
        title="Seleccionar tecnico"
        onClose={() => setTecnicoModalOpen(false)}
        actions={
          <Button type="button" variant="secondary" onClick={() => setTecnicoModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3">
          <input
            className="input-base"
            value={tecnicoSearch}
            onChange={(event) => setTecnicoSearch(event.target.value)}
            placeholder="Buscar tecnico (nombre, cuenta, id)"
          />

          {tecnicosModalQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Cargando tecnicos...
            </div>
          ) : null}

          {tecnicosModalQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {getApiErrorMessage(tecnicosModalQuery.error, 'No se pudo cargar tecnicos.')}
            </div>
          ) : null}

          {!tecnicosModalQuery.isLoading && !tecnicosModalQuery.isError ? (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
              {tecnicosModal.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-500">Sin tecnicos para mostrar.</div>
              ) : (
                tecnicosModal.map((tecnico) => (
                  <button
                    key={tecnico.idTecnico}
                    type="button"
                    onClick={() => selectTecnicoFromModal(tecnico.idTecnico)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-brand-300"
                  >
                    <p className="font-semibold text-slate-900">{tecnico.tecnico}</p>
                    <p className="mt-1 text-slate-600">
                      ID: {tecnico.idTecnico} | Cod: {tecnico.codEmpleado || '-'} | Cuenta: {tecnico.cuentaSf || '-'} | Habilidad:{' '}
                      {tecnico.habilidad || '-'}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={detalleModalOpen}
        title="Detalle de llamada de atencion"
        onClose={closeDetalleModal}
        maxWidthClass="max-w-3xl"
        actions={
          <Button type="button" variant="secondary" onClick={closeDetalleModal}>
            Cerrar
          </Button>
        }
      >
        {detalleRegistro ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Tecnico</p>
                <p className="text-sm font-semibold text-slate-900">{describeTecnico(detalleRegistro)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Fecha registro</p>
                <p className="text-sm text-slate-900">{formatDateTime(detalleRegistro.fechaRegistro) || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Tipo comunicacion</p>
                <p className="text-sm text-slate-900">{detalleRegistro.tipoComunicacion || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Cod. empleado</p>
                <p className="text-sm text-slate-900">{detalleRegistro.codEmpleado || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Id supervisor</p>
                <p className="text-sm text-slate-900">{detalleRegistro.idUsuarioSupervisor ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Fecha seguimiento</p>
                <p className="text-sm text-slate-900">{formatDateTime(detalleRegistro.fechaSeguimiento) || '-'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Motivo</p>
              <p className="text-sm text-slate-900">{detalleRegistro.motivo || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Descripcion</p>
              <p className="text-sm text-slate-900">{detalleRegistro.descripcion || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Comentario colaborador</p>
              <p className="text-sm text-slate-900">{detalleRegistro.comentarioColaborador || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Acuerdos</p>
              <p className="text-sm text-slate-900">{detalleRegistro.acuerdos || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Testigo</p>
              <p className="text-sm text-slate-900">{detalleRegistro.testigo || '-'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Firma testigo</p>
                {detalleFirmaTestigoSrc ? (
                  <img
                    src={detalleFirmaTestigoSrc}
                    alt="Firma testigo"
                    className="h-36 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                  />
                ) : (
                  <p className="text-xs text-slate-500">Sin firma disponible.</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Firma tecnico</p>
                {detalleFirmaTecnicoSrc ? (
                  <img
                    src={detalleFirmaTecnicoSrc}
                    alt="Firma tecnico"
                    className="h-36 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                  />
                ) : (
                  <p className="text-xs text-slate-500">Sin firma disponible.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default LlamadaAtencionPage
