import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from './cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Helper text shown below the field. */
  helperText?: string
  /** Error message; switches the field to the error state and sets aria-invalid. */
  error?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, leadingIcon, trailingIcon, id, className, ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const describedBy = [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 flex text-muted" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-md border bg-surface px-3 text-sm text-text placeholder:text-muted',
            leadingIcon && 'pl-10',
            trailingIcon && 'pr-10',
            error ? 'border-danger' : 'border-border',
            className
          )}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute right-3 flex text-muted" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
