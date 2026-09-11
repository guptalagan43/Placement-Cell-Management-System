// Eligibility Engine Service unit tests
// Covers every boundary condition in srs.md §8
import { describe, it, expect } from 'vitest'
import eligibilityService from './eligibility.service.js'

const {
  checkEligibility,
  INELIGIBILITY_REASONS,
  getReasonMessage,
  getReasonMessages,
  checkBranch,
  checkBatch,
  checkCgpa,
  checkBacklogs,
  checkTenth,
  checkTwelfth,
  checkBlacklist,
} = eligibilityService

// Helper to create a baseline eligible student
function createEligibleStudent(overrides = {}) {
  return {
    branch: 'Computer Science & Engineering',
    batch: 2024,
    cgpaOverall: 8.5,
    backlogsActive: 0,
    tenthPercent: 85,
    twelfthPercent: 90,
    tenthDetails: { percentage: 85 },
    twelfthDetails: { percentage: 90 },
    isBlacklisted: false,
    ...overrides,
  }
}

// Helper to create a baseline drive criteria
function createEligibleDrive(overrides = {}) {
  return {
    eligibilityCriteria: {
      branches: ['Computer Science & Engineering', 'Information Technology'],
      batches: [2024, 2025],
      minCgpa: 7.0,
      maxBacklogs: 2,
      min10th: 60,
      min12th: 65,
      ...overrides,
    },
  }
}

describe('Eligibility Engine Service - Individual Check Functions', () => {
  describe('checkBranch', () => {
    it('returns true when student branch is in drive branches', () => {
      expect(
        checkBranch('Computer Science & Engineering', [
          'Computer Science & Engineering',
          'Information Technology',
        ])
      ).toBe(true)
    })

    it('returns false when student branch is not in drive branches', () => {
      expect(
        checkBranch('Mechanical Engineering', [
          'Computer Science & Engineering',
          'Information Technology',
        ])
      ).toBe(false)
    })

    it('returns false for empty drive branches', () => {
      expect(checkBranch('Computer Science & Engineering', [])).toBe(false)
    })
  })

  describe('checkBatch', () => {
    it('returns true when student batch is in drive batches', () => {
      expect(checkBatch(2024, [2024, 2025])).toBe(true)
    })

    it('returns false when student batch is not in drive batches', () => {
      expect(checkBatch(2023, [2024, 2025])).toBe(false)
    })

    it('returns false for empty drive batches', () => {
      expect(checkBatch(2024, [])).toBe(false)
    })
  })

  describe('checkCgpa', () => {
    it('returns true when student CGPA equals minimum', () => {
      expect(checkCgpa(7.0, 7.0)).toBe(true)
    })

    it('returns true when student CGPA exceeds minimum', () => {
      expect(checkCgpa(8.5, 7.0)).toBe(true)
    })

    it('returns false when student CGPA is below minimum', () => {
      expect(checkCgpa(6.9, 7.0)).toBe(false)
    })

    it('returns false when student CGPA is null', () => {
      expect(checkCgpa(null, 7.0)).toBe(false)
    })

    it('returns false when student CGPA is undefined', () => {
      expect(checkCgpa(undefined, 7.0)).toBe(false)
    })
  })

  describe('checkBacklogs', () => {
    it('returns true when student backlogs equals maximum', () => {
      expect(checkBacklogs(2, 2)).toBe(true)
    })

    it('returns true when student backlogs is below maximum', () => {
      expect(checkBacklogs(1, 2)).toBe(true)
    })

    it('returns true when student has zero backlogs', () => {
      expect(checkBacklogs(0, 2)).toBe(true)
    })

    it('returns false when student backlogs exceeds maximum', () => {
      expect(checkBacklogs(3, 2)).toBe(false)
    })

    it('returns true when drive allows high backlogs', () => {
      expect(checkBacklogs(5, 10)).toBe(true)
    })
  })

  describe('checkTenth', () => {
    it('returns true when student 10th % equals minimum', () => {
      expect(checkTenth(60, 60)).toBe(true)
    })

    it('returns true when student 10th % exceeds minimum', () => {
      expect(checkTenth(85, 60)).toBe(true)
    })

    it('returns false when student 10th % is below minimum', () => {
      expect(checkTenth(59, 60)).toBe(false)
    })

    it('returns false when student 10th % is null', () => {
      expect(checkTenth(null, 60)).toBe(false)
    })

    it('returns false when student 10th % is undefined', () => {
      expect(checkTenth(undefined, 60)).toBe(false)
    })
  })

  describe('checkTwelfth', () => {
    it('returns true when student 12th % equals minimum', () => {
      expect(checkTwelfth(65, 65)).toBe(true)
    })

    it('returns true when student 12th % exceeds minimum', () => {
      expect(checkTwelfth(90, 65)).toBe(true)
    })

    it('returns false when student 12th % is below minimum', () => {
      expect(checkTwelfth(64, 65)).toBe(false)
    })

    it('returns false when student 12th % is null', () => {
      expect(checkTwelfth(null, 65)).toBe(false)
    })

    it('returns false when student 12th % is undefined', () => {
      expect(checkTwelfth(undefined, 65)).toBe(false)
    })
  })

  describe('checkBlacklist', () => {
    it('returns true when student is not blacklisted', () => {
      expect(checkBlacklist(false)).toBe(true)
    })

    it('returns false when student is blacklisted', () => {
      expect(checkBlacklist(true)).toBe(false)
    })
  })
})

describe('Eligibility Engine Service - checkEligibility Integration', () => {
  describe('Fully eligible student', () => {
    it('returns eligible=true with empty reasons for fully qualified student', () => {
      const student = createEligibleStudent()
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })

    it('uses detailed 10th/12th records when available', () => {
      const student = createEligibleStudent({
        tenthPercent: 50, // Legacy low value
        twelfthPercent: 50, // Legacy low value
        tenthDetails: { percentage: 85 }, // Detailed record has good value
        twelfthDetails: { percentage: 90 },
      })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })

    it('falls back to legacy fields when detailed records missing', () => {
      const student = createEligibleStudent({
        tenthDetails: {},
        twelfthDetails: {},
        tenthPercent: 85,
        twelfthPercent: 90,
      })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })
  })

  describe('Branch eligibility', () => {
    it('rejects student with non-eligible branch', () => {
      const student = createEligibleStudent({ branch: 'Mechanical Engineering' })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE)
    })

    it('allows student with one of multiple eligible branches', () => {
      const student = createEligibleStudent({ branch: 'Information Technology' })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects when drive has no eligible branches (edge case)', () => {
      const student = createEligibleStudent()
      const drive = createEligibleDrive({ branches: [] })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE)
    })
  })

  describe('Batch eligibility', () => {
    it('rejects student with non-eligible batch', () => {
      const student = createEligibleStudent({ batch: 2023 })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE)
    })

    it('allows student with one of multiple eligible batches', () => {
      const student = createEligibleStudent({ batch: 2025 })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects when drive has no eligible batches (edge case)', () => {
      const student = createEligibleStudent()
      const drive = createEligibleDrive({ batches: [] })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE)
    })
  })

  describe('CGPA boundary conditions', () => {
    it('allows exact CGPA match (boundary)', () => {
      const student = createEligibleStudent({ cgpaOverall: 7.0 })
      const drive = createEligibleDrive({ minCgpa: 7.0 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects CGPA just below minimum (boundary)', () => {
      const student = createEligibleStudent({ cgpaOverall: 6.99 })
      const drive = createEligibleDrive({ minCgpa: 7.0 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
    })

    it('rejects null CGPA', () => {
      const student = createEligibleStudent({ cgpaOverall: null })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
    })

    it('rejects undefined CGPA', () => {
      const student = createEligibleStudent({ cgpaOverall: undefined })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
    })

    it('allows CGPA well above minimum', () => {
      const student = createEligibleStudent({ cgpaOverall: 9.5 })
      const drive = createEligibleDrive({ minCgpa: 7.0 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })
  })

  describe('Backlogs boundary conditions', () => {
    it('allows exact backlog match (boundary)', () => {
      const student = createEligibleStudent({ backlogsActive: 2 })
      const drive = createEligibleDrive({ maxBacklogs: 2 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects one backlog over maximum (boundary)', () => {
      const student = createEligibleStudent({ backlogsActive: 3 })
      const drive = createEligibleDrive({ maxBacklogs: 2 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM)
    })

    it('allows zero backlogs', () => {
      const student = createEligibleStudent({ backlogsActive: 0 })
      const drive = createEligibleDrive({ maxBacklogs: 2 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('allows high backlogs when drive permits', () => {
      const student = createEligibleStudent({ backlogsActive: 5 })
      const drive = createEligibleDrive({ maxBacklogs: 10 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })
  })

  describe('10th percentage boundary conditions', () => {
    it('allows exact 10th % match (boundary)', () => {
      const student = createEligibleStudent({ tenthPercent: 60, tenthDetails: { percentage: 60 } })
      const drive = createEligibleDrive({ min10th: 60 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects 10th % just below minimum (boundary)', () => {
      const student = createEligibleStudent({ tenthPercent: 59, tenthDetails: { percentage: 59 } })
      const drive = createEligibleDrive({ min10th: 60 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM)
    })

    it('rejects null 10th %', () => {
      const student = createEligibleStudent({
        tenthPercent: null,
        tenthDetails: { percentage: null },
      })
      const drive = createEligibleDrive({ min10th: 60 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM)
    })

    it('prefers detailed record over legacy field', () => {
      const student = createEligibleStudent({
        tenthPercent: 50, // Legacy fails
        tenthDetails: { percentage: 85 }, // Detailed passes
      })
      const drive = createEligibleDrive({ min10th: 60 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })
  })

  describe('12th percentage boundary conditions', () => {
    it('allows exact 12th % match (boundary)', () => {
      const student = createEligibleStudent({
        twelfthPercent: 65,
        twelfthDetails: { percentage: 65 },
      })
      const drive = createEligibleDrive({ min12th: 65 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })

    it('rejects 12th % just below minimum (boundary)', () => {
      const student = createEligibleStudent({
        twelfthPercent: 64,
        twelfthDetails: { percentage: 64 },
      })
      const drive = createEligibleDrive({ min12th: 65 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM)
    })

    it('rejects null 12th %', () => {
      const student = createEligibleStudent({
        twelfthPercent: null,
        twelfthDetails: { percentage: null },
      })
      const drive = createEligibleDrive({ min12th: 65 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM)
    })

    it('prefers detailed record over legacy field', () => {
      const student = createEligibleStudent({
        twelfthPercent: 50, // Legacy fails
        twelfthDetails: { percentage: 85 }, // Detailed passes
      })
      const drive = createEligibleDrive({ min12th: 65 })

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })
  })

  describe('Blacklist override', () => {
    it('rejects blacklisted student regardless of academic criteria', () => {
      const student = createEligibleStudent({ isBlacklisted: true })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BLACKLISTED)
    })

    it('blacklist is the only reason when student is blacklisted but otherwise eligible', () => {
      const student = createEligibleStudent({ isBlacklisted: true })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.reasons).toEqual([INELIGIBILITY_REASONS.BLACKLISTED])
    })

    it('blacklist reason appears first in reasons array', () => {
      const student = createEligibleStudent({
        isBlacklisted: true,
        branch: 'Mechanical Engineering', // Also not eligible
        cgpaOverall: 5.0, // Also not eligible
      })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.reasons[0]).toBe(INELIGIBILITY_REASONS.BLACKLISTED)
    })

    it('allows non-blacklisted student', () => {
      const student = createEligibleStudent({ isBlacklisted: false })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(true)
    })
  })

  describe('Multiple ineligibility reasons', () => {
    it('collects all failed criteria when multiple are violated', () => {
      const student = createEligibleStudent({
        branch: 'Mechanical Engineering',
        batch: 2023,
        cgpaOverall: 5.0,
        backlogsActive: 5,
        tenthPercent: 50,
        twelfthPercent: 50,
        tenthDetails: { percentage: 50 },
        twelfthDetails: { percentage: 50 },
      })
      const drive = createEligibleDrive()

      const result = checkEligibility(student, drive)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM)
      expect(result.reasons.length).toBe(6)
    })
  })
})

describe('Eligibility Engine Service - Reason Messages', () => {
  describe('getReasonMessage', () => {
    it('returns correct message for each reason code', () => {
      expect(getReasonMessage(INELIGIBILITY_REASONS.BLACKLISTED)).toBe('Student is blacklisted')
      expect(getReasonMessage(INELIGIBILITY_REASONS.BRANCH_NOT_ELIGIBLE)).toBe(
        'Branch not eligible for this drive'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.BATCH_NOT_ELIGIBLE)).toBe(
        'Batch not eligible for this drive'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)).toBe(
        'CGPA below minimum requirement'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM)).toBe(
        'Active backlogs exceed maximum allowed'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.TENTH_BELOW_MINIMUM)).toBe(
        '10th percentage below minimum requirement'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.TWELFTH_BELOW_MINIMUM)).toBe(
        '12th percentage below minimum requirement'
      )
    })

    it('returns fallback for unknown code', () => {
      expect(getReasonMessage('UNKNOWN_CODE')).toBe('Ineligible')
    })
  })

  describe('getReasonMessages', () => {
    it('maps array of codes to messages', () => {
      const codes = [
        INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM,
        INELIGIBILITY_REASONS.BACKLOGS_EXCEED_MAXIMUM,
      ]
      const messages = getReasonMessages(codes)

      expect(messages).toEqual([
        'CGPA below minimum requirement',
        'Active backlogs exceed maximum allowed',
      ])
    })

    it('returns empty array for empty input', () => {
      expect(getReasonMessages([])).toEqual([])
    })
  })

  describe('INELIGIBILITY_REASONS constant', () => {
    it('contains all expected reason codes', () => {
      expect(INELIGIBILITY_REASONS).toEqual({
        BLACKLISTED: 'BLACKLISTED',
        BRANCH_NOT_ELIGIBLE: 'BRANCH_NOT_ELIGIBLE',
        BATCH_NOT_ELIGIBLE: 'BATCH_NOT_ELIGIBLE',
        CGPA_BELOW_MINIMUM: 'CGPA_BELOW_MINIMUM',
        BACKLOGS_EXCEED_MAXIMUM: 'BACKLOGS_EXCEED_MAXIMUM',
        TENTH_BELOW_MINIMUM: 'TENTH_BELOW_MINIMUM',
        TWELFTH_BELOW_MINIMUM: 'TWELFTH_BELOW_MINIMUM',
        ONE_OFFER_RULE: 'ONE_OFFER_RULE',
        TIER_LOCK_RULE: 'TIER_LOCK_RULE',
      })
    })
  })
})
