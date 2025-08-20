import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Input({ label, helperText, error, className, id, ...props }: InputProps) {
  const inputId = id || props.name
  return (
    <label className="form-group">
      {label && <span className="label">{label}</span>}
      <input id={inputId} className={cn('input', error && 'is-invalid', className)} {...props} />
      {helperText && !error && <span className="help-text">{helperText}</span>}
      {error && <span className="error-text">{error}</span>}
    </label>
  )}
