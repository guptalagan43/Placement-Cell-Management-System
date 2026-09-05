import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn.js'

// Base labelled text input following design.md §6: 8px (or full, via `pill`)
// radius, subtle border, optional left-aligned icon for the search pattern, and
// muted placeholder. Forwards its ref so React Hook Form can register it
// directly in later phases. Renders a field-level error in `danger` when set,
// wiring aria-invalid / aria-describedby for accessibility.
const Input = forwardRef(function Input(
  { label, id, error, icon, pill = false, className, type = 'text', ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="font-body text-sm font-semibold text-ink-900">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'w-full border bg-surface px-3 py-2 font-body text-sm text-ink-900 placeholder:text-ink-400',
            'focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20',
            'disabled:cursor-not-allowed disabled:bg-neutral-bg disabled:text-ink-400',
            pill ? 'rounded-pill' : 'rounded-md',
            icon && 'pl-9',
            error ? 'border-danger' : 'border-border',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="font-body text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
