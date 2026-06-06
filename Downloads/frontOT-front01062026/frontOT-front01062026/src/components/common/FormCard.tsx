import type { ReactNode } from 'react'

interface FormCardProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  hideHeader?: boolean
  compact?: boolean
}

const FormCard = ({ title, description, children, actions, hideHeader = false, compact = false }: FormCardProps) => {
  const showHeader = !hideHeader
  return (
    <div className={`glass-panel ${compact ? 'p-3 sm:p-4' : 'p-6 sm:p-7'}`}>
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex w-full items-center gap-3 sm:w-auto">{actions}</div> : null}
        </div>
      ) : null}
      <div className={showHeader ? 'mt-6' : ''}>{children}</div>
    </div>
  )
}

export default FormCard
