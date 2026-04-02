import type { ReactNode } from 'react'

interface FormCardProps {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}

const FormCard = ({ title, description, children, actions }: FormCardProps) => {
  const hasHeader = Boolean(title || description || actions)

  return (
    <div className="glass-panel p-4 sm:p-5">
      {hasHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? <h3 className="text-xl font-semibold text-slate-900">{title}</h3> : null}
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <div className={hasHeader ? 'mt-6' : ''}>{children}</div>
    </div>
  )
}

export default FormCard
