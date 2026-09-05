import { cn } from '../../lib/cn.js'

// Base surface container using the design.md §5 card radius (16px) and border.
// `elevated` swaps the resting shadow for the raised shadow used by
// hover-elevated cards, dropdowns and modals.
export default function Card({ elevated = false, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-5',
        elevated ? 'shadow-raised' : 'shadow-card',
        className
      )}
      {...props}
    />
  )
}
