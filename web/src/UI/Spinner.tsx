import type { HTMLAttributes } from 'react'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

export default function Spinner({ size = 20, className, style, ...props }: SpinnerProps) {
  const s: React.CSSProperties = { width: size, height: size, borderColor: 'var(--color-primary-500)', ...(style || {}) }
  return (
    <div className={[
      'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
      className || '',
    ].join(' ')} style={s} {...props} />
  )
}
