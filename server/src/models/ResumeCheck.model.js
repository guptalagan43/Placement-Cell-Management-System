// ResumeCheck model. History of rule-based resume checklist runs (DR-14).
// Traces to FR-RES-01, FR-RES-02, srs.md §6.9, §12.
import mongoose from 'mongoose'

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 300 },
    category: {
      type: String,
      enum: ['contact_info', 'key_sections', 'formatting'],
      required: true,
    },
    passed: { type: Boolean, required: true },
    details: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const resumeCheckSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    resume: {
      label: { type: String, required: true, trim: true, maxlength: 100 },
      cloudinaryPublicId: { type: String, required: true },
      cloudinarySecureUrl: { type: String, required: true },
      originalFilename: { type: String, required: true },
    },
    checklistItems: { type: [checklistItemSchema], required: true, default: [] },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalChecks: { type: Number, required: true, min: 0 },
    passedChecks: { type: Number, required: true, min: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
resumeCheckSchema.index({ student: 1, completedAt: -1 })
resumeCheckSchema.index({ studentProfile: 1, completedAt: -1 })

export const ResumeCheck = mongoose.model('ResumeCheck', resumeCheckSchema)
export default ResumeCheck
