import { useEffect, useState } from 'react'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '20 MB'

type RejectedFile = {
  name: string
  size: number
  previewUrl: string | null
}

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const useFileSizeLimitModal = () => {
  const [rejectedFile, setRejectedFile] = useState<RejectedFile | null>(null)

  useEffect(() => {
    return () => {
      if (rejectedFile?.previewUrl) {
        URL.revokeObjectURL(rejectedFile.previewUrl)
      }
    }
  }, [rejectedFile])

  const closeFileSizeLimitModal = () => {
    setRejectedFile((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return null
    })
  }

  const validateFileSize = (file: File | null | undefined): file is File => {
    if (!file) return false
    if (file.size <= MAX_UPLOAD_BYTES) return true
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setRejectedFile((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return {
        name: file.name || 'archivo',
        size: file.size,
        previewUrl,
      }
    })
    return false
  }

  const FileSizeLimitModal = () => (
    <Modal
      open={Boolean(rejectedFile)}
      title="Archivo demasiado pesado"
      onClose={closeFileSizeLimitModal}
      maxWidthClass="max-w-lg"
      actions={
        <Button type="button" onClick={closeFileSizeLimitModal}>
          Entendido
        </Button>
      }
    >
      <div className="space-y-4">
        {rejectedFile?.previewUrl ? (
          <img
            src={rejectedFile.previewUrl}
            alt={rejectedFile.name}
            className="max-h-72 w-full rounded-xl border border-slate-200 bg-slate-100 object-contain"
          />
        ) : null}
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          <p className="font-semibold">No se puede guardar esta imagen o archivo porque pesa mas de {MAX_UPLOAD_LABEL}.</p>
          <p className="mt-2 break-all text-xs text-rose-600">
            {rejectedFile?.name || 'archivo'} {rejectedFile ? `- ${formatFileSize(rejectedFile.size)}` : ''}
          </p>
        </div>
      </div>
    </Modal>
  )

  return { validateFileSize, FileSizeLimitModal }
}
