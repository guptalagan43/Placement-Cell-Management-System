import { cn } from '../../lib/cn.js'

// Base component for the design.md §6 "badge / status pill": fully rounded with
// a semantic color pairing from §3.3. Callers always pass a text label so the
// badge never conveys state by color alone (§11 accessibility).
const tones = {
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  warning: 'bg-warning-bg text-warning-text',
  neutral: 'bg-neutral-bg text-neutral-text',
  info: 'bg-info-bg text-info-text',
}

export default function Badge({ tone = 'neutral', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 font-body text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
