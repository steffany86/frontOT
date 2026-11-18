import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  compact?: boolean
  /** Marca el campo en rojo (campo obligatorio sin llenar). */
  invalid?: boolean
}

const Field = ({ label, hint, error, children, compact = false, invalid = false }: FieldProps) => {
  return (
    <label className={`flex w-full min-w-0 flex-col text-sm text-slate-700 ${compact ? 'gap-1.5' : 'gap-2'} ${invalid ? 'field-invalid' : ''}`}>
      <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold uppercase tracking-wide ${invalid ? 'text-rose-600' : 'text-slate-500'}`}>{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="text-xs font-semibold text-rose-600">{error}</span> : null}
    </label>
  )
}

export default Field
