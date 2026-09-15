// Application model. A student's candidacy for a Drive (DR-07).
// Traces to FR-APP-01, FR-APP-03, srs.md §6.6.
import mongoose from 'mongoose'

const roundStatusSchema = new mongoose.Schema(
  {
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'cleared', 'not_cleared', 'absent'],
      default: 'pending',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
)

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
      index: true,
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
      index: true,
    },
    resumeSnapshot: {
      label: { type: String, required: true },
      cloudinaryPublicId: { type: String, required: true },
      cloudinarySecureUrl: { type: String, required: true },
      originalFilename: { type: String, required: true },
      fileSize: { type: Number, required: true },
      mimeType: { type: String, required: true },
    },
    roundStatuses: {
      type: [roundStatusSchema],
      default: [],
    },
    overallStatus: {
      type: String,
      enum: [
        'applied',
        'shortlisted',
        'selected',
        'rejected',
        'withdrawn',
        'offer_issued',
        'offer_accepted',
        'offer_declined',
      ],
      default: 'applied',
      index: true,
    },
    eligibilityOverride: {
      overridden: { type: Boolean, default: false },
      reason: { type: String, trim: true, maxlength: 1000 },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      overriddenAt: { type: Date },
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    withdrawnAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Unique compound index: one application per student per drive
applicationSchema.index({ student: 1, drive: 1 }, { unique: true })

// Indexes for common queries
applicationSchema.index({ drive: 1, overallStatus: 1 })
applicationSchema.index({ student: 1, overallStatus: 1 })
applicationSchema.index({ 'roundStatuses.round': 1, 'roundStatuses.status': 1 })

// Ensure virtuals are included in toJSON/toObject
applicationSchema.set('toJSON', { virtuals: true })
applicationSchema.set('toObject', { virtuals: true })

export const Application = mongoose.model('Application', applicationSchema)
export default Application
