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
    <div
      className="fixed inset-0 z-[200] pointer-events-auto overflow-y-auto bg-slate-900/45 backdrop-blur-sm"
      style={{ height: '100vh', minHeight: '100svh', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex min-h-full items-start justify-center p-1 sm:items-center sm:p-6">
        <div
          className={`bento-modal flex max-h-[calc(100vh-0.5rem)] flex-col overflow-hidden border-0 p-2 sm:max-h-[calc(100svh-2rem)] sm:rounded-2xl sm:border sm:p-4 ${containerClassName ?? maxWidthClass ?? 'max-w-lg'}`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-3">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
            <button className="text-slate-400 transition hover:text-slate-700" onClick={onClose} type="button">
              x
            </button>
          </div>
          <div className="mt-1 overflow-y-auto pr-0 sm:mt-2 sm:pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={`text-sm text-slate-600 ${contentClassName ?? ''}`.trim()}>{children}</div>
            {actions ? <div className="mt-6 flex justify-end gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
