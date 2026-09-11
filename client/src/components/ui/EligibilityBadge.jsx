// Eligibility Badge Component: Shows eligibility status with reason text.
// Per design.md §7: Eligible = success (green), Not Eligible = danger (red)
// Reasons displayed as tooltip/text for ineligible drives.
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'
import Badge from './Badge.jsx'

/**
 * Eligibility Badge - displays eligibility status with color-coded badge
 * and expandable reason text for ineligible drives.
 *
 * @param {Object} props
 * @param {boolean|null} props.eligible - true=eligible, false=ineligible, null=not computed
 * @param {string[]} props.reasons - Array of reason codes (from INELIGIBILITY_REASONS)
 * @param {string[]} props.reasonMessages - Human-readable messages for reasons
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.showReasons - Whether to show reason text (default: true)
 * @param {string} props.className - Additional CSS classes
 */
export default function EligibilityBadge({
  eligible,
  reasons = [],
  reasonMessages = [],
  size = 'md',
  showReasons = true,
  className = '',
}) {
  if (eligible === null || eligible === undefined) {
    return (
      <Badge tone="neutral" size={size} className={className}>
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3" aria-hidden="true" />
          <span>Eligibility Unknown</span>
        </span>
      </Badge>
    )
  }

  if (eligible) {
    return (
      <Badge tone="success" size={size} className={className}>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          <span>Eligible</span>
        </span>
      </Badge>
    )
  }

  // Not eligible - show danger badge with reasons
  const reasonText =
    reasonMessages.length > 0
      ? reasonMessages.join(', ')
      : reasons.length > 0
        ? reasons.map((r) => r.replace(/_/g, ' ')).join(', ')
        : 'Not eligible'

  return (
    <div className={`inline-flex ${className}`}>
      <Badge tone="danger" size={size}>
        <span className="flex items-center gap-1">
          <XCircle className="w-3 h-3" aria-hidden="true" />
          <span>Not Eligible</span>
        </span>
      </Badge>

      {showReasons && reasons.length > 0 && (
        <div className="ml-2 text-xs text-ink-500 max-w-xs">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{reasonText}</span>
          </span>
        </div>
      )}
    </div>
  )
}
