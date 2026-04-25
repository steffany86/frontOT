import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Column } from '../components/common/Table'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import SignaturePad from '../components/common/SignaturePad'
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
import { todayISO } from '../utils/dates'
import { getApiErrorMessage } from '../services/httpClient'

type LlamadaAtencionForm = {
  idTecnico: string
  idTipoComunicacion: string
  motivo: string
  descripcion: string
  comentarioColaborador: string
  acuerdos: string
  fechaSeguimiento: string
  firmaTecnico: string
  firmaTestigo: string
}

type LlamadaAtencionFiltro = {
  idTecnico: string
  fechaDesde: string
  fechaHasta: string
}

type FirmaStep = 'testigo' | 'tecnico'

const createEmptyForm = (): LlamadaAtencionForm => ({
  idTecnico: '',
  idTipoComunicacion: '',
  motivo: '',
  descripcion: '',
  comentarioColaborador: '',
  acuerdos: '',
  fechaSeguimiento: '',
  firmaTecnico: '',
  firmaTestigo: '',
})

const createDefaultFilter = (): LlamadaAtencionFiltro => ({
  idTecnico: '',
  fechaDesde: todayISO(),
  fechaHasta: todayISO(),
})

const toOptionalText = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

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
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [firmaStep, setFirmaStep] = useState<FirmaStep>('testigo')
  const [firmaTestigoDraft, setFirmaTestigoDraft] = useState('')
  const [firmaTecnicoDraft, setFirmaTecnicoDraft] = useState('')
  const [firmaModalError, setFirmaModalError] = useState<string | null>(null)

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

  const llamadasQuery = useQuery({
    queryKey: ['llamada-atencion', 'listado', activeFilter],
    queryFn: () =>
      fetchLlamadasAtencion({
        idTecnico: activeFilter.idTecnico || undefined,
        fechaDesde: activeFilter.fechaDesde || undefined,
        fechaHasta: activeFilter.fechaHasta || undefined,
        limite: 300,
      }),
  })

  const crearMutation = useMutation({
    mutationFn: (payload: LlamadaAtencionCreatePayload) => createLlamadaAtencion(payload),
    onSuccess: (result) => {
      setFormError(null)
      setFormSuccess(`Llamada de atencion registrada. ID: ${result.idLlamadaAtencion}`)
      setForm((previous) => ({
        ...createEmptyForm(),
        idTecnico: previous.idTecnico,
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
  const tiposComunicacion = tiposComunicacionQuery.data ?? []
  const llamadas = llamadasQuery.data ?? []

  const tecnicoById = useMemo(() => {
    return new Map(tecnicos.map((item) => [item.idTecnico, item] as const))
  }, [tecnicos])

  const columns = useMemo<Column<LlamadaAtencionRegistro>[]>(() => {
    const describeTecnico = (registro: LlamadaAtencionRegistro): string => {
      const tecnico = registro.tecnico?.trim()
      if (tecnico) return tecnico
      const byId = registro.idTecnico ? tecnicoById.get(registro.idTecnico) : undefined
      return byId?.tecnico ?? registro.idTecnico ?? '-'
    }

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

  const handleFormChange = <K extends keyof LlamadaAtencionForm>(field: K, value: LlamadaAtencionForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
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
      if (!firmaTestigoDraft.trim()) {
        setFirmaModalError('La firma del testigo es requerida.')
        return
      }
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
    if (!form.idTipoComunicacion) return 'Selecciona tipo de comunicacion.'
    if (!form.motivo.trim()) return 'Motivo es requerido.'
    if (form.fechaSeguimiento && Number.isNaN(new Date(form.fechaSeguimiento).getTime())) {
      return 'Fecha de seguimiento invalida.'
    }
    if (!form.firmaTecnico.trim()) return 'Firma del tecnico es requerida.'
    if (!form.firmaTestigo.trim()) return 'Firma del testigo es requerida.'
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
      idTipoComunicacion: form.idTipoComunicacion,
      motivo: form.motivo.trim(),
      descripcion: toOptionalText(form.descripcion),
      comentarioColaborador: toOptionalText(form.comentarioColaborador),
      acuerdos: toOptionalText(form.acuerdos),
      fechaSeguimiento: toOptionalText(form.fechaSeguimiento),
      firmaTecnico: toOptionalText(form.firmaTecnico),
      firmaTestigo: toOptionalText(form.firmaTestigo),
    }

    setFormError(null)
    setFormSuccess(null)
    crearMutation.mutate(payload)
  }

  const selectedTecnico = form.idTecnico ? tecnicoById.get(form.idTecnico) : undefined

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
        description="Consulta historial por tecnico y rango de fechas."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={handleFilterReset}>
              Limpiar
            </Button>
            <Button type="button" onClick={handleFilterApply}>
              Buscar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Tecnico">
            <select
              className="input-base"
              value={filterDraft.idTecnico}
              onChange={(event) => setFilterDraft((previous) => ({ ...previous, idTecnico: event.target.value }))}
            >
              <option value="">Todos</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.idTecnico} value={tecnico.idTecnico}>
                  {tecnico.tecnico}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha desde">
            <input
              className="input-base"
              type="date"
              value={filterDraft.fechaDesde}
              onChange={(event) => setFilterDraft((previous) => ({ ...previous, fechaDesde: event.target.value }))}
            />
          </Field>
          <Field label="Fecha hasta">
            <input
              className="input-base"
              type="date"
              value={filterDraft.fechaHasta}
              onChange={(event) => setFilterDraft((previous) => ({ ...previous, fechaHasta: event.target.value }))}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard title="Nueva llamada de atencion" description="Completa los datos para registrar una nueva llamada.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tecnico">
            <select
              className="input-base"
              value={form.idTecnico}
              onChange={(event) => handleFormChange('idTecnico', event.target.value)}
              disabled={tecnicosQuery.isLoading}
            >
              <option value="">{tecnicosQuery.isLoading ? 'Cargando tecnicos...' : 'Selecciona tecnico'}</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.idTecnico} value={tecnico.idTecnico}>
                  {tecnico.tecnico}
                </option>
              ))}
            </select>
          </Field>
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
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{selectedTecnico.tecnico}</p>
            <p className="mt-1 text-xs text-slate-600">
              Cuenta SF: {selectedTecnico.cuentaSf || '-'} | Habilidad: {selectedTecnico.habilidad || '-'} | Vehiculo:{' '}
              {selectedTecnico.vehiculo || '-'}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={crearMutation.isPending}>
            {crearMutation.isPending ? 'Guardando...' : 'Registrar llamada'}
          </Button>
        </div>

        {formError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
        ) : null}
        {formSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {formSuccess}
          </div>
        ) : null}
      </FormCard>

      <FormCard title="Historial" description={`Registros encontrados: ${llamadas.length}`}>
        {tecnicosQuery.isError || tiposComunicacionQuery.isError || llamadasQuery.isError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(
              tecnicosQuery.error ?? tiposComunicacionQuery.error ?? llamadasQuery.error,
              'No se pudo cargar la informacion.'
            )}
          </div>
        ) : null}
        <Table
          columns={columns}
          data={llamadas}
          emptyLabel={llamadasQuery.isLoading ? 'Cargando llamadas...' : 'Sin llamadas de atencion registradas.'}
          desktopMinWidthClass="min-w-[920px]"
          stickyHeader
        />
      </FormCard>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Tip: para listar por tecnico, primero selecciona un tecnico en filtros y presiona <span className="font-semibold">Buscar</span>.
      </div>

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
            <SignaturePad value={firmaTestigoDraft} onChange={setFirmaTestigoDraft} />
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
    </div>
  )
}

export default LlamadaAtencionPage
