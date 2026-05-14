import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  actions?: ReactNode
  containerClassName?: string
  maxWidthClass?: string
  contentClassName?: string
}

const Modal = ({
  open,
  title,
  children,
  onClose,
  actions,
  containerClassName,
  maxWidthClass,
  contentClassName
}: ModalProps) => {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/45 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          className={`bento-modal max-h-[calc(100dvh-2rem)] overflow-auto ${containerClassName ?? maxWidthClass ?? 'max-w-lg'}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button className="text-slate-400 transition hover:text-slate-700" onClick={onClose} type="button">
              x
            </button>
          </div>
          <div className={`mt-4 text-sm text-slate-600 ${contentClassName ?? ''}`.trim()}>{children}</div>
          {actions ? <div className="mt-6 flex justify-end gap-3">{actions}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
