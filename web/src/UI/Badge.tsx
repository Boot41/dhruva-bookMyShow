import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'default' | 'primary' | 'success' | 'info'

const styles: Record<BadgeVariant, string> = {
  default: 'badge',
  primary: 'badge badge-primary',
  success: 'badge badge-success',
  info: 'badge badge-info',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export default function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span className={[styles[variant], className || ''].join(' ')} {...props} />
  )
}
