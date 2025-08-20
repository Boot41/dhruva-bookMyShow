import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'info'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const base = 'btn'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  success: 'btn-success',
  warning: 'btn-warning',
  info: 'btn-info',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {leftIcon && <span className="-ml-1 flex items-center">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="-mr-1 flex items-center">{rightIcon}</span>}
    </button>
  )
}
