// StudentProfile model. Basic academic/placement profile linked to User (DR-02).
// Extended in Phase 15 with full CRUD API.
import mongoose from 'mongoose'
import { DEPARTMENTS } from '../constants/departments.js'

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    branch: {
      type: String,
      enum: DEPARTMENTS,
      required: true,
    },
    batch: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    // Academic fields (Phase 15 will extend)
    cgpaOverall: { type: Number, min: 0, max: 10, default: null },
    cgpaSemesters: { type: [Number], default: [] },
    backlogsActive: { type: Number, min: 0, default: 0 },
    backlogsHistory: { type: [Number], default: [] },
    tenthPercent: { type: Number, min: 0, max: 100, default: null },
    twelfthPercent: { type: Number, min: 0, max: 100, default: null },
    // Placement status
    placementStatus: {
      type: String,
      enum: ['not_placed', 'placed', 'opted_out'],
      default: 'not_placed',
    },
    currentTier: { type: Number, default: null },
    // Resume and other fields (Phase 15+)
    resumes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    skills: { type: [String], default: [] },
    certifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
    projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Policy acknowledgment (Phase 47)
    policyAcknowledgment: {
      version: { type: String, default: null },
      acceptedAt: { type: Date, default: null },
    },
    // Blacklist flag (Phase 13+)
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
studentProfileSchema.index({ branch: 1, batch: 1 })
studentProfileSchema.index({ placementStatus: 1 })

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema)
export default StudentProfile
