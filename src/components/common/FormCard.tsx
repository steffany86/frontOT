import type { ReactNode } from 'react'

interface FormCardProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}

const FormCard = ({ title, description, children, actions }: FormCardProps) => {
  return (
    <div className="glass-panel p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  )
}

export default FormCard
