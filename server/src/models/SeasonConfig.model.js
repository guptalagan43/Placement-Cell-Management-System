// SeasonConfig model. Configuration for placement season business rules.
// Per NFR-MAINT-01: business rule constants must be data-driven, not hardcoded.
// Traces to srs.md §8.5, NFR-MAINT-01.
import mongoose from 'mongoose'

const seasonConfigSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
      // Format: "2024-25", "2025-26", etc.
    },
    // Tier configuration
    tierConfig: {
      // Lower tier number = better/more competitive (per srs.md §8.2)
      // This defines the ordering direction
      lowerIsBetter: {
        type: Boolean,
        default: true,
      },
      // Maximum tier value in the system
      maxTier: {
        type: Number,
        default: 10,
        min: 1,
      },
    },
    // One-Offer Rule configuration
    oneOfferRule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      // Exception: allow upgrade to strictly better tier
      allowTierUpgrade: {
        type: Boolean,
        default: true,
      },
    },
    // Blacklist override configuration
    blacklistOverride: {
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    // Default academic thresholds (used as fallbacks if drive doesn't specify)
    defaultThresholds: {
      minCgpa: { type: Number, default: 7.0, min: 0, max: 10 },
      maxBacklogs: { type: Number, default: 2, min: 0, max: 50 },
      min10th: { type: Number, default: 60, min: 0, max: 100 },
      min12th: { type: Number, default: 65, min: 0, max: 100 },
    },
    // Active flag
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

seasonConfigSchema.index({ isActive: 1 })

export const SeasonConfig = mongoose.model('SeasonConfig', seasonConfigSchema)
export default SeasonConfig
