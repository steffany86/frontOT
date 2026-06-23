import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faEye, faFilePdf, faRotateRight, faSearch } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import {
  downloadBoletaDigitalArchivo,
  fetchBoletaDigitalArchivo,
  fetchBoletaDigitalOts,
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
  return normalizeText([row.ot, row.cliente, row.tecnico, row.estado, row.rutaPdf].join(' ')).includes(normalizedQuery)
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
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const otsQuery = useQuery({
    queryKey: ['boleta-digital', 'ots'],
    queryFn: fetchBoletaDigitalOts,
  })

  const rows = otsQuery.data ?? []
  const filteredRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredRows]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

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

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">VerificacionBoletaDigital</h2>
      </div>

      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3 text-blue-700">
            <FontAwesomeIcon icon={faFilePdf} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Boletas digitales</h3>
              <p className="text-xs text-slate-500">Registros encontrados: {filteredRows.length}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,360px)_auto] sm:items-end">
            <Field label="Buscar" compact>
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-base pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="OT, cliente, tecnico"
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
                <th className="px-4 py-3 text-left font-semibold">RutaPDF</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>Cargando boletas...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}>Sin boletas para mostrar.</td>
                </tr>
              ) : (
                visibleRows.map((row, index) => (
                  <tr key={`${row.id || row.ot || row.rutaPdf}-${index}`} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{row.ot || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.cliente || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.tecnico || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.fecha || '-'}</td>
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
                      </div>
                    </td>
                  </tr>
                ))
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
            visibleRows.map((row, index) => (
              <article key={`${row.id || row.ot || row.rutaPdf}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">OT: {row.ot || '-'}</p>
                <div className="mt-3 grid gap-2 text-xs text-slate-600">
                  <p><span className="font-semibold uppercase text-slate-500">Cliente:</span> {row.cliente || '-'}</p>
                  <p><span className="font-semibold uppercase text-slate-500">Tecnico:</span> {row.tecnico || '-'}</p>
                  <p><span className="font-semibold uppercase text-slate-500">Fecha:</span> {row.fecha || '-'}</p>
                  <p className="break-all"><span className="font-semibold uppercase text-slate-500">RutaPDF:</span> {row.rutaPdf || '-'}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => void openPdf(row)} disabled={!row.rutaPdf}>
                    <FontAwesomeIcon icon={faEye} />
                    <span>Ver</span>
                  </Button>
                  <Button type="button" onClick={() => void downloadPdf(row)} disabled={!row.rutaPdf}>
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Descargar</span>
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default VerificacionBoletaDigitalPage
