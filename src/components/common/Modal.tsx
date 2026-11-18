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
  /** Letra de 11px en todo el modal (contenido y botones). */
  compactText?: boolean
  fullScreenMobile?: boolean
}

const Modal = ({
  open,
  title,
  children,
  onClose,
  actions,
  containerClassName,
  maxWidthClass,
  contentClassName,
  compactText = false,
  fullScreenMobile = false
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
      style={{ height: '100dvh', minHeight: '100svh', WebkitOverflowScrolling: 'touch' }}
    >
      <div className={`flex min-h-full items-start justify-center sm:items-center sm:p-6 ${fullScreenMobile ? "p-0" : "p-1"}`}>
        <div
          className={`${compactText ? "sup-v2-fs " : ""}bento-modal flex max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden border-0 p-2 sm:max-h-[calc(100svh-2rem)] sm:rounded-2xl sm:border ${compactText ? "sm:p-3" : "sm:p-4"} ${containerClassName ?? maxWidthClass ?? "max-w-lg"} ${fullScreenMobile ? "max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:pt-[max(0.5rem,env(safe-area-inset-top))]" : ""}`}
        >
          <div className={`flex items-center justify-between border-b border-slate-200/80 ${compactText ? "pb-1.5" : "pb-2 sm:pb-3"}`}>
            <h3 className={compactText ? "text-sm font-semibold text-slate-900" : "text-base font-semibold text-slate-900 sm:text-lg"}>{title}</h3>
            <button className="text-slate-400 transition hover:text-slate-700" onClick={onClose} type="button">
              x
            </button>
          </div>
          <div className="mt-1 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0 sm:mt-2 sm:pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={`text-sm text-slate-600 ${contentClassName ?? ''}`.trim()}>{children}</div>
          </div>
          {actions ? <div className="mt-3 flex shrink-0 justify-end gap-3 border-t border-slate-200/80 pt-3 sm:mt-4">{actions}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
