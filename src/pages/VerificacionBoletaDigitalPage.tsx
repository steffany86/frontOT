import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faEye, faFileExcel, faList, faSearch, faUpload, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import {
  downloadBoletaDigitalArchivo,
  fetchBoletaDigitalArchivo,
  fetchBoletaDigitalOts,
  markBoletaDigitalTodoOk,
  renameBoletaDigitalArchivo,
  uploadBoletaDigitalArchivo,
} from '../api/boletaDigitalApi'
import { getApiErrorMessage } from '../services/httpClient'
import { startOfMonthISO, todayISO } from '../utils/dates'
import type { BoletaDigitalOt } from '../types/boletaDigital'
import { useFileSizeLimitModal } from '../hooks/useFileSizeLimitModal'

const PAGE_SIZE = 100
const defaultFechaInicio = startOfMonthISO()
const defaultFechaFin = todayISO()

const getFileName = (rutaPdf: string, ot: string): string => {
  const normalized = rutaPdf.replace(/\\/g, '/')
  const fileName = normalized.split('/').filter(Boolean).pop()
  if (fileName) return fileName
  return ot ? `OT_${ot}.pdf` : 'boleta-digital.pdf'
}

const getFileExtension = (fileName: string, fallback: string): string => {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/)
  return match?.[0] || fallback
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
  return !row.todoOk && (isDifferentRow(row) || isWithoutPdfRow(row) || isImageRow(row) || isEqualRow(row) || isEditedRow(row))
}

const isEqualRow = (row: BoletaDigitalOt): boolean => {
  return normalizeText(row.comparacion) === 'igual'
}

const isPreviouslyModifiedEqualRow = (row: BoletaDigitalOt): boolean => {
  return row.previamenteModificada && isEqualRow(row)
}

const isEditedRow = (row: BoletaDigitalOt): boolean => row.previamenteModificada

const canMarkTodoOk = (row: BoletaDigitalOt): boolean => {
  return !row.todoOk && (isEqualRow(row) || isEditedRow(row))
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

const formatDetailValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const formatDetailLabel = (key: string): string => key.replace(/_/g, ' ')

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
  const { validateFileSize, FileSizeLimitModal } = useFileSizeLimitModal()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'iguales' | 'diferentes' | 'sin_pdf' | 'imagenes' | 'editados'>('all')
  const [fechaInicio, setFechaInicio] = useState(defaultFechaInicio)
  const [fechaFin, setFechaFin] = useState(defaultFechaFin)
  const [fechaRangeError, setFechaRangeError] = useState(false)
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [selectedDetailRow, setSelectedDetailRow] = useState<BoletaDigitalOt | null>(null)
  const [selectedUploadRow, setSelectedUploadRow] = useState<BoletaDigitalOt | null>(null)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadRenameError, setUploadRenameError] = useState<string | null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open: boolean
    status: 'choose' | 'confirm' | 'rename' | 'loading' | 'error'
    message: string
  }>({ open: false, status: 'loading', message: '' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const hasValidDateRange = Boolean(fechaInicio && fechaFin && fechaInicio <= fechaFin)

  const syncHorizontalScroll = (source: 'top' | 'table') => {
    const tableScroll = tableScrollRef.current
    const horizontalScroll = horizontalScrollRef.current
    if (!tableScroll || !horizontalScroll) return

    if (source === 'top' && tableScroll.scrollLeft !== horizontalScroll.scrollLeft) {
      tableScroll.scrollLeft = horizontalScroll.scrollLeft
    }
    if (source === 'table' && horizontalScroll.scrollLeft !== tableScroll.scrollLeft) {
      horizontalScroll.scrollLeft = tableScroll.scrollLeft
    }
  }

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
      editados: rows.filter(isEditedRow).length,
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
        if (statusFilter === 'editados') return isEditedRow(row)
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
    setUploadModal({ open: true, status: 'choose', message: '' })
  }

  const chooseNewUpload = () => {
    if (!selectedUploadRow || !fileInputRef.current) return
    fileInputRef.current.accept = isImageRow(selectedUploadRow) ? '.jpg,.jpeg,.png,.webp,image/*' : 'application/pdf,.pdf'
    fileInputRef.current.value = ''
    setUploadModal({ open: false, status: 'loading', message: '' })
    fileInputRef.current.click()
  }

  const chooseRenameUpload = () => {
    if (!selectedUploadRow) return
    setUploadFileName(getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot))
    setUploadRenameError(null)
    setUploadModal({ open: true, status: 'rename', message: '' })
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
    if (!validateFileSize(file)) {
      setSelectedUploadRow(null)
      return
    }
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

  const confirmRenameUpload = () => {
    if (!selectedUploadRow?.id) {
      closeUploadModal()
      return
    }
    const currentName = getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot)
    const finalName = ensureUploadExtension(uploadFileName, getFileExtension(currentName, isImageRow(selectedUploadRow) ? '.png' : '.pdf'))
    if (!finalName) {
      setUploadRenameError('Ingrese el nombre del archivo.')
      return
    }
    if (finalName.includes('/') || finalName.includes('\\')) {
      setUploadRenameError('El nombre no debe incluir carpetas ni barras.')
      return
    }
    const key = `${selectedUploadRow.id}-rename`
    setLoadingKey(key)
    setUploadRenameError(null)
    setUploadModal({ open: true, status: 'loading', message: 'Cambiando nombre del archivo...' })
    void renameBoletaDigitalArchivo(selectedUploadRow.id, finalName)
      .then(async () => {
        await otsQuery.refetch()
        closeUploadModal()
      })
      .catch(async (error) => {
        setUploadModal({ open: true, status: 'error', message: await getBoletaDigitalErrorMessage(error, 'No se pudo cambiar el nombre del archivo.') })
      })
      .finally(() => setLoadingKey((current) => (current === key ? null : current)))
  }

  return (
    <div className="bento-page sup-v2-fs max-w-full gap-2 overflow-x-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept={selectedUploadRow && isImageRow(selectedUploadRow) ? '.jpg,.jpeg,.png,.webp,image/*' : 'application/pdf,.pdf'}
        className="hidden"
        onChange={handleReplacementFileChange}
      />
      <Modal
        compactText
        open={uploadModal.open}
        title={
          uploadModal.status === 'choose'
            ? 'Cambiar archivo'
            : uploadModal.status === 'confirm' || uploadModal.status === 'rename'
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
          uploadModal.status === 'choose' ? (
            <Button type="button" variant="secondary" onClick={closeUploadModal}>
              Cancelar
            </Button>
          ) : uploadModal.status === 'confirm' ? (
            <>
              <Button type="button" variant="secondary" onClick={closeUploadModal}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmReplacementUpload}>
                <FontAwesomeIcon icon={faUpload} />
                <span>Subir archivo</span>
              </Button>
            </>
          ) : uploadModal.status === 'rename' ? (
            <>
              <Button type="button" variant="secondary" onClick={closeUploadModal}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmRenameUpload} disabled={Boolean(loadingKey)}>
                Cambiar nombre
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
        {uploadModal.status === 'choose' ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Nombre de archivo esperado</p>
              <p className="break-all text-xs font-bold text-slate-900">
                {selectedUploadRow && isImageRow(selectedUploadRow)
                  ? getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot)
                  : getExpectedPdfFileName(selectedUploadRow) || '-'}
              </p>
            </div>
            <p className="text-slate-600">Selecciona qué deseas hacer con el archivo actual.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={chooseNewUpload}>
                <FontAwesomeIcon icon={faUpload} />
                <span>Subir archivo nuevo</span>
              </Button>
              <Button type="button" variant="secondary" onClick={chooseRenameUpload}>
                <span>Cambiar nombre de archivo existente</span>
              </Button>
            </div>
          </div>
        ) : uploadModal.status === 'confirm' ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">
                {selectedUploadRow && isImageRow(selectedUploadRow) ? 'Archivo actual:' : 'Nombre de archivo esperado:'}
              </p>
              <p className="break-all text-xs font-bold text-slate-900">
                {selectedUploadRow && isImageRow(selectedUploadRow) ? getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot) : getExpectedPdfFileName(selectedUploadRow) || '-'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
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
        ) : uploadModal.status === 'rename' ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Nombre esperado</p>
              <p className="break-all text-xs font-bold text-slate-900">
                {selectedUploadRow && isImageRow(selectedUploadRow)
                  ? getFileName(selectedUploadRow.rutaPdf, selectedUploadRow.ot)
                  : getExpectedPdfFileName(selectedUploadRow) || '-'}
              </p>
            </div>
            <p className="text-slate-600">El archivo actual se conservará; solo se cambiará su nombre y la ruta registrada.</p>
            <Field label="Nuevo nombre del archivo">
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
            {uploadRenameError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{uploadRenameError}</div> : null}
          </div>
        ) : uploadModal.status === 'loading' ? (
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
            <span>{uploadModal.message}</span>
          </div>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {uploadModal.message || 'No coincide el nombre del PDF.'}
          </div>
        )}
      </Modal>
      <FileSizeLimitModal />
      <Modal
        compactText
        open={Boolean(selectedDetailRow)}
        title={`Detalle de boleta ${selectedDetailRow?.id || selectedDetailRow?.ot || ''}`}
        onClose={() => setSelectedDetailRow(null)}
        actions={
          <Button type="button" variant="secondary" onClick={() => setSelectedDetailRow(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedDetailRow ? (
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2 sm:grid-cols-3">
              <p><span className="block text-[10px] font-bold uppercase text-slate-500">Id venta</span><span className="font-bold text-slate-900">{selectedDetailRow.id || '-'}</span></p>
              <p><span className="block text-[10px] font-bold uppercase text-slate-500">Cliente</span><span className="font-normal text-slate-900">{selectedDetailRow.cliente || '-'}</span></p>
              <p><span className="block text-[10px] font-bold uppercase text-slate-500">OT</span><span className="font-bold text-slate-900">{selectedDetailRow.ot || '-'}</span></p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(selectedDetailRow.raw).map(([key, value]) => (
                <div key={key} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[10px] font-medium uppercase text-slate-500">{formatDetailLabel(key)}</p>
                  <p className="break-words font-semibold text-slate-800">{formatDetailValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
      <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <h2 className="truncate page-title">Verificación Boleta Digital</h2>
            <p className="truncate text-slate-500">Registros operativos físicos contra digitales, región Santa Cruz.</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter((current) => (current === 'iguales' ? 'all' : 'iguales'))}
              className={`min-w-[54px] rounded-lg border px-1.5 py-1 text-center transition sm:min-w-[68px] sm:px-2.5 border-emerald-100 bg-emerald-50/70 ${statusFilter === 'iguales' ? 'ring-2 ring-blue-300' : ''}`}
            >
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-emerald-700">Iguales</p>
              <p className="text-base font-extrabold leading-none text-emerald-600">{statusSummary.iguales}</p>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((current) => (current === 'diferentes' ? 'all' : 'diferentes'))}
              className={`min-w-[54px] rounded-lg border px-1.5 py-1 text-center transition sm:min-w-[68px] sm:px-2.5 border-rose-100 bg-rose-50/70 ${statusFilter === 'diferentes' ? 'ring-2 ring-blue-300' : ''}`}
            >
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-rose-700">Diferentes</p>
              <p className="text-base font-extrabold leading-none text-rose-600">{statusSummary.diferentes}</p>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((current) => (current === 'sin_pdf' ? 'all' : 'sin_pdf'))}
              className={`min-w-[54px] rounded-lg border px-1.5 py-1 text-center transition sm:min-w-[68px] sm:px-2.5 border-amber-100 bg-amber-50/70 ${statusFilter === 'sin_pdf' ? 'ring-2 ring-blue-300' : ''}`}
            >
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-amber-700">Sin PDF</p>
              <p className="text-base font-extrabold leading-none text-amber-600">{statusSummary.sinPdf}</p>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((current) => (current === 'imagenes' ? 'all' : 'imagenes'))}
              className={`min-w-[54px] rounded-lg border px-1.5 py-1 text-center transition sm:min-w-[68px] sm:px-2.5 border-sky-100 bg-sky-50/70 ${statusFilter === 'imagenes' ? 'ring-2 ring-blue-300' : ''}`}
            >
              <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide text-sky-700">Imagen</p>
              <p className="text-base font-extrabold leading-none text-sky-600">{statusSummary.imagenes}</p>
            </button>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-1 overflow-x-auto border-t border-slate-200 px-2 py-1.5 sm:px-3">
          {[
            { id: 'all', label: 'Todos', count: rows.length },
            { id: 'iguales', label: 'Iguales', count: statusSummary.iguales },
            { id: 'diferentes', label: 'Diferentes', count: statusSummary.diferentes },
            { id: 'sin_pdf', label: 'Sin PDF', count: statusSummary.sinPdf },
            { id: 'imagenes', label: 'Con imagen', count: statusSummary.imagenes },
            { id: 'editados', label: 'Editados', count: statusSummary.editados },
          ].map((tab) => {
            const active = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-2.5 py-1.5 text-xs font-bold transition ${active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <details className="group border-t border-slate-200 px-2 py-1 sm:px-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
            <span className="group-open:hidden">Mostrar filtros</span>
            <span className="hidden group-open:inline">Ocultar filtros</span>
            <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="flex flex-wrap items-end gap-2 pb-1 pt-1.5">
            <label className="flex w-36 flex-col gap-0.5 font-medium text-slate-500">
              Desde
              <input
                className={`h-8 w-full rounded-md bg-slate-100 px-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-100 ${fechaRangeError && !fechaInicio ? 'ring-1 ring-rose-300 bg-rose-50' : ''}`}
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
              />
            </label>
            <label className="flex w-36 flex-col gap-0.5 font-medium text-slate-500">
              Hasta
              <input
                className={`h-8 w-full rounded-md bg-slate-100 px-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-100 ${fechaRangeError && !fechaFin ? 'ring-1 ring-rose-300 bg-rose-50' : ''}`}
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
              />
            </label>
            <label className="flex min-w-[14rem] flex-1 flex-col gap-0.5 font-medium text-slate-500 sm:max-w-sm">
              Buscar
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-8 w-full rounded-md bg-slate-100 pl-8 pr-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por OT, ID cliente, nombre..."
                />
              </div>
            </label>
            <Button
              type="button"
              variant="secondary"
              className="h-8"
              onClick={() => {
                setFechaInicio(defaultFechaInicio)
                setFechaFin(defaultFechaFin)
                setSearch('')
                setStatusFilter('all')
              }}
            >
              <span>Limpiar</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-8"
              onClick={() => otsQuery.refetch()}
              disabled={otsQuery.isFetching || !hasValidDateRange}
            >
              <FontAwesomeIcon icon={faSearch} />
              <span>{otsQuery.isFetching ? 'Aplicando...' : 'Aplicar'}</span>
            </Button>
            {canExportExcel ? (
              <Button type="button" variant="secondary" className="h-8" onClick={() => void exportarExcel()} disabled={exportandoExcel}>
                <FontAwesomeIcon icon={faFileExcel} />
                <span>{exportandoExcel ? 'Exportando...' : 'Exportar'}</span>
              </Button>
            ) : null}
          </div>
        </details>

        {!hasValidDateRange ? (
          <div className="m-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            Selecciona un rango de fechas valido para cargar las boletas.
          </div>
        ) : null}

        {otsQuery.isError ? (
          <div className="m-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {getApiErrorMessage(otsQuery.error, 'No se pudo cargar el listado.')}
          </div>
        ) : null}

        {actionError ? (
          <div className="m-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
            {actionError}
          </div>
        ) : null}

        <div className="hidden items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 md:flex">
          <span className="shrink-0 font-semibold uppercase tracking-wide">Desplazamiento horizontal</span>
          <div
            ref={horizontalScrollRef}
            className="min-w-0 flex-1 overflow-x-scroll overflow-y-hidden rounded-md border border-slate-200 bg-white"
            onScroll={() => syncHorizontalScroll('top')}
            aria-label="Desplazamiento horizontal de la tabla"
          >
            <div className="h-2 min-w-[900px]" />
          </div>
          <span className="hidden shrink-0 sm:inline">Mueve la tabla de izquierda a derecha</span>
        </div>

        <div ref={tableScrollRef} onScroll={() => syncHorizontalScroll('table')} className="hidden max-h-[68vh] max-w-full overflow-x-auto overflow-y-auto md:block">
          <table className="w-full min-w-[900px] table-fixed divide-y divide-slate-200 leading-tight">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#f4f6f8] text-[10px] uppercase text-slate-600 shadow-sm">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Id historial</th>
                <th className="px-2 py-1.5 text-left font-semibold">Cliente</th>
                <th className="px-2 py-1.5 text-left font-semibold">Tecnico</th>
                <th className="px-2 py-1.5 text-left font-semibold">Fecha / OT fisica</th>
                <th className="px-2 py-1.5 text-left font-semibold">Estado</th>
                <th className="px-2 py-1.5 text-left font-semibold">Comparacion</th>
                <th className="px-2 py-1.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otsQuery.isLoading ? (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={7}>Cargando boletas...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={7}>
                    <p className="text-sm font-bold uppercase text-slate-700">NO HAY DATOS PARA LA FECHA</p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const isDifferent = isDifferentRow(row)
                  const canReplace = canReplacePdf(row)
                  const canValidateTodoOk = canMarkTodoOk(row)
                  const canOpenPdf = canOpenBoletaFile(row)
                  const comparisonBadge = getComparisonBadge(row)
                  return (
                  <tr key={`${row.id || row.ot || row.rutaPdf}-${index}`} className={`align-top ${isDifferent ? 'bg-rose-50' : ''}`}>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                      <span className="font-semibold text-rose-600">{getIdBoCitaHistorial(row) || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-900">
                      <div className="min-w-0">
                        <div className="truncate font-normal text-slate-900" title={row.cliente}>{row.cliente || '-'}</div>
                        <div className="truncate font-normal text-slate-900" title={row.ot}>{row.ot || '-'}</div>
                      </div>
                    </td>
                    <td className="truncate px-2 py-1.5 text-slate-700" title={row.tecnico}>{row.tecnico || '-'}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700"><span className="block">{formatBoletaFecha(row.fecha)}</span><span className="text-[10px] text-slate-500">OTF: {row.otFisica || '-'}</span></td>
                    <td className="truncate px-2 py-1.5 text-slate-700" title={row.estado}><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{row.estado || '-'}</span></td>
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
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <div className="flex min-w-[150px] justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-indigo-300 text-[11px] text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                          onClick={() => setSelectedDetailRow(row)}
                          title="Ver detalle"
                          aria-label="Ver detalle"
                        >
                          <FontAwesomeIcon icon={faList} />
                        </button>
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
              const comparisonBadge = getComparisonBadge(row)
              return (
                <article key={`${row.id || row.ot || row.rutaPdf}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Orden trabajo</p>
                        <p className="break-words text-lg font-extrabold text-slate-900">#{row.ot || '-'}</p>
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
                    <p className="mt-1 break-words text-sm font-normal text-black">{row.cliente || '-'} · {row.tecnico || '-'}</p>
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
                        <span className="block text-sm font-normal text-black">{row.cliente || '-'}</span>
                        <span className="block text-sm font-normal text-black">{row.ot || '-'}</span>
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
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3">
                    <Button type="button" variant="secondary" className="col-span-2 min-h-11 px-3 text-indigo-700" onClick={() => setSelectedDetailRow(row)}>
                      <FontAwesomeIcon icon={faList} />
                      <span>Ver detalle</span>
                    </Button>
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
