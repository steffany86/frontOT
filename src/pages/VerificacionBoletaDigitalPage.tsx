import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faEye, faFileExcel, faFilePdf, faFloppyDisk, faRotateRight, faSearch, faUpload, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import {
  confirmarBoletaDigitalBoleta,
  downloadBoletaDigitalArchivo,
  fetchBoletaDigitalArchivo,
  fetchBoletaDigitalOts,
  markBoletaDigitalTodoOk,
  uploadBoletaDigitalArchivo,
} from '../api/boletaDigitalApi'
import { getApiErrorMessage } from '../services/httpClient'
import { startOfMonthISO, todayISO } from '../utils/dates'
import type { BoletaDigitalOt } from '../types/boletaDigital'

const PAGE_SIZE = 100
const defaultFechaInicio = startOfMonthISO()
const defaultFechaFin = todayISO()

const getFileName = (rutaPdf: string, ot: string): string => {
  const normalized = rutaPdf.replace(/\\/g, '/')
  const fileName = normalized.split('/').filter(Boolean).pop()
  if (fileName) return fileName
  return ot ? `OT_${ot}.pdf` : 'boleta-digital.pdf'
}

const getExpectedPdfFileName = (row: BoletaDigitalOt | null): string => {
  const otFisica = row?.otFisica?.trim()
  return otFisica ? `${otFisica}.pdf` : ''
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const hasExtension = (fileName: string, extensions: string[]): boolean => {
  const lower = fileName.trim().toLowerCase()
  return extensions.some((extension) => lower.endsWith(extension))
}

const ensureUploadExtension = (fileName: string, fallbackExtension: string): string => {
  const trimmed = fileName.trim()
  if (!trimmed) return ''
  if (hasExtension(trimmed, ['.pdf', ...IMAGE_EXTENSIONS])) return trimmed
  return `${trimmed}${fallbackExtension}`
}

const renameUploadFile = (file: File, fileName: string): File => {
  if (file.name === fileName) return file
  return new File([file], fileName, {
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified,
  })
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
  return (
    normalizeText(row.ot).includes(normalizedQuery) ||
    normalizeText(row.nroTransaccion).includes(normalizedQuery) ||
    normalizeText(row.otFisica).includes(normalizedQuery) ||
    normalizeText(row.cliente).includes(normalizedQuery) ||
    normalizeText(row.estado).includes(normalizedQuery)
  )
}

const isDifferentRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'diferente'
}

const isWithoutPdfRow = (row: BoletaDigitalOt): boolean => {
  if (isImageRow(row)) return false
  return normalizeText(row.comparacion) === 'sin_pdf' || normalizeText(row.estadoArchivo || row.estado) === 'sin_pdf'
}

const isImageRow = (row: BoletaDigitalOt): boolean => {
  return row.rutaArchivoImagen || normalizeText(row.comparacion) === 'imagen' || normalizeText(row.estadoArchivo) === 'con_imagen'
}

const canReplacePdf = (row: BoletaDigitalOt): boolean => {
  return isDifferentRow(row) || isWithoutPdfRow(row) || isImageRow(row) || (isEqualRow(row) && !row.todoOk)
}

const isEqualRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'igual'
}

const isPreviouslyModifiedEqualRow = (row: BoletaDigitalOt): boolean => {
  return row.previamenteModificada && isEqualRow(row)
}

const canMarkTodoOk = (row: BoletaDigitalOt): boolean => {
  return isEqualRow(row) && !row.todoOk
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
  if (isImageRow(row)) {
    return {
      label: 'IMAGEN',
      className: 'bg-sky-100 text-sky-700',
    }
  }
  return {
    label: row.comparacion || '-',
    className: 'bg-emerald-100 text-emerald-700',
  }
}

const formatBoletaFecha = (value: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatBoletaDateTitle = (value: string): string => {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })
}

const boletaText = (value: string): string => value || '-'

const getBoletaRowKey = (row: BoletaDigitalOt): string =>
  row.id?.trim() || row.ot?.trim() || row.rutaPdf?.trim() || row.nroTransaccion?.trim() || ''

const readRawBoletaValue = (row: BoletaDigitalOt, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row.raw, key)) {
      const value = row.raw[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  const normalizedKeys = keys.map((key) => key.trim().toLowerCase().replace(/[\s_]+/g, ''))
  for (const [key, value] of Object.entries(row.raw)) {
    const normalized = key.trim().toLowerCase().replace(/[\s_]+/g, '')
    if (!normalizedKeys.includes(normalized)) continue
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const getIdBoCitaHistorial = (row: BoletaDigitalOt): string => {
  const value = row.idBoCitaHistorial || readRawBoletaValue(row, ['Id_BO_CITA_MAKIRO_Historial', 'id_BO_CITA_MAKIRO_Historial', 'idBoCitaMakiroHistorial'])
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim()
}

const isActualizadoBoletaConfirmado = (row: BoletaDigitalOt): boolean => {
  const value = readRawBoletaValue(row, ['Actualizado_BOLETA', 'ActualizadoBoleta', 'actualizado_boleta', 'actualizadoBoleta'])
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value.trim() === '1'
  return false
}

const canOpenBoletaFile = (row: BoletaDigitalOt): boolean => {
  const path = row.rutaPdf.trim().toLowerCase().split('?')[0]
  return Boolean(row.rutaPdf) && (path.endsWith('.pdf') || IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension)))
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'iguales' | 'diferentes' | 'sin_pdf' | 'imagenes'>('all')
  const [fechaInicio, setFechaInicio] = useState(defaultFechaInicio)
  const [fechaFin, setFechaFin] = useState(defaultFechaFin)
  const [fechaRangeError, setFechaRangeError] = useState(false)
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [selectedUploadRow, setSelectedUploadRow] = useState<BoletaDigitalOt | null>(null)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadRenameError, setUploadRenameError] = useState<string | null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open: boolean
    status: 'confirm' | 'loading' | 'error'
    message: string
  }>({ open: false, status: 'loading', message: '' })
  const [confirmBoletaByRow, setConfirmBoletaByRow] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hasValidDateRange = Boolean(fechaInicio && fechaFin && fechaInicio <= fechaFin)

  const otsQuery = useQuery({
    queryKey: ['boleta-digital', 'ots', fechaInicio, fechaFin],
    enabled: hasValidDateRange,
    queryFn: () => fetchBoletaDigitalOts({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    }),
  })

  const rows = hasValidDateRange ? (otsQuery.data ?? []) : []
  const statusSummary = useMemo(
    () => ({
      iguales: rows.filter(isEqualRow).length,
      diferentes: rows.filter(isDifferentRow).length,
      sinPdf: rows.filter(isWithoutPdfRow).length,
      imagenes: rows.filter(isImageRow).length,
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
        if (statusFilter === 'imagenes') return isImageRow(row)
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

  useEffect(() => {
    if (hasValidDateRange) {
      setFechaRangeError(false)
    }
  }, [hasValidDateRange])

  const confirmarBoletaMutation = useMutation({
    mutationFn: ({ idVenta }: { idVenta: string; rowKey: string }) => confirmarBoletaDigitalBoleta(idVenta),
    onSuccess: async (_, variables) => {
      setConfirmBoletaByRow((current) => {
        const next = { ...current }
        delete next[variables.rowKey]
        return next
      })
      await otsQuery.refetch()
    },
  })

  const toggleConfirmBoleta = (rowKey: string, checked: boolean) => {
    setConfirmBoletaByRow((current) => ({
      ...current,
      [rowKey]: checked,
    }))
  }

  const procesarCambioBoleta = (row: BoletaDigitalOt) => {
    const rowKey = getBoletaRowKey(row)
    if (!rowKey) {
      setActionError('No se pudo identificar la OT para confirmar la boleta.')
      return
    }
    if (!row.id?.trim()) {
      setActionError('La fila no tiene id de venta para procesar el cambio.')
      return
    }
    if (!confirmBoletaByRow[rowKey]) {
      setActionError('Marca confirmar antes de procesar el cambio.')
      return
    }
    setActionError(null)
    setLoadingKey(`${rowKey}-confirm-boleta`)
    confirmarBoletaMutation.mutate({ idVenta: row.id, rowKey }, {
      onSettled: () => {
        setLoadingKey((current) => (current === `${rowKey}-confirm-boleta` ? null : current))
      },
    })
  }

  const canExportExcel = statusFilter === 'diferentes' || statusFilter === 'sin_pdf' || statusFilter === 'imagenes'

  const exportarExcel = async () => {
    if (!hasValidDateRange) {
      setFechaRangeError(true)
      setActionError('Seleccione el rango de fechas para exportar a Excel.')
      return
    }

    setExportandoExcel(true)
    setActionError(null)
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'TigoStar'
      workbook.created = new Date()

      const sheet = workbook.addWorksheet(statusFilter === 'sin_pdf' ? 'Sin PDF' : 'Diferentes', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      sheet.views = [{ state: 'frozen', ySplit: 2 }]
      sheet.columns = [
        { header: 'Nro transaccion', key: 'nroTransaccion', width: 18 },
        { header: 'OT', key: 'ot', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 16 },
        { header: 'Tecnico', key: 'tecnico', width: 28 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Estado', key: 'estado', width: 18 },
        { header: 'OT Fisica', key: 'otFisica', width: 18 },
        { header: 'Comparacion', key: 'comparacion', width: 18 },
      ]

      const title = `${statusFilter === 'sin_pdf' ? 'Boletas sin PDF' : 'Boletas diferentes'} de ${formatBoletaDateTitle(fechaInicio)} a ${formatBoletaDateTitle(fechaFin)}`
      sheet.insertRow(1, [title])
      sheet.mergeCells('A1:H1')
      sheet.getRow(1).height = 32
      sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F172A' } }
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
      sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }

      sheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFilter === 'sin_pdf' ? 'FFF59E0B' : 'FFE11D48' } }
      sheet.getRow(2).alignment = { vertical: 'middle', wrapText: true }

      filteredRows.forEach((row) => {
        sheet.addRow({
          nroTransaccion: boletaText(row.nroTransaccion),
          ot: boletaText(row.ot),
          cliente: boletaText(row.cliente),
          tecnico: boletaText(row.tecnico),
          fecha: formatBoletaFecha(row.fecha),
          estado: boletaText(row.estado),
          otFisica: boletaText(row.otFisica),
          comparacion: boletaText(row.comparacion),
        })
      })
      sheet.eachRow((row) => {
        row.alignment = { vertical: 'top', wrapText: true }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `boleta-digital-${statusFilter}-${fechaInicio}-a-${fechaFin}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No se pudo exportar el Excel.'))
    } finally {
      setExportandoExcel(false)
    }
  }

  const openPdf = async (row: BoletaDigitalOt) => {
    if (!canOpenBoletaFile(row)) {
      setActionError('La OT seleccionada no tiene un archivo valido para abrir.')
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
    if (!canOpenBoletaFile(row)) {
      setActionError('La OT seleccionada no tiene un archivo valido para descargar.')
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

  const markTodoOk = async (row: BoletaDigitalOt) => {
    if (!row.id) {
      setActionError('La OT seleccionada no tiene id_venta para marcar Todo OK.')
      return
    }
    const key = `${row.id || row.ot}-todo-ok`
    setLoadingKey(key)
    setActionError(null)
    try {
      await markBoletaDigitalTodoOk(row.id, true)
      await otsQuery.refetch()
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No se pudo marcar Todo OK.'))
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
      fileInputRef.current.accept = isImageRow(row) ? '.jpg,.jpeg,.png,.webp,image/*' : 'application/pdf,.pdf'
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const uploadReplacementPdf = async (file: File, row: BoletaDigitalOt) => {
    const isImageUpload = isImageRow(row)
    const lowerName = file.name.toLowerCase()
    const validFile = isImageUpload ? hasExtension(lowerName, IMAGE_EXTENSIONS) : lowerName.endsWith('.pdf')
    if (!validFile) {
      setActionError(isImageUpload ? 'Solo se permite subir imagen JPG/PNG.' : 'Solo se permite subir archivos PDF.')
      return
    }
    const key = `${row.id || row.ot}-upload`
    setLoadingKey(key)
    setActionError(null)
    setUploadModal({
      open: true,
      status: 'loading',
      message: isImageUpload ? 'Subiendo imagen...' : 'Subiendo y validando boleta digital...',
    })
    try {
      await uploadBoletaDigitalArchivo(row.id, file)
      await otsQuery.refetch()
      setUploadModal({ open: false, status: 'loading', message: '' })
    } catch (error) {
      const message = await getBoletaDigitalErrorMessage(error, isImageUpload ? 'No se pudo cambiar la imagen.' : 'No se pudo cambiar el PDF.')
      setUploadModal({
        open: true,
        status: 'error',
        message,
      })
    } finally {
      setLoadingKey((current) => (current === key ? null : current))
      setSelectedUploadRow(null)
      setPendingUploadFile(null)
      setUploadFileName('')
      setUploadRenameError(null)
    }
  }

  const handleReplacementFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const row = selectedUploadRow
    event.target.value = ''
    if (!file || !row) return
    const isImageUpload = isImageRow(row)
    const lowerName = file.name.toLowerCase()
    const validFile = isImageUpload ? hasExtension(lowerName, IMAGE_EXTENSIONS) : lowerName.endsWith('.pdf')
    if (!validFile) {
      setActionError(isImageUpload ? 'Solo se permite subir imagen JPG/PNG.' : 'Solo se permite subir archivos PDF.')
      setSelectedUploadRow(null)
      return
    }
    setActionError(null)
    setPendingUploadFile(file)
    setUploadFileName(file.name)
    setUploadRenameError(null)
    setUploadModal({ open: true, status: 'confirm', message: '' })
  }

  const closeUploadModal = () => {
    setUploadModal({ open: false, status: 'loading', message: '' })
    setPendingUploadFile(null)
    setUploadFileName('')
    setUploadRenameError(null)
    setSelectedUploadRow(null)
  }

  const confirmReplacementUpload = () => {
    if (!selectedUploadRow || !pendingUploadFile) {
      closeUploadModal()
      return
    }
    const finalName = ensureUploadExtension(uploadFileName, isImageRow(selectedUploadRow) ? '.png' : '.pdf')
    if (!finalName) {
      setUploadRenameError('Ingrese el nombre del archivo.')
      return
    }
    if (finalName.includes('/') || finalName.includes('\\')) {
      setUploadRenameError('El nombre no debe incluir carpetas ni barras.')
      return
    }
    setUploadRenameError(null)
    void uploadReplacementPdf(renameUploadFile(pendingUploadFile, finalName), selectedUploadRow)
  }

  return (
    <div className="bento-page max-w-full overflow-x-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept={selectedUploadRow && isImageRow(selectedUploadRow) ? '.jpg,.jpeg,.png,.webp,image/*' : 'application/pdf,.pdf'}
        className="hidden"
        onChange={handleReplacementFileChange}
      />
      <Modal
        open={uploadModal.open}
        title={
          uploadModal.status === 'confirm'
            ? 'Cambiar archivo'
            : uploadModal.status === 'loading'
              ? 'Subiendo boleta'
              : 'No se pudo subir'
        }
        onClose={() => {
          if (uploadModal.status !== 'loading') {
            closeUploadModal()
          }
        }}
        actions={
          uploadModal.status === 'confirm' ? (
            <>
              <Button type="button" variant="secondary" onClick={closeUploadModal}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmReplacementUpload}>
                <FontAwesomeIcon icon={faUpload} />
                <span>Subir archivo</span>
              </Button>
            </>
          ) : uploadModal.status === 'error' ? (
            <Button
              type="button"
              onClick={closeUploadModal}
            >
              Entendido
            </Button>
          ) : null
        }
      >
        {uploadModal.status === 'confirm' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">
                {selectedUploadRow && isImageRow(selectedUploadRow) ? 'Archivo actual:' : 'Nombre de archivo esperado:'}
              </p>
              <p className="mt-1 break-all text-base font-bold text-slate-900">
                {selectedUploadRow && isImageRow(selectedUploadRow) ? getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot) : getExpectedPdfFileName(selectedUploadRow) || '-'}
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="min-w-0">
                <span className="block text-xs font-semibold uppercase text-slate-500">OT</span>
                <span className="break-words font-semibold text-slate-800">{selectedUploadRow?.ot || '-'}</span>
              </p>
              <p className="min-w-0">
                <span className="block text-xs font-semibold uppercase text-slate-500">Archivo seleccionado</span>
                <span className="break-all font-semibold text-slate-800">{pendingUploadFile?.name || '-'}</span>
              </p>
            </div>
            <Field label="Nombre del archivo que se subira">
              <input
                className={`input-base ${uploadRenameError ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' : ''}`}
                value={uploadFileName}
                onChange={(event) => {
                  setUploadFileName(event.target.value)
                  setUploadRenameError(null)
                }}
                placeholder={selectedUploadRow && isImageRow(selectedUploadRow) ? 'imagen.png' : 'SA-00000000.pdf'}
              />
            </Field>
            {uploadRenameError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {uploadRenameError}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {selectedUploadRow && isImageRow(selectedUploadRow)
                  ? 'Si no escribe extension, se agrega .png automaticamente.'
                  : 'Si no escribe .pdf, se agrega automaticamente al subir.'}
              </p>
            )}
          </div>
        ) : uploadModal.status === 'loading' ? (
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
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Verificación Boleta Digital</h2>
      </div>

      <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2">
          <div className="inline-flex max-w-full gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {[
              { id: 'all', label: 'Todos', count: rows.length },
              { id: 'iguales', label: 'Iguales', count: statusSummary.iguales },
              { id: 'diferentes', label: 'Diferentes', count: statusSummary.diferentes },
              { id: 'sin_pdf', label: 'Sin PDF', count: statusSummary.sinPdf },
              { id: 'imagenes', label: 'Con imagen', count: statusSummary.imagenes },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-700'
                  }`}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                >
                  {tab.label}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-2 border-b border-slate-200 px-3 py-2 sm:grid-cols-4">
          <button
            type="button"
            className={`min-h-[3rem] rounded-lg border px-3 py-1.5 text-left transition ${
              statusFilter === 'iguales'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'iguales' ? 'all' : 'iguales'))}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">Iguales</span>
            <span className="block text-lg font-extrabold leading-5">{statusSummary.iguales}</span>
          </button>
          <button
            type="button"
            className={`min-h-[3rem] rounded-lg border px-3 py-1.5 text-left transition ${
              statusFilter === 'diferentes'
                ? 'border-rose-400 bg-rose-50 text-rose-900'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'diferentes' ? 'all' : 'diferentes'))}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">Diferentes</span>
            <span className="block text-lg font-extrabold leading-5">{statusSummary.diferentes}</span>
          </button>
          <button
            type="button"
            className={`min-h-[3rem] rounded-lg border px-3 py-1.5 text-left transition ${
              statusFilter === 'sin_pdf'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'sin_pdf' ? 'all' : 'sin_pdf'))}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">Sin PDF</span>
            <span className="block text-lg font-extrabold leading-5">{statusSummary.sinPdf}</span>
          </button>
          <button
            type="button"
            className={`min-h-[3rem] rounded-lg border px-3 py-1.5 text-left transition ${
              statusFilter === 'imagenes'
                ? 'border-sky-400 bg-sky-50 text-sky-900'
                : 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400'
            }`}
            onClick={() => setStatusFilter((current) => (current === 'imagenes' ? 'all' : 'imagenes'))}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">Con imagen</span>
            <span className="block text-lg font-extrabold leading-5">{statusSummary.imagenes}</span>
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-center gap-3 text-blue-700">
            <FontAwesomeIcon icon={faFilePdf} />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900">Boletas digitales</h3>
              <p className="text-xs text-slate-500">Registros encontrados: {filteredRows.length}</p>
            </div>
          </div>
          <div className={`grid min-w-0 max-w-full gap-2 sm:grid-cols-2 ${
            canExportExcel
              ? 'lg:grid-cols-[auto_minmax(0,145px)_minmax(0,145px)_minmax(0,320px)_auto]'
              : 'lg:grid-cols-[minmax(0,145px)_minmax(0,145px)_minmax(0,320px)_auto]'
          } lg:items-end`}>
            {canExportExcel ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void exportarExcel()}
                disabled={exportandoExcel}
              >
                <FontAwesomeIcon icon={faFileExcel} />
                <span>{exportandoExcel ? 'Exportando...' : 'Exportar Excel'}</span>
              </Button>
            ) : null}
            <Field label="Desde" compact>
              <input
                className={`input-base rounded-lg py-2 text-xs ${fechaRangeError && !fechaInicio ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' : ''}`}
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
              />
            </Field>
            <Field label="Hasta" compact>
              <input
                className={`input-base rounded-lg py-2 text-xs ${fechaRangeError && !fechaFin ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200' : ''}`}
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
              />
            </Field>
            <Field label="Buscar" compact>
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-base rounded-lg py-2 pl-9 text-xs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por OT o cliente"
                />
              </div>
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => otsQuery.refetch()}
              disabled={otsQuery.isFetching || !hasValidDateRange}
            >
              <FontAwesomeIcon icon={faRotateRight} />
              <span>{otsQuery.isFetching ? 'Actualizando...' : 'Actualizar'}</span>
            </Button>
          </div>
        </div>

        {!hasValidDateRange ? (
          <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Selecciona un rango de fechas valido para cargar las boletas.
          </div>
        ) : null}

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

        <div className="hidden max-h-[68vh] max-w-full overflow-auto md:block">
          <table className="w-full min-w-[1120px] table-fixed divide-y divide-slate-200 text-xs leading-tight">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase text-slate-500 shadow-sm">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Nro transaccion</th>
                <th className="px-2 py-1.5 text-left font-semibold">Id historial</th>
                <th className="px-2 py-1.5 text-left font-semibold">Cliente</th>
                <th className="px-2 py-1.5 text-left font-semibold">Tecnico</th>
                <th className="px-2 py-1.5 text-left font-semibold">Fecha</th>
                <th className="px-2 py-1.5 text-left font-semibold">Estado</th>
                <th className="px-2 py-1.5 text-left font-semibold">OT Fisica</th>
                <th className="px-2 py-1.5 text-left font-semibold">Comparacion</th>
                <th className="px-2 py-1.5 text-left font-semibold">RutaPDF</th>
                <th className="px-2 py-1.5 text-center font-semibold">Confirmar</th>
                <th className="px-2 py-1.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otsQuery.isLoading ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={11}>Cargando boletas...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={11}>
                    <p className="text-3xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const isDifferent = isDifferentRow(row)
                  const canReplace = canReplacePdf(row)
                  const canValidateTodoOk = canMarkTodoOk(row)
                  const canOpenPdf = canOpenBoletaFile(row)
                  const rowKey = getBoletaRowKey(row) || `${index}`
                  const confirmBoletaLocked = isActualizadoBoletaConfirmado(row)
                  const confirmBoletaChecked = confirmBoletaLocked || Boolean(confirmBoletaByRow[rowKey])
                  const comparisonBadge = getComparisonBadge(row)
                  return (
                  <tr key={`${row.id || row.ot || row.rutaPdf}-${index}`} className={`align-top ${isDifferent ? 'bg-rose-50' : ''}`}>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                      <span className="font-semibold text-slate-700">{row.nroTransaccion || '-'}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                      <span className="font-semibold text-rose-600">{getIdBoCitaHistorial(row) || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-900">
                      <div className="min-w-0">
                        <div className="truncate font-semibold" title={row.cliente}>{row.cliente || '-'}</div>
                        <div className="truncate text-[11px] text-slate-500" title={row.ot}>{row.ot || '-'}</div>
                      </div>
                    </td>
                    <td className="truncate px-2 py-1.5 text-slate-700" title={row.tecnico}>{row.tecnico || '-'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">{formatBoletaFecha(row.fecha)}</td>
                    <td className="truncate px-2 py-1.5 text-slate-700" title={row.estado}>{row.estado || '-'}</td>
                    <td className="truncate px-2 py-1.5 font-semibold text-slate-700" title={row.otFisica}>{row.otFisica || '-'}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${comparisonBadge.className}`}>
                          {comparisonBadge.label}
                        </span>
                        {row.todoOk ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            TODO OK
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-slate-500">
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={row.rutaPdf}>
                        {row.rutaPdf || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={confirmBoletaChecked}
                          onChange={(event) => toggleConfirmBoleta(rowKey, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-600 focus:ring-0 focus:ring-offset-0"
                          aria-label="Confirmar cambio"
                          disabled={confirmBoletaLocked}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 rounded-md !border-0 !bg-transparent p-0 text-slate-700 hover:!bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                          onClick={() => procesarCambioBoleta(row)}
                          disabled={confirmBoletaLocked || !confirmBoletaChecked || confirmarBoletaMutation.isPending || loadingKey === `${rowKey}-confirm-boleta`}
                          title={confirmBoletaLocked ? 'Ya confirmado' : 'Confirmar cambio'}
                        >
                          {loadingKey === `${rowKey}-confirm-boleta` ? (
                            '...'
                          ) : (
                            <FontAwesomeIcon icon={faFloppyDisk} />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <div className="flex min-w-[92px] justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 text-[11px] text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          onClick={() => void openPdf(row)}
                          disabled={!canOpenPdf || loadingKey === `${row.id || row.ot}-view`}
                          title="Ver PDF"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 text-[11px] text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                          onClick={() => void downloadPdf(row)}
                          disabled={!canOpenPdf || loadingKey === `${row.id || row.ot}-download`}
                          title="Descargar PDF"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        {canReplace ? (
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-300 text-[11px] text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
                            onClick={() => selectReplacementPdf(row)}
                            disabled={!row.id || loadingKey === `${row.id || row.ot}-upload`}
                            title="Cambiar PDF"
                          >
                            <FontAwesomeIcon icon={faUpload} />
                          </button>
                        ) : null}
                        {canValidateTodoOk ? (
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-300 text-[11px] text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                            onClick={() => void markTodoOk(row)}
                            disabled={!row.id || loadingKey === `${row.id || row.ot}-todo-ok`}
                            title="Todo OK"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
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

        <div className="space-y-3 px-3 py-4 sm:px-4 md:hidden">
          {otsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Cargando boletas...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">NO HAY DATOS PARA LA FECHA</p>
            </div>
          ) : (
            visibleRows.map((row, index) => {
              const canReplace = canReplacePdf(row)
              const canValidateTodoOk = canMarkTodoOk(row)
              const canOpenPdf = canOpenBoletaFile(row)
              const rowKey = getBoletaRowKey(row) || `${index}`
              const confirmBoletaLocked = isActualizadoBoletaConfirmado(row)
              const confirmBoletaChecked = confirmBoletaLocked || Boolean(confirmBoletaByRow[rowKey])
              const comparisonBadge = getComparisonBadge(row)
              return (
                <article key={`${row.id || row.ot || row.rutaPdf}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-base font-extrabold text-slate-900">{row.cliente || '-'}</p>
                        <p className="mt-0.5 break-words text-xs font-semibold text-slate-500">{row.ot || '-'}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${comparisonBadge.className}`}>
                          {comparisonBadge.label}
                        </span>
                        {row.todoOk ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                            TODO OK
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 break-words text-xs font-semibold text-slate-500">{row.tecnico || '-'}</p>
                  </div>
                  <div className="grid gap-2 px-4 py-3 text-xs text-slate-700">
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">Nro transaccion</span>
                      <span className="min-w-0 break-words font-semibold text-slate-900">{row.nroTransaccion || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">Id historial</span>
                      <span className="min-w-0 break-words font-extrabold text-rose-600">{getIdBoCitaHistorial(row) || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">Cliente/OT</span>
                      <span className="min-w-0 break-words">
                        <span className="block font-semibold text-slate-900">{row.cliente || '-'}</span>
                        <span className="block text-slate-600">{row.ot || '-'}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">Fecha</span>
                      <span className="min-w-0 break-words">{formatBoletaFecha(row.fecha)}</span>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">Estado</span>
                      <span className="min-w-0 break-words">{row.estado || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
                      <span className="font-semibold uppercase text-slate-500">OT Fisica</span>
                      <span className="min-w-0 break-words">{row.otFisica || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold uppercase text-slate-500">RutaPDF</span>
                      <p className="mt-1 max-h-20 overflow-y-auto break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
                        {row.rutaPdf || '-'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        <input
                          type="checkbox"
                          checked={confirmBoletaChecked}
                          onChange={(event) => toggleConfirmBoleta(rowKey, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-600 focus:ring-0 focus:ring-offset-0"
                          disabled={confirmBoletaLocked}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 rounded-md !border-0 !bg-transparent p-0 text-slate-700 hover:!bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                        onClick={() => procesarCambioBoleta(row)}
                        disabled={confirmBoletaLocked || !confirmBoletaChecked || confirmarBoletaMutation.isPending || loadingKey === `${rowKey}-confirm-boleta`}
                        title={confirmBoletaLocked ? 'Ya confirmado' : 'Confirmar cambio'}
                      >
                        {loadingKey === `${rowKey}-confirm-boleta` ? (
                          '...'
                        ) : (
                          <FontAwesomeIcon icon={faFloppyDisk} />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3">
                    <Button type="button" variant="secondary" className="min-h-11 px-3" onClick={() => void openPdf(row)} disabled={!canOpenPdf}>
                      <FontAwesomeIcon icon={faEye} />
                      <span>Ver</span>
                    </Button>
                    <Button type="button" className="min-h-11 px-3" onClick={() => void downloadPdf(row)} disabled={!canOpenPdf}>
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Descargar</span>
                    </Button>
                    {canReplace ? (
                      <Button type="button" variant="secondary" className="col-span-2 min-h-11 px-3" onClick={() => selectReplacementPdf(row)} disabled={!row.id || loadingKey === `${row.id || row.ot}-upload`}>
                        <FontAwesomeIcon icon={faUpload} />
                        <span>Cambiar archivo</span>
                      </Button>
                    ) : null}
                    {canValidateTodoOk ? (
                      <Button type="button" variant="secondary" className="col-span-2 min-h-11 px-3 text-emerald-700" onClick={() => void markTodoOk(row)} disabled={!row.id || loadingKey === `${row.id || row.ot}-todo-ok`}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        <span>Todo OK</span>
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
