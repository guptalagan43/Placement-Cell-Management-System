// Eligibility Engine Service: Pure, stateless rule-evaluation logic.
// Compares a student profile snapshot against a drive's eligibility criteria.
// Returns { eligible: boolean, reasons: string[] }.
// Traces to FR-ELG-01, srs.md §8.

/**
 * Reasons for ineligibility (machine-readable codes for frontend branching)
 */
export const INELIGIBILITY_REASONS = {
  BLACKLISTED: 'BLACKLISTED',
  BRANCH_NOT_ELIGIBLE: 'BRANCH_NOT_ELIGIBLE',
  BATCH_NOT_ELIGIBLE: 'BATCH_NOT_ELIGIBLE',
  CGPA_BELOW_MINIMUM: 'CGPA_BELOW_MINIMUM',
  BACKLOGS_EXCEED_MAXIMUM: 'BACKLOGS_EXCEED_MAXIMUM',
  TENTH_BELOW_MINIMUM: 'TENTH_BELOW_MINIMUM',
  TWELFTH_BELOW_MINIMUM: 'TWELFTH_BELOW_MINIMUM',
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
 * Get human-readable reason messages for an eligibility result
 * @param {string[]} reasons - Array of reason codes
 * @returns {string[]} Human-readable messages
 */
export function getReasonMessages(reasons) {
  return reasons.map((code) => getReasonMessage(code))
}

export default {
  checkEligibility,
  getReasonMessages,
  INELIGIBILITY_REASONS,
  getReasonMessage,
  // Individual check functions (exported for unit testing)
  checkBranch,
  checkBatch,
  checkCgpa,
  checkBacklogs,
  checkTenth,
  checkTwelfth,
  checkBlacklist,
}
