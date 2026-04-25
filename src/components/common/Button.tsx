import type { ButtonHTMLAttributes } from 'react'

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

const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  return <button className={`${variantClasses[variant]} ${className}`} {...props} />
}

export default Button
