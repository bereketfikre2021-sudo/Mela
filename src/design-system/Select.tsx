import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from './cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  helperText?: string
  error?: string
  options: SelectOption[]
  /** Renders a disabled, empty placeholder option. */
  placeholder?: string
}

/**
 * A styled native <select>. Native selects give the best, most familiar
 * experience on mobile (Android) and are accessible by default.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, error, options, placeholder, id, className, ...props },
  ref
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const helperId = `${selectId}-helper`
  const errorId = `${selectId}-error`
  const describedBy = error ? errorId : helperText ? helperId : undefined

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full appearance-none rounded-md border bg-surface px-3 pr-9 text-sm text-text',
            error ? 'border-danger' : 'border-border',
            className
          )}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
