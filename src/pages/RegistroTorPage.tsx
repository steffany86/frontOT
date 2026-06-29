import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faRotateLeft, faSave, faTableList } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Tabs from '../components/common/Tabs'
import { fetchTorRegistrados, registrarTor } from '../api/torApi'
import { getApiErrorMessage } from '../services/httpClient'
import type { TorRegistroPayload } from '../types/tor'

type RegistroTorForm = {
  detalle: string
  tor: string
  tipoServicio: string
}

type RegistroTorTab = 'registro' | 'registrados'

const createEmptyForm = (): RegistroTorForm => ({
  detalle: '',
  tor: '',
  tipoServicio: '',
})

const toUpperText = (value: string): string => value.toUpperCase()

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getTorErrorMessage = (error: unknown): string => {
  const baseMessage = getApiErrorMessage(error, 'No se pudo registrar TOR.')
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) {
    return baseMessage
  }
  const responseData = error.response.data
  const details = responseData.details
  if (!isRecord(details) || typeof details.rootCause !== 'string' || !details.rootCause.trim()) {
    return baseMessage
  }
  return `${baseMessage} Detalle: ${details.rootCause.trim()}`
}

const RegistroTorPage = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<RegistroTorTab>('registro')
  const [form, setForm] = useState<RegistroTorForm>(createEmptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const registradosQuery = useQuery({
    queryKey: ['tor', 'registrados'],
    queryFn: fetchTorRegistrados,
  })

  const registroMutation = useMutation({
    mutationFn: (payload: TorRegistroPayload) => registrarTor(payload),
    onSuccess: () => {
      setForm(createEmptyForm())
      setFormError(null)
      setFormSuccess('Registro TOR guardado correctamente.')
      setActiveTab('registrados')
      queryClient.invalidateQueries({ queryKey: ['tor', 'registrados'] })
    },
    onError: (error) => {
      setFormSuccess(null)
      setFormError(getTorErrorMessage(error))
    },
  })

  const handleChange = <K extends keyof RegistroTorForm>(field: K, value: RegistroTorForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: toUpperText(value) }))
  }

  const validateForm = (): string | null => {
    if (!form.detalle.trim()) return 'Detalle es requerido.'
    if (!form.tor.trim()) return 'TOR es requerido.'
    if (!form.tipoServicio.trim()) return 'Tipo de servicio es requerido.'
    return null
  }

  const handleSubmit = () => {
    const validationError = validateForm()
    if (validationError) {
      setFormSuccess(null)
      setFormError(validationError)
      return
    }

    setFormError(null)
    setFormSuccess(null)
    registroMutation.mutate({
      detalle: form.detalle.trim(),
      tor: form.tor.trim(),
      tipoServicio: form.tipoServicio.trim(),
    })
  }

  const handleReset = () => {
    setForm(createEmptyForm())
    setFormError(null)
    setFormSuccess(null)
  }

  const registrados = registradosQuery.data ?? []

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Registro_TOR</h2>
        <div className="mt-3 w-full sm:w-auto">
          <Tabs
            items={[
              { id: 'registro', label: 'Registro' },
              { id: 'registrados', label: 'Registrados' },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as RegistroTorTab)}
          />
        </div>
      </div>

      {activeTab === 'registro' ? (
        <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3 text-blue-700">
            <FontAwesomeIcon icon={faFileLines} />
            <h3 className="text-lg font-bold text-slate-900">Datos del registro</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Detalle">
                <textarea
                  className="input-base min-h-40 resize-y uppercase"
                  value={form.detalle}
                  onChange={(event) => handleChange('detalle', event.target.value)}
                  placeholder="Ingrese el detalle"
                />
              </Field>
            </div>

            <Field label="TOR">
              <input
                className="input-base uppercase"
                value={form.tor}
                onChange={(event) => handleChange('tor', event.target.value)}
                placeholder="Ingrese TOR"
              />
            </Field>

            <Field label="Tipo servicio">
              <input
                className="input-base uppercase"
                value={form.tipoServicio}
                onChange={(event) => handleChange('tipoServicio', event.target.value)}
                placeholder="Ingrese tipo de servicio"
              />
            </Field>
          </div>

          {formError ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
          ) : null}

          {formSuccess ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {formSuccess}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={handleReset} disabled={registroMutation.isPending}>
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>Limpiar</span>
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={registroMutation.isPending}>
              <FontAwesomeIcon icon={faSave} />
              <span>{registroMutation.isPending ? 'Guardando...' : 'Guardar'}</span>
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3 text-blue-700">
              <FontAwesomeIcon icon={faTableList} />
              <h3 className="text-lg font-bold text-slate-900">Registrados</h3>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {registrados.length}
            </span>
          </div>

          {registradosQuery.isError ? (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getTorErrorMessage(registradosQuery.error)}
            </div>
          ) : null}

          <div className="hidden max-h-[520px] overflow-auto md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">NroTrans</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                  <th className="px-4 py-3 text-left font-semibold">TOR</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo servicio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registradosQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>Cargando registrados...</td>
                  </tr>
                ) : registrados.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center" colSpan={4}>
                      <p className="text-3xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
                    </td>
                  </tr>
                ) : (
                  registrados.map((item, index) => (
                    <tr key={`${item.id || item.detalle}-${index}`} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{item.nroTrans || item.id || '-'}</td>
                      <td className="max-w-xl px-4 py-3 font-medium text-slate-900">{item.detalle || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.tor || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.tipoServicio || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {registradosQuery.isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Cargando registrados...
              </div>
            ) : registrados.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
              </div>
            ) : (
              registrados.map((item, index) => (
                <article key={`${item.id || item.detalle}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">{item.detalle || '-'}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <p><span className="font-semibold uppercase text-slate-500">NroTrans:</span> {item.nroTrans || item.id || '-'}</p>
                    <p><span className="font-semibold uppercase text-slate-500">TOR:</span> {item.tor || '-'}</p>
                    <p><span className="font-semibold uppercase text-slate-500">Tipo servicio:</span> {item.tipoServicio || '-'}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default RegistroTorPage
