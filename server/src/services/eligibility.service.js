// Eligibility Engine Service: Pure, stateless rule-evaluation logic.
// Compares a student profile snapshot against a drive's eligibility criteria.
// Returns { eligible: boolean, reasons: string[] }.
// Traces to FR-ELG-01, FR-ELG-05, srs.md §8.

/**
 * Reasons for ineligibility (machine-readable codes for frontend branching)
 * Includes academic criteria (Phase 26) and business rules (Phase 27).
 */
export const INELIGIBILITY_REASONS = {
  // Academic criteria (Phase 26)
  BLACKLISTED: 'BLACKLISTED',
  BRANCH_NOT_ELIGIBLE: 'BRANCH_NOT_ELIGIBLE',
  BATCH_NOT_ELIGIBLE: 'BATCH_NOT_ELIGIBLE',
  CGPA_BELOW_MINIMUM: 'CGPA_BELOW_MINIMUM',
  BACKLOGS_EXCEED_MAXIMUM: 'BACKLOGS_EXCEED_MAXIMUM',
  TENTH_BELOW_MINIMUM: 'TENTH_BELOW_MINIMUM',
  TWELFTH_BELOW_MINIMUM: 'TWELFTH_BELOW_MINIMUM',
  // Business rules (Phase 27)
  ONE_OFFER_RULE: 'ONE_OFFER_RULE',
  TIER_LOCK_RULE: 'TIER_LOCK_RULE',
}

/**
 * Human-readable messages for each reason code
 */
const REASON_MESSAGES = {
  [INELIGIBILITY_REASONS.BLACKLISTED]: 'Student is blacklisted',
  [INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE]: 'Branch not eligible for this drive',
  [INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE]: 'Batch not eligible for this drive',
  [INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM]: 'CGPA below minimum requirement',
  [INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM]: 'Active backlogs exceed maximum allowed',
  [INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM]: '10th percentage below minimum requirement',
  [INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM]: '12th percentage below minimum requirement',
  [INELIGIBILITY_REASONS.ONE_OFFER_RULE]: 'Student already placed (One-Offer Rule)',
  [INELIGIBILITY_REASONS.TIER_LOCK_RULE]:
    'Cannot apply to equal or lower tier drive (Tier-Lock Rule)',
}

/**
 * Get human-readable message for a reason code
 * @param {string} code - Reason code from INELIGIBILITY_REASONS
 * @returns {string} Human-readable message
 */
export function getReasonMessage(code) {
  return REASON_MESSAGES[code] || 'Ineligible'
}

/**
 * Checks if a student's branch is in the drive's eligible branches
 * @param {string} studentBranch - Student's branch (from DEPARTMENTS)
 * @param {string[]} driveBranches - Array of eligible branches from drive criteria
 * @returns {boolean}
 */
function checkBranch(studentBranch, driveBranches) {
  return driveBranches.includes(studentBranch)
}

/**
 * Checks if a student's batch is in the drive's eligible batches
 * @param {number} studentBatch - Student's batch year
 * @param {number[]} driveBatches - Array of eligible batch years from drive criteria
 * @returns {boolean}
 */
function checkBatch(studentBatch, driveBatches) {
  return driveBatches.includes(studentBatch)
}

/**
 * Checks if student's CGPA meets the drive's minimum
 * @param {number|null} studentCgpa - Student's overall CGPA (0-10)
 * @param {number} driveMinCgpa - Drive's minimum CGPA requirement
 * @returns {boolean}
 */
function checkCgpa(studentCgpa, driveMinCgpa) {
  if (studentCgpa === null || studentCgpa === undefined) {
    return false
  }
  return studentCgpa >= driveMinCgpa
}

/**
 * Checks if student's active backlogs are within the drive's maximum
 * @param {number} studentBacklogs - Student's active backlog count
 * @param {number} driveMaxBacklogs - Drive's maximum allowed backlogs
 * @returns {boolean}
 */
function checkBacklogs(studentBacklogs, driveMaxBacklogs) {
  return studentBacklogs <= driveMaxBacklogs
}

/**
 * Checks if student's 10th percentage meets the drive's minimum
 * @param {number|null} studentTenthPercent - Student's 10th percentage (0-100)
 * @param {number} driveMin10th - Drive's minimum 10th percentage
 * @returns {boolean}
 */
function checkTenth(studentTenthPercent, driveMin10th) {
  if (studentTenthPercent === null || studentTenthPercent === undefined) {
    return false
  }
  return studentTenthPercent >= driveMin10th
}

/**
 * Checks if student's 12th percentage meets the drive's minimum
 * @param {number|null} studentTwelfthPercent - Student's 12th percentage (0-100)
 * @param {number} driveMin12th - Drive's minimum 12th percentage
 * @returns {boolean}
 */
function checkTwelfth(studentTwelfthPercent, driveMin12th) {
  if (studentTwelfthPercent === null || studentTwelfthPercent === undefined) {
    return false
  }
  return studentTwelfthPercent >= driveMin12th
}

/**
 * Checks if student is blacklisted
 * @param {boolean} isBlacklisted - Student's blacklist flag
 * @returns {boolean}
 */
function checkBlacklist(isBlacklisted) {
  return !isBlacklisted
}

/**
 * Core eligibility check - evaluates basic academic criteria only.
 * Does NOT include business rules (One-Offer, Tier-Lock) - those are in Phase 27.
 *
 * @param {Object} student - Student profile snapshot
 * @param {string} student.branch - Student's branch/department
 * @param {number} student.batch - Student's batch year
 * @param {number|null} student.cgpaOverall - Student's overall CGPA
 * @param {number} student.backlogsActive - Student's active backlog count
 * @param {number|null} student.tenthPercent - Student's 10th percentage (legacy field)
 * @param {number|null} student.twelfthPercent - Student's 12th percentage (legacy field)
 * @param {Object} student.tenthDetails - Student's detailed 10th record
 * @param {number} student.tenthDetails.percentage - 10th percentage from detailed record
 * @param {Object} student.twelfthDetails - Student's detailed 12th record
 * @param {number} student.twelfthDetails.percentage - 12th percentage from detailed record
 * @param {boolean} student.isBlacklisted - Student's blacklist flag
 *
 * @param {Object} drive - Drive with eligibility criteria
 * @param {string[]} drive.eligibilityCriteria.branches - Eligible branches
 * @param {number[]} drive.eligibilityCriteria.batches - Eligible batches
 * @param {number} drive.eligibilityCriteria.minCgpa - Minimum CGPA
 * @param {number} drive.eligibilityCriteria.maxBacklogs - Maximum backlogs
 * @param {number} drive.eligibilityCriteria.min10th - Minimum 10th %
 * @param {number} drive.eligibilityCriteria.min12th - Minimum 12th %
 *
 * @returns {{ eligible: boolean, reasons: string[] }}
 *   eligible: true if all criteria met, false otherwise
 *   reasons: Array of reason codes (from INELIGIBILITY_REASONS) for each failed criterion
 */
export function checkEligibility(student, drive) {
  const reasons = []

  // 1. Blacklist check (highest priority - overrides everything)
  if (!checkBlacklist(student.isBlacklisted)) {
    reasons.push(INELIGIBILITY_REASONS.BLACKLISTED)
  }

  // 2. Branch check
  if (!checkBranch(student.branch, drive.eligibilityCriteria.branches)) {
    reasons.push(INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE)
  }

  // 3. Batch check
  if (!checkBatch(student.batch, drive.eligibilityCriteria.batches)) {
    reasons.push(INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE)
  }

  // 4. CGPA check
  if (!checkCgpa(student.cgpaOverall, drive.eligibilityCriteria.minCgpa)) {
    reasons.push(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
  }

  // 5. Backlogs check
  if (!checkBacklogs(student.backlogsActive, drive.eligibilityCriteria.maxBacklogs)) {
    reasons.push(INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM)
  }

  // 6. 10th percentage check (prefer detailed record, fallback to legacy)
  const tenthPercent = student.tenthDetails?.percentage ?? student.tenthPercent
  if (!checkTenth(tenthPercent, drive.eligibilityCriteria.min10th)) {
    reasons.push(INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM)
  }

  // 7. 12th percentage check (prefer detailed record, fallback to legacy)
  const twelfthPercent = student.twelfthDetails?.percentage ?? student.twelfthPercent
  if (!checkTwelfth(twelfthPercent, drive.eligibilityCriteria.min12th)) {
    reasons.push(INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM)
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  }
}

/**
 * Determines if a candidate tier is strictly better than a reference tier.
 * Per srs.md §8.2: lower tier number = more competitive/better tier.
 * This is configurable via season config but defaults to lowerIsBetter = true.
 *
 * @param {number} candidateTier - The tier to check (drive's tier)
 * @param {number} referenceTier - The reference tier (student's currentTier)
 * @param {Object} seasonConfig - Season configuration (optional, uses defaults if not provided)
 * @param {boolean} seasonConfig.tierConfig.lowerIsBetter - Whether lower tier number is better (default: true)
 * @returns {boolean} True if candidateTier is strictly better than referenceTier
 */
export function isTierStrictlyBetter(candidateTier, referenceTier, seasonConfig = {}) {
  const lowerIsBetter = seasonConfig.tierConfig?.lowerIsBetter ?? true

  if (lowerIsBetter) {
    return candidateTier < referenceTier
  }
  return candidateTier > referenceTier
}

/**
 * Applies business rules (One-Offer Rule, Tier-Lock Rule) on top of raw eligibility.
 * Per srs.md §8.1–8.2 and NFR-MAINT-01 (season-configurable).
 *
 * @param {Object} rawEligibility - Result from checkEligibility()
 * @param {boolean} rawEligibility.eligible - Raw academic eligibility
 * @param {string[]} rawEligibility.reasons - Raw academic ineligibility reasons
 * @param {Object} student - Student profile with placement info
 * @param {string} student.placementStatus - 'not_placed', 'placed', 'opted_out'
 * @param {number|null} student.currentTier - Tier at which student was placed
 * @param {Object} drive - Drive with tier info
 * @param {number} drive.tier - Drive's tier (lower = better per default config)
 * @param {Object} seasonConfig - Season configuration for business rules
 * @param {Object} seasonConfig.oneOfferRule - One-Offer Rule config
 * @param {boolean} seasonConfig.oneOfferRule.enabled - Whether rule is active
 * @param {boolean} seasonConfig.oneOfferRule.allowTierUpgrade - Allow upgrade to better tier
 * @param {Object} seasonConfig.tierConfig - Tier configuration
 * @param {boolean} seasonConfig.tierConfig.lowerIsBetter - Lower tier number = better
 * @returns {{ eligible: boolean, reasons: string[] }}
 *   eligible: true if eligible after business rules, false otherwise
 *   reasons: Combined array of academic + business rule ineligibility reasons
 */
export function applyBusinessRules(rawEligibility, student, drive, seasonConfig = {}) {
  const reasons = [...rawEligibility.reasons]

  // If already ineligible by academic criteria, return early (reasons already captured)
  if (!rawEligibility.eligible) {
    return { eligible: false, reasons }
  }

  // Default season config (data-driven per NFR-MAINT-01)
  const config = {
    oneOfferRule: {
      enabled: true,
      allowTierUpgrade: true,
      ...seasonConfig.oneOfferRule,
    },
    tierConfig: {
      lowerIsBetter: true,
      ...seasonConfig.tierConfig,
    },
  }

  // 1. One-Offer Rule (srs.md §8.1)
  // Once placed, excluded from further drives except Tier-Lock exception
  if (config.oneOfferRule.enabled && student.placementStatus === 'placed') {
    const currentTier = student.currentTier
    const driveTier = drive.tier

    // If no current tier recorded, cannot evaluate Tier-Lock exception
    if (currentTier === null || currentTier === undefined) {
      reasons.push(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      return { eligible: false, reasons }
    }

    // Check Tier-Lock exception (srs.md §8.2)
    // Placed student may apply to strictly better tier (upgrade)
    const canUpgrade =
      config.oneOfferRule.allowTierUpgrade && isTierStrictlyBetter(driveTier, currentTier, config)

    if (!canUpgrade) {
      reasons.push(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      // Also add tier lock reason if it's a tier lock issue
      if (!isTierStrictlyBetter(driveTier, currentTier, config)) {
        reasons.push(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
      }
      return { eligible: false, reasons }
    }
  }

  // Student is eligible after all business rules
  return { eligible: true, reasons }
}

/**
 * Get human-readable reason messages for an eligibility result
 * @param {string[]} reasons - Array of reason codes
 * @returns {string[]} Human-readable messages
 */
export function getReasonMessages(reasons) {
  return reasons.map((code) => getReasonMessage(code))
}

export default {
  checkEligibility,
  applyBusinessRules,
  getReasonMessages,
  INELIGIBILITY_REASONS,
  getReasonMessage,
  isTierStrictlyBetter,
  // Individual check functions (exported for unit testing)
  checkBranch,
  checkBatch,
  checkCgpa,
  checkBacklogs,
  checkTenth,
  checkTwelfth,
  checkBlacklist,
}
