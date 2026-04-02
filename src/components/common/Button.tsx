import type { ButtonHTMLAttributes } from 'react'
import { forwardRef } from 'react'

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

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', className = '', ...props }, ref) => {
  return <button ref={ref} className={`${variantClasses[variant]} ${className}`} {...props} />
})

export default Button
