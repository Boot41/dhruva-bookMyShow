import type { HTMLAttributes } from 'react'

export function Card({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'rounded-xl border shadow-sm',
        className || '',
      ].join(' ')}
      style={{
        background: 'white',
        borderColor: 'var(--color-secondary-200)',
        color: 'var(--color-secondary-800)',
        ...(style || {}),
      }}
      {...props}
    />
  )
}

export function CardHeader({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'px-4 py-3 border-b flex items-center gap-3',
        className || '',
      ].join(' ')}
      style={{ borderColor: 'var(--color-secondary-100)', ...(style || {}) }}
      {...props}
    />
  )
}

export function CardTitle({ className, style, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={[
        'text-base font-semibold',
        className || '',
      ].join(' ')}
      style={{ color: 'var(--color-secondary-900)', ...(style || {}) }}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[
      'px-4 py-4',
      className || '',
    ].join(' ')} {...props} />
  )
}

export function CardFooter({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'px-4 py-3 border-t flex items-center justify-end gap-3',
        className || '',
      ].join(' ')}
      style={{ borderColor: 'var(--color-secondary-100)', ...(style || {}) }}
      {...props}
    />
  )
}
