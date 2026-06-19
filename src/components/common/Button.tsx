import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost:
    'inline-flex items-center justify-center rounded-2xl border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white',
}

const normalizeChildren = (children: ReactNode): ReactNode => {
  return Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      // Evita nodos de texto directos en <button>; algunos traductores/extensiones
      // mutan esos nodos y pueden disparar NotFoundError al desmontar.
      return <span>{child}</span>
    }
    if (isValidElement(child)) {
      return child
    }
    return child
  })
}

const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const { children, ...rest } = props
  return (
    <button className={`${variantClasses[variant]} ${className}`} {...rest}>
      {normalizeChildren(children)}
    </button>
  )
}

export default Button
