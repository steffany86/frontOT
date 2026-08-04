import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  open: boolean
  src: string
  alt?: string
  onClose: () => void
}

const ImageLightbox = ({ open, src, alt, onClose }: ImageLightboxProps) => {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-950/85 p-3 sm:p-6" onClick={onClose}>
      <div className="flex h-full w-full items-center justify-center">
        <img
          src={src}
          alt={alt ?? 'Imagen ampliada'}
          className="max-h-[92dvh] w-auto max-w-full rounded-xl border border-white/15 object-contain shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>,
    document.body
  )
}

export default ImageLightbox

