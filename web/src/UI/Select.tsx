import type { SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Select({ label, helperText, error, className, children, id, ...props }: SelectProps) {
  const selectId = id || props.name
  return (
    <label className="form-group">
      {label && <span className="label">{label}</span>}
      <select id={selectId} className={cn('select', error && 'is-invalid', className)} {...props}>
        {children}
      </select>
      {helperText && !error && <span className="help-text">{helperText}</span>}
      {error && <span className="error-text">{error}</span>}
    </label>
  )
}
