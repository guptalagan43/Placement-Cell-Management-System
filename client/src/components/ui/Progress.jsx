import { cn } from '../../lib/cn.js'

export default function Progress({ value = 0, max = 100, className, ...props }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-neutral-bg', className)}
      {...props}
    >
      <div
        className="h-full bg-primary-700 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
