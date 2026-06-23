import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faEye, faFilePdf, faRotateRight, faSearch, faUpload } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import {
  downloadBoletaDigitalArchivo,
  fetchBoletaDigitalArchivo,
  fetchBoletaDigitalOts,
  uploadBoletaDigitalArchivo,
} from '../api/boletaDigitalApi'
import { getApiErrorMessage } from '../services/httpClient'
import type { BoletaDigitalOt } from '../types/boletaDigital'

const PAGE_SIZE = 100

const getFileName = (rutaPdf: string, ot: string): string => {
  const normalized = rutaPdf.replace(/\\/g, '/')
  const fileName = normalized.split('/').filter(Boolean).pop()
  if (fileName) return fileName
  return ot ? `OT_${ot}.pdf` : 'boleta-digital.pdf'
}

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const matchesSearch = (row: BoletaDigitalOt, query: string): boolean => {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return true
  return normalizeText(row.ot).includes(normalizedQuery)
}

const isDifferentRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'diferente'
}

const isWithoutPdfRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'sin_pdf' || normalizeText(row.estado) === 'sin_pdf'
}

const canReplacePdf = (row: BoletaDigitalOt): boolean => {
  return isDifferentRow(row) || isWithoutPdfRow(row)
}

const isEqualRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'igual'
}

const isPreviouslyModifiedEqualRow = (row: BoletaDigitalOt): boolean => {
  return row.previamenteModificada && isEqualRow(row)
}

const getComparisonBadge = (row: BoletaDigitalOt): { label: string; className: string } => {
  if (isPreviouslyModifiedEqualRow(row)) {
    return {
      label: 'PREVIAMENTE MODIFICADA',
      className: 'bg-amber-100 text-amber-800',
    }
  }
  if (isDifferentRow(row)) {
    return {
      label: row.comparacion || '-',
      className: 'bg-rose-100 text-rose-700',
    }
  }
  return {
    label: row.comparacion || '-',
    className: 'bg-emerald-100 text-emerald-700',
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getBoletaDigitalErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  const baseMessage = getApiErrorMessage(error, fallback)
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) {
    return baseMessage
  }
  let responseData: unknown = error.response.data
  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text()
      responseData = text ? JSON.parse(text) : null
    } catch {
      responseData = null
    }
  }
  if (!isRecord(responseData)) {
    return baseMessage
  }
  const details = responseData.details
  if (!isRecord(details) || typeof details.rootCause !== 'string' || !details.rootCause.trim()) {
    const message = typeof responseData.message === 'string' ? responseData.message.trim() : ''
    return message || baseMessage
  }
  return `${baseMessage} Detalle: ${details.rootCause.trim()}`
}

const VerificacionBoletaDigitalPage = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'iguales' | 'diferentes' | 'sin_pdf'>('all')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [selectedUploadRow, setSelectedUploadRow] = useState<BoletaDigitalOt | null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open: boolean
    status: 'loading' | 'error'
    message: string
  }>({ open: false, status: 'loading', message: '' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const otsQuery = useQuery({
    queryKey: ['boleta-digital', 'ots', fechaInicio, fechaFin],
    queryFn: () => fetchBoletaDigitalOts({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    }),
  })

  const rows = otsQuery.data ?? []
  const statusSummary = useMemo(
    () => ({
      iguales: rows.filter(isEqualRow).length,
      diferentes: rows.filter(isDifferentRow).length,
      sinPdf: rows.filter(isWithoutPdfRow).length,
    }),
    [rows]
  )
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!matchesSearch(row, search)) return false
        if (statusFilter === 'iguales') return isEqualRow(row)
        if (statusFilter === 'diferentes') return isDifferentRow(row)
        if (statusFilter === 'sin_pdf') return isWithoutPdfRow(row)
        return true
      }),
    [rows, search, statusFilter]
  )
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredRows]
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, fechaInicio, fechaFin])

  const openPdf = async (row: BoletaDigitalOt) => {
    if (!row.rutaPdf) {
      setActionError('La OT seleccionada no tiene RutaPDF.')
      return
    }
    const key = `${row.id || row.ot}-view`
    setLoadingKey(key)
    setActionError(null)
    try {
      const blob = await fetchBoletaDigitalArchivo(row.rutaPdf)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      setActionError(await getBoletaDigitalErrorMessage(error, 'No se pudo abrir el PDF.'))
    } finally {
      setLoadingKey((current) => (current === key ? null : current))
    }
  }

  const downloadPdf = async (row: BoletaDigitalOt) => {
    if (!row.rutaPdf) {
      setActionError('La OT seleccionada no tiene RutaPDF.')
      return
    }
    const key = `${row.id || row.ot}-download`
    setLoadingKey(key)
    setActionError(null)
    try {
      const blob = await downloadBoletaDigitalArchivo(row.rutaPdf)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getFileName(row.rutaPdf, row.ot)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setActionError(await getBoletaDigitalErrorMessage(error, 'No se pudo descargar el PDF.'))
    } finally {
      setLoadingKey((current) => (current === key ? null : current))
    }
  }

  const selectReplacementPdf = (row: BoletaDigitalOt) => {
    if (!row.id) {
      setActionError('La OT seleccionada no tiene id_venta para cambiar el PDF.')
      return
    }
    setActionError(null)
    setSelectedUploadRow(row)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const uploadReplacementPdf = async (file: File, row: BoletaDigitalOt) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setActionError('Solo se permite subir archivos PDF.')
      return
    }
    const key = `${row.id || row.ot}-upload`
    setLoadingKey(key)
    setActionError(null)
    setUploadModal({
      open: true,
      status: 'loading',
      message: 'Subiendo y validando boleta digital...',
    })
    try {
      await uploadBoletaDigitalArchivo(row.id, file)
      await otsQuery.refetch()
      setUploadModal({ open: false, status: 'loading', message: '' })
    } catch (error) {
      const message = await getBoletaDigitalErrorMessage(error, 'No se pudo cambiar el PDF.')
      setUploadModal({
        open: true,
        status: 'error',
        message,
      })
    } finally {
      setLoadingKey((current) => (current === key ? null : current))
      setSelectedUploadRow(null)
    }
  }

  const handleReplacementFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const row = selectedUploadRow
    event.target.value = ''
    if (!file || !row) return
    void uploadReplacementPdf(file, row)
  }

  return (
    <div className="bento-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleReplacementFileChange}
      />
      <Modal
        open={uploadModal.open}
        title={uploadModal.status === 'loading' ? 'Subiendo boleta' : 'No se pudo subir'}
        onClose={() => {
          if (uploadModal.status !== 'loading') {
            setUploadModal({ open: false, status: 'loading', message: '' })
          }
        }}
        actions={
          uploadModal.status === 'error' ? (
            <Button
              type="button"
              onClick={() => setUploadModal({ open: false, status: 'loading', message: '' })}
            >
              Entendido
            </Button>
          ) : null
        }
      >
        {uploadModal.status === 'loading' ? (
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <span>{uploadModal.message}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {uploadModal.message || 'No coincide el nombre del PDF.'}
          </div>
        )}
      </Modal>
      <div className="bento-page-head">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">VerificacionBoletaDigital</h2>
      </div>

      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-100/80 px-5 py-3">
          <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {[
              { id: 'all', label: 'Todos', count: rows.length },
              { id: 'iguales', label: 'Iguales', count: statusSummary.iguales },
              { id: 'diferentes', label: 'Diferentes', count: statusSummary.diferentes },
              { id: 'sin_pdf', label: 'Sin PDF', count: statusSummary.sinPdf },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                    active
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-700'
                  }`}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                >
                  {tab.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-3">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition ${
              statusFilter === 'iguales'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'iguales' ? 'all' : 'iguales'))}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">Iguales</span>
            <span className="mt-1 block text-2xl font-extrabold">{statusSummary.iguales}</span>
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition ${
              statusFilter === 'diferentes'
                ? 'border-rose-400 bg-rose-50 text-rose-900'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'diferentes' ? 'all' : 'diferentes'))}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">Diferentes</span>
            <span className="mt-1 block text-2xl font-extrabold">{statusSummary.diferentes}</span>
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition ${
              statusFilter === 'sin_pdf'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'sin_pdf' ? 'all' : 'sin_pdf'))}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">Sin PDF</span>
            <span className="mt-1 block text-2xl font-extrabold">{statusSummary.sinPdf}</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-3 text-blue-700">
            <FontAwesomeIcon icon={faFilePdf} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Boletas digitales</h3>
              <p className="text-xs text-slate-500">Registros encontrados: {filteredRows.length}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_minmax(220px,360px)_auto] lg:items-end">
            <Field label="Desde" compact>
              <input
                className="input-base"
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
              />
            </Field>
            <Field label="Hasta" compact>
              <input
                className="input-base"
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
              />
            </Field>
            <Field label="Buscar" compact>
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-base pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por OT"
                />
              </div>
            </Field>
            <Button type="button" variant="secondary" onClick={() => otsQuery.refetch()} disabled={otsQuery.isFetching}>
              <FontAwesomeIcon icon={faRotateRight} />
              <span>{otsQuery.isFetching ? 'Actualizando...' : 'Actualizar'}</span>
            </Button>
          </div>
        </div>

        {otsQuery.isError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(otsQuery.error, 'No se pudo cargar el listado.')}
          </div>
        ) : null}

        {actionError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        <div className="hidden max-h-[62vh] overflow-auto md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">OT</th>
                <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold">Tecnico</th>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Comparacion</th>
                <th className="px-4 py-3 text-left font-semibold">RutaPDF</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={7}>Cargando boletas...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={7}>Sin boletas para mostrar.</td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const isDifferent = isDifferentRow(row)
                  const canReplace = canReplacePdf(row)
                  const comparisonBadge = getComparisonBadge(row)
                  return (
                  <tr key={`${row.id || row.ot || row.rutaPdf}-${index}`} className={`align-top ${isDifferent ? 'bg-rose-50' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{row.ot || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.cliente || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.tecnico || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.fecha || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${comparisonBadge.className}`}>
                        {comparisonBadge.label}
                      </span>
                    </td>
                    <td className="max-w-sm truncate px-4 py-3 text-xs text-slate-500" title={row.rutaPdf}>{row.rutaPdf || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          onClick={() => void openPdf(row)}
                          disabled={!row.rutaPdf || loadingKey === `${row.id || row.ot}-view`}
                          title="Ver PDF"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          onClick={() => void downloadPdf(row)}
                          disabled={!row.rutaPdf || loadingKey === `${row.id || row.ot}-download`}
                          title="Descargar PDF"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        {canReplace ? (
                          <button
                            type="button"
                            className="rounded-lg border border-amber-300 px-3 py-2 text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
                            onClick={() => selectReplacementPdf(row)}
                            disabled={!row.id || loadingKey === `${row.id || row.ot}-upload`}
                            title="Cambiar PDF"
                          >
                            <FontAwesomeIcon icon={faUpload} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} de {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
              Anterior
            </Button>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <Button type="button" variant="secondary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {otsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Cargando boletas...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Sin boletas para mostrar.
            </div>
          ) : (
            visibleRows.map((row, index) => {
              const canReplace = canReplacePdf(row)
              const comparisonBadge = getComparisonBadge(row)
              return (
                <article key={`${row.id || row.ot || row.rutaPdf}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">OT: {row.ot || '-'}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <p><span className="font-semibold uppercase text-slate-500">Cliente:</span> {row.cliente || '-'}</p>
                    <p><span className="font-semibold uppercase text-slate-500">Tecnico:</span> {row.tecnico || '-'}</p>
                    <p><span className="font-semibold uppercase text-slate-500">Fecha:</span> {row.fecha || '-'}</p>
                    <p>
                      <span className="font-semibold uppercase text-slate-500">Comparacion:</span>{' '}
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${comparisonBadge.className}`}>
                        {comparisonBadge.label}
                      </span>
                    </p>
                    <p className="break-all"><span className="font-semibold uppercase text-slate-500">RutaPDF:</span> {row.rutaPdf || '-'}</p>
                  </div>
                  <div className={`mt-4 grid gap-2 ${canReplace ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Button type="button" variant="secondary" onClick={() => void openPdf(row)} disabled={!row.rutaPdf}>
                      <FontAwesomeIcon icon={faEye} />
                      <span>Ver</span>
                    </Button>
                    <Button type="button" onClick={() => void downloadPdf(row)} disabled={!row.rutaPdf}>
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Descargar</span>
                    </Button>
                    {canReplace ? (
                      <Button type="button" variant="secondary" onClick={() => selectReplacementPdf(row)} disabled={!row.id || loadingKey === `${row.id || row.ot}-upload`}>
                        <FontAwesomeIcon icon={faUpload} />
                        <span>Cambiar</span>
                      </Button>
                    ) : null}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export default VerificacionBoletaDigitalPage
