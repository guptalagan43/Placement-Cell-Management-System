// Business Rules Layer unit tests (Phase 27)
// Covers One-Offer Rule and Tier-Lock Rule with season configuration
import { describe, it, expect } from 'vitest'
import eligibilityService from './eligibility.service.js'

const {
  checkEligibility,
  applyBusinessRules,
  INELIGIBILITY_REASONS,
  getReasonMessage,
  isTierStrictlyBetter,
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
    placementStatus: 'not_placed',
    currentTier: null,
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
    tier: 3,
    ...overrides,
  }
}

// Helper to get raw eligibility (should be eligible)
function getRawEligible(student = createEligibleStudent(), drive = createEligibleDrive()) {
  return checkEligibility(student, drive)
}

describe('Business Rules Layer - isTierStrictlyBetter', () => {
  describe('default config (lowerIsBetter = true)', () => {
    it('returns true when candidate tier is lower (better)', () => {
      expect(isTierStrictlyBetter(2, 3)).toBe(true) // Tier 2 < Tier 3
      expect(isTierStrictlyBetter(1, 5)).toBe(true)
    })

    it('returns false when candidate tier is equal', () => {
      expect(isTierStrictlyBetter(3, 3)).toBe(false)
    })

    it('returns false when candidate tier is higher (worse)', () => {
      expect(isTierStrictlyBetter(4, 3)).toBe(false)
      expect(isTierStrictlyBetter(5, 1)).toBe(false)
    })
  })

  describe('custom config (lowerIsBetter = false)', () => {
    it('returns true when candidate tier is higher (better)', () => {
      expect(isTierStrictlyBetter(3, 2, { tierConfig: { lowerIsBetter: false } })).toBe(true)
      expect(isTierStrictlyBetter(5, 1, { tierConfig: { lowerIsBetter: false } })).toBe(true)
    })

    it('returns false when candidate tier is equal', () => {
      expect(isTierStrictlyBetter(3, 3, { tierConfig: { lowerIsBetter: false } })).toBe(false)
    })

    it('returns false when candidate tier is lower (worse)', () => {
      expect(isTierStrictlyBetter(2, 3, { tierConfig: { lowerIsBetter: false } })).toBe(false)
      expect(isTierStrictlyBetter(1, 5, { tierConfig: { lowerIsBetter: false } })).toBe(false)
    })
  })
})

describe('Business Rules Layer - applyBusinessRules', () => {
  const defaultSeasonConfig = {
    oneOfferRule: { enabled: true, allowTierUpgrade: true },
    tierConfig: { lowerIsBetter: true },
  }

  describe('Student not placed', () => {
    it('allows eligible student to proceed', () => {
      const student = createEligibleStudent({ placementStatus: 'not_placed' })
      const drive = createEligibleDrive()
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })

    it('allows opted_out student to proceed', () => {
      const student = createEligibleStudent({ placementStatus: 'opted_out' })
      const drive = createEligibleDrive()
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(true)
    })
  })

  describe('One-Offer Rule - Student placed', () => {
    it('blocks placed student with no currentTier recorded', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: null,
      })
      const drive = createEligibleDrive()
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
    })

    it('blocks placed student applying to equal tier', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive({ tier: 3 })
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
    })

    it('blocks placed student applying to worse tier (higher number)', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive({ tier: 5 }) // Tier 5 is worse than 3
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
    })

    it('allows placed student applying to strictly better tier (upgrade)', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 5,
      })
      const drive = createEligibleDrive({ tier: 3 }) // Tier 3 is better than 5
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })

    it('allows placed student applying to much better tier', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 10,
      })
      const drive = createEligibleDrive({ tier: 1 }) // Tier 1 is best
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(true)
    })
  })

  describe('Tier-Lock Rule with custom season config (lowerIsBetter = false)', () => {
    const reverseConfig = {
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      tierConfig: { lowerIsBetter: false },
    }

    it('allows upgrade when higher tier number is better', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive({ tier: 5 }) // Tier 5 > 3, so better
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, reverseConfig)

      expect(result.eligible).toBe(true)
    })

    it('blocks when candidate tier is lower (worse) in reverse config', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 5,
      })
      const drive = createEligibleDrive({ tier: 3 }) // Tier 3 < 5, so worse
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, reverseConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
    })
  })

  describe('One-Offer Rule disabled', () => {
    it('allows placed student when oneOfferRule.enabled = false', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive({ tier: 5 }) // Worse tier
      const raw = getRawEligible(student, drive)

      const config = {
        oneOfferRule: { enabled: false, allowTierUpgrade: true },
        tierConfig: { lowerIsBetter: true },
      }

      const result = applyBusinessRules(raw, student, drive, config)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toEqual([])
    })
  })

  describe('Tier upgrade disabled', () => {
    it('blocks placed student even for better tier when allowTierUpgrade = false', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 5,
      })
      const drive = createEligibleDrive({ tier: 3 }) // Better tier
      const raw = getRawEligible(student, drive)

      const config = {
        oneOfferRule: { enabled: true, allowTierUpgrade: false },
        tierConfig: { lowerIsBetter: true },
      }

      const result = applyBusinessRules(raw, student, drive, config)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
    })
  })

  describe('Academic ineligibility short-circuits business rules', () => {
    it('returns academic reasons without checking business rules', () => {
      const student = createEligibleStudent({
        cgpaOverall: 5.0, // Below minimum
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive()
      const raw = checkEligibility(student, drive) // Not eligible academically

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.CGPA_BELOW_MINIMUM)
      // Business rule reasons should NOT be added
      expect(result.reasons).not.toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      expect(result.reasons).not.toContain(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
    })

    it('returns blacklist reason without checking business rules', () => {
      const student = createEligibleStudent({
        isBlacklisted: true,
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive()
      const raw = checkEligibility(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toEqual([INELIGIBILITY_REASONS.BLACKLISTED])
    })
  })

  describe('Multiple business rule reasons', () => {
    it('includes both ONE_OFFER_RULE and TIER_LOCK_RULE when equal tier', () => {
      const student = createEligibleStudent({
        placementStatus: 'placed',
        currentTier: 3,
      })
      const drive = createEligibleDrive({ tier: 3 })
      const raw = getRawEligible(student, drive)

      const result = applyBusinessRules(raw, student, drive, defaultSeasonConfig)

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.ONE_OFFER_RULE)
      expect(result.reasons).toContain(INELIGIBILITY_REASONS.TIER_LOCK_RULE)
      expect(result.reasons.length).toBe(2)
    })
  })

  describe('getReasonMessage for business rules', () => {
    it('returns correct messages for business rule codes', () => {
      expect(getReasonMessage(INELIGIBILITY_REASONS.ONE_OFFER_RULE)).toBe(
        'Student already placed (One-Offer Rule)'
      )
      expect(getReasonMessage(INELIGIBILITY_REASONS.TIER_LOCK_RULE)).toBe(
        'Cannot apply to equal or lower tier drive (Tier-Lock Rule)'
      )
    })
  })
})
