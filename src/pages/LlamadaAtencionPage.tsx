import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faCircleInfo, faClipboardCheck, faComments, faDownload, faFileLines, faFilter, faPrint, faSearch, faSignature, faTriangleExclamation, faUserGear, faUserGroup } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import ImageLightbox from '../components/common/ImageLightbox'
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
  tecnico: string
  codEmpleado: string
  tabla: string
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
  tecnico: '',
  codEmpleado: '',
  tabla: '',
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

const formatDateOnly = (value?: string): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

const LlamadaAtencionPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<LlamadaAtencionForm>(createEmptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [filterDraft, setFilterDraft] = useState<LlamadaAtencionFiltro>(createDefaultFilter)
  const [activeFilter, setActiveFilter] = useState<LlamadaAtencionFiltro>(createDefaultFilter)
  const mobileFiltersOpen = true
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
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null)

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
      setFormSuccess(`Seguimiento y Control Operativo registrado. ID: ${result.idLlamadaAtencion}`)
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
      setFormError(getApiErrorMessage(error, 'No se pudo registrar la incidencia.'))
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
    const tecnicoNombre = tecnico?.tecnico?.trim() ?? ''
    const tabla = tecnico?.tabla?.trim() ?? ''
    if (tecnicoModalTarget === 'filter') {
      setFilterDraft((previous) => ({ ...previous, idTecnico: tecnicoId }))
    } else {
      setForm((previous) => ({ ...previous, idTecnico: tecnicoId, tecnico: tecnicoNombre, codEmpleado, tabla }))
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
      setFirmaModalError('La firma del tercero o empleado es requerida.')
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
    if (!form.idTecnico) return 'Selecciona un tercero o empleado.'
    if (!form.codEmpleado.trim()) return 'El tercero o empleado seleccionado no tiene codigo de empleado.'
    if (!form.fechaSeguimiento.trim()) return 'Fecha de seguimiento es requerida.'
    if (!form.idTipoComunicacion) return 'Selecciona tipo de comunicacion.'
    if (!form.motivo.trim()) return 'Motivo es requerido.'
    if (form.fechaSeguimiento && Number.isNaN(new Date(form.fechaSeguimiento).getTime())) {
      return 'Fecha de seguimiento invalida.'
    }
    if (!form.firmaTecnico.trim()) return 'Firma del tercero o empleado es requerida.'
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
      tecnico: toOptionalText(form.tecnico),
      codEmpleado: form.codEmpleado.trim(),
      tabla: toOptionalText(form.tabla),
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
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Seguimiento y Control Operativo</h2>
        <div className="mt-2">
          <Button type="button" onClick={openRegistroModal} className="h-11 px-6">
            Nueva Incidencia
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
          <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Filtros de Busqueda</h3>
        </div>
        <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} gap-4 md:grid md:grid-cols-[1.3fr_1fr] md:items-end`}>
          <Field label="Tercero o empleado">
            <div className="flex flex-wrap items-center gap-2">
              {selectedFilterTecnico ? (
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                  <span className="truncate">{selectedFilterTecnico.tecnico}</span>
                  <button
                    type="button"
                    className="rounded-full border border-sky-300 px-1.5 leading-none text-sky-700 transition hover:bg-sky-100"
                    onClick={() => setFilterDraft((previous) => ({ ...previous, idTecnico: '' }))}
                    aria-label="Deseleccionar tercero o empleado"
                  >
                    x
                  </button>
                </span>
              ) : null}
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => openTecnicoModal('filter')}
                  className="h-10 flex-1 rounded-lg px-3 text-left text-base text-slate-500"
                >
                  {selectedFilterTecnico ? selectedFilterTecnico.tecnico : 'ID o nombre del tercero o empleado...'}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                  onClick={() => openTecnicoModal('filter')}
                >
                  <FontAwesomeIcon icon={faSearch} />
                </button>
              </div>
            </div>
          </Field>
          <Field label="Rango de fechas">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <input
                className="input-base bg-slate-100"
                type="date"
                value={filterDraft.fecha}
                onChange={(event) => setFilterDraft((previous) => ({ ...previous, fecha: event.target.value }))}
              />
              <Button type="button" onClick={handleFilterApply} className="h-11 px-8">Buscar</Button>
              <Button type="button" variant="secondary" onClick={handleFilterReset} className="h-11 px-8">Limpiar</Button>
            </div>
          </Field>
        </div>
      </div>

      {formSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {formSuccess}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Historial de Registros</h3>
            <p className="text-sm text-slate-600">Registros encontrados: <span className="font-semibold">{llamadas.length}</span></p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button className="rounded-xl border border-slate-300 px-3 py-2 text-slate-700"><FontAwesomeIcon icon={faDownload} /></button>
            <button className="rounded-xl border border-slate-300 px-3 py-2 text-slate-700"><FontAwesomeIcon icon={faPrint} /></button>
          </div>
        </div>
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
              Cargando incidencias...
            </div>
          ) : llamadas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Sin incidencias registradas.
            </div>
          ) : (
            llamadas.map((registro) => {
              return (
                <div key={registro.idLlamadaAtencion} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-3 text-xs">
                    <div>
                      <p className="font-semibold uppercase text-slate-500">Fecha de registro</p>
                      <p className="mt-1 text-slate-800">{formatDateOnly(registro.fechaRegistro) || '-'}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase text-slate-500">Fecha de evento</p>
                      <p className="mt-1 text-slate-800">{formatDateOnly(registro.fechaSeguimiento) || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tercero o empleado</p>
                      <p className="mt-1 font-semibold text-slate-900">{describeTecnico(registro)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tipo</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${String(registro.tipoComunicacion || '').toLowerCase().includes('llamada') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                        {registro.tipoComunicacion || '-'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Motivo</p>
                      <p className="mt-1 italic text-slate-800">"{registro.motivo || '-'}"</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3">
                    <Button type="button" variant="secondary" className="w-full" onClick={() => openDetalleModal(registro)}>
                      Ver detalle
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block">
          {llamadasQuery.isLoading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Cargando incidencias...</div>
          ) : llamadas.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">Sin incidencias registradas.</div>
          ) : (
            <div className="max-h-[58vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">FECHA DE REGISTRO</th>
                    <th className="px-4 py-3 text-left">TERCERO O EMPLEADO</th>
                    <th className="px-4 py-3 text-left">TIPO</th>
                    <th className="px-4 py-3 text-left">MOTIVO</th>
                    <th className="px-4 py-3 text-left">FECHA DE EVENTO</th>
                    <th className="px-4 py-3 text-left">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {llamadas.map((row) => (
                    <tr key={row.idLlamadaAtencion} className="border-t border-slate-200">
                      <td className="px-4 py-4 whitespace-nowrap">{formatDateOnly(row.fechaRegistro) || '-'}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{describeTecnico(row)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${String(row.tipoComunicacion || '').toLowerCase().includes('llamada') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                          {row.tipoComunicacion || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 italic text-slate-700">"{row.motivo || '-'}"</td>
                      <td className="px-4 py-4">{formatDateTime(row.fechaSeguimiento) || '-'}</td>
                      <td className="px-4 py-4">
                        <Button type="button" variant="secondary" onClick={() => openDetalleModal(row)}>Ver detalle</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={registroModalOpen}
        title="Nueva Incidencia"
        onClose={closeRegistroModal}
        maxWidthClass="max-w-4xl"
        contentClassName="pr-1"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeRegistroModal}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={crearMutation.isPending}>
              {crearMutation.isPending ? 'Guardando...' : 'Registrar incidencia'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Complete los datos para registrar la incidencia y los acuerdos establecidos.</p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faUserGroup} />
                <h4 className="text-base font-semibold">Tercero / Empleado</h4>
              </div>
              <Field label="Nombre del colaborador">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTecnico ? (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                      <span className="truncate">{selectedTecnico.tecnico}</span>
                      <button
                        type="button"
                        className="rounded-full border border-sky-300 px-1.5 leading-none text-sky-700 transition hover:bg-sky-100"
                        onClick={() => setForm((previous) => ({ ...previous, idTecnico: '', tecnico: '', codEmpleado: '', tabla: '' }))}
                        aria-label="Quitar tercero o empleado"
                      >
                        x
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Ningun tercero / empleado seleccionado</span>
                  )}
                  <Button type="button" onClick={() => openTecnicoModal('form')} className="w-full sm:w-auto">
                    {selectedTecnico ? 'Cambiar' : 'Buscar'}
                  </Button>
                </div>
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faUserGear} />
                <h4 className="text-base font-semibold">Informacion General</h4>
              </div>
              <div className="space-y-4">
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
                    placeholder="Se completa al seleccionar tercero o empleado"
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
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2 text-red-600">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <h4 className="text-base font-semibold">Nivel de Gravedad</h4>
              </div>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                La gravedad se define por el tipo de comunicacion y motivo registrado.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-blue-700">
              <FontAwesomeIcon icon={faFileLines} />
              <h4 className="text-base font-semibold">Detalle de Incidencia</h4>
            </div>
            <Field label="Descripcion">
              <textarea
                className="input-base min-h-28 resize-y"
                value={form.descripcion}
                onChange={(event) => handleFormChange('descripcion', event.target.value)}
                placeholder="Describa detalladamente los hechos observados y normas infringidas..."
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faComments} />
                <h4 className="text-base font-semibold">Comentario del Colaborador</h4>
              </div>
              <Field label="Comentario">
                <textarea
                  className="input-base min-h-24 resize-y"
                  value={form.comentarioColaborador}
                  onChange={(event) => handleFormChange('comentarioColaborador', event.target.value)}
                  placeholder="Observaciones o descargos del personal involucrado..."
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faClipboardCheck} />
                <h4 className="text-base font-semibold">Acuerdos y Compromisos</h4>
              </div>
              <Field label="Acuerdos">
                <textarea
                  className="input-base min-h-24 resize-y"
                  value={form.acuerdos}
                  onChange={(event) => handleFormChange('acuerdos', event.target.value)}
                  placeholder="Defina los acuerdos establecidos para evitar recurrencias..."
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faSignature} />
                <h4 className="text-base font-semibold">Validacion de Firmas</h4>
              </div>
              <Button type="button" onClick={openFirmaModal}>
                {form.firmaTecnico && form.firmaTestigo ? 'Reingresar firmas' : 'Ingresar firmas'}
              </Button>
            </div>
            <p className="text-xs text-slate-600">Ingresa primero firma del testigo y luego del tercero o empleado.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">Testigo:</span>{' '}
                <span className={form.firmaTestigo ? 'text-emerald-700' : 'text-slate-500'}>
                  {form.firmaTestigo ? 'Firma cargada' : 'Pendiente'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">Tercero o empleado:</span>{' '}
                <span className={form.firmaTecnico ? 'text-emerald-700' : 'text-slate-500'}>
                  {form.firmaTecnico ? 'Firma cargada' : 'Pendiente'}
                </span>
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
        title={firmaStep === 'testigo' ? 'Ingrese firma del testigo' : 'Ingrese firma del tercero o empleado'}
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
              {firmaStep === 'testigo' ? 'Confirmar testigo' : 'Confirmar tercero o empleado'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {firmaStep === 'testigo'
              ? 'El testigo debe garabatear y luego presionar Confirmar testigo.'
              : 'Ahora el tercero o empleado debe garabatear y confirmar su firma.'}
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
        title="Seleccionar tercero o empleado"
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
            placeholder="Buscar tercero o empleado (nombre, cuenta, id)"
          />

          {tecnicosModalQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Cargando terceros o empleados...
            </div>
          ) : null}

          {tecnicosModalQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {getApiErrorMessage(tecnicosModalQuery.error, 'No se pudo cargar terceros o empleados.')}
            </div>
          ) : null}

          {!tecnicosModalQuery.isLoading && !tecnicosModalQuery.isError ? (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
              {tecnicosModal.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-500">Sin terceros o empleados para mostrar.</div>
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
                      ID: {tecnico.idTecnico} | Cod: {tecnico.codEmpleado || '-'} | Tabla: {tecnico.tabla || '-'} | Cuenta:{' '}
                      {tecnico.cuentaSf || '-'} | Habilidad: {tecnico.habilidad || '-'}
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
        title="Detalle de incidencia"
        onClose={closeDetalleModal}
        maxWidthClass="max-w-6xl"
        actions={
          <Button type="button" variant="secondary" onClick={closeDetalleModal}>
            Cerrar
          </Button>
        }
      >
        {detalleRegistro ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4">
              <p className="text-lg font-semibold text-blue-800">Resumen del registro</p>
              <p className="text-sm text-slate-700">Visualiza la informacion completa de la incidencia para el seguimiento del colaborador.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600"><FontAwesomeIcon icon={faUserGroup} className="mr-2 text-slate-700" />Tercero o empleado</p><p className="mt-1 text-xl font-semibold leading-tight text-blue-800">{describeTecnico(detalleRegistro)}</p></div>
              <div className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600"><FontAwesomeIcon icon={faCalendarDays} className="mr-2 text-slate-700" />Fecha registro</p><p className="mt-1 text-xl font-semibold leading-tight text-slate-900">{formatDateTime(detalleRegistro.fechaRegistro) || '-'}</p></div>
              <div className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600"><FontAwesomeIcon icon={faComments} className="mr-2 text-slate-700" />Tipo comunicacion</p><p className="mt-1 text-xl font-semibold leading-tight text-slate-900">{detalleRegistro.tipoComunicacion || '-'}</p></div>
              <div className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600"><FontAwesomeIcon icon={faUserGear} className="mr-2 text-slate-700" />Supervisor</p><p className="mt-1 text-xl font-semibold leading-tight text-slate-900">{detalleRegistro.supervisorNombre || detalleRegistro.idUsuarioSupervisor || '-'}</p></div>
              <div className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600"><FontAwesomeIcon icon={faCalendarDays} className="mr-2 text-slate-700" />Fecha seguimiento</p><p className="mt-1 text-xl font-semibold leading-tight text-slate-900">{formatDateTime(detalleRegistro.fechaSeguimiento) || '-'}</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900"><FontAwesomeIcon icon={faTriangleExclamation} className="mr-2 text-red-600" />Motivo del Incidente</h4><div className="min-h-[96px] rounded-xl bg-slate-100 p-4 text-sm text-slate-800">{detalleRegistro.motivo || '-'}</div></section>
                <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900"><FontAwesomeIcon icon={faFileLines} className="mr-2 text-blue-700" />Descripcion Detallada</h4><div className="min-h-[96px] rounded-xl bg-slate-100 p-4 text-sm text-slate-800">{detalleRegistro.descripcion || '-'}</div></section>
                <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900"><FontAwesomeIcon icon={faClipboardCheck} className="mr-2 text-red-600" />Acuerdos Establecidos</h4><div className="min-h-[96px] rounded-xl bg-slate-100 p-4 text-sm text-slate-800">{detalleRegistro.acuerdos || '-'}</div></section>
              </div>
              <div className="space-y-4">
                <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900"><FontAwesomeIcon icon={faComments} className="mr-2 text-slate-800" />Comentario del Colaborador</h4><div className="min-h-[250px] rounded-xl bg-slate-100 p-4 text-sm text-slate-800">{detalleRegistro.comentarioColaborador || '-'}</div></section>
                <section className="rounded-2xl border border-[#cfd8ee] bg-white p-4"><h4 className="mb-3 font-semibold text-slate-900"><FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-slate-800" />Testigo Presencial</h4><div className="min-h-[96px] rounded-xl bg-slate-100 p-4 text-sm text-slate-800">{detalleRegistro.testigo || '-'}</div></section>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Firma testigo</p>{detalleFirmaTestigoSrc ? (<img src={detalleFirmaTestigoSrc} alt="Firma testigo" className="h-36 w-full cursor-zoom-in rounded-lg border border-slate-200 object-contain bg-slate-50" onClick={() => setZoomImageSrc(detalleFirmaTestigoSrc)} />) : (<p className="text-xs text-slate-500">Sin firma disponible.</p>)}</div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Firma tercero o empleado</p>{detalleFirmaTecnicoSrc ? (<img src={detalleFirmaTecnicoSrc} alt="Firma tercero o empleado" className="h-36 w-full cursor-zoom-in rounded-lg border border-slate-200 object-contain bg-slate-50" onClick={() => setZoomImageSrc(detalleFirmaTecnicoSrc)} />) : (<p className="text-xs text-slate-500">Sin firma disponible.</p>)}</div>
            </div>
          </div>
        ) : null}
      </Modal>
      <ImageLightbox open={Boolean(zoomImageSrc)} src={zoomImageSrc ?? ''} onClose={() => setZoomImageSrc(null)} />
    </div>
  )
}

export default LlamadaAtencionPage

