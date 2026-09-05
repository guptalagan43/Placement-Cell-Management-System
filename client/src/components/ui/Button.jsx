import { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'

// Base component for the design.md §6 button patterns. Variants map to the
// primary / secondary-outline / danger patterns; the disabled state uses the
// §6 "disabled/muted" treatment (primary-100 fill, primary-700 text, reduced
// opacity) for the primary variant and dimming for the others. `fullWidth`
// covers the §6 note that the primary button is full-width inside forms.
const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed'

const variants = {
  primary:
    'bg-primary-700 text-white hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-700 disabled:opacity-70',
  outline:
    'border border-primary-700 bg-transparent text-primary-700 hover:bg-primary-50 disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
}

const Button = forwardRef(function Button(
  { variant = 'primary', fullWidth = false, className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], fullWidth && 'w-full', className)}
      {...props}
    />
  )
})

export default Button
