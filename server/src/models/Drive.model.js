// Drive model. Core recruitment-process entity with structured eligibility criteria (DR-04).
// Traces to FR-DRV-02, FR-DRV-03, srs.md §6.3, §8.
import mongoose from 'mongoose'
import { DEPARTMENTS } from '../constants/departments.js'

const eligibilityCriteriaSchema = new mongoose.Schema(
  {
    branches: {
      type: [String],
      enum: DEPARTMENTS,
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one branch must be specified',
      },
    },
    batches: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) =>
          v.length > 0 && v.every((b) => Number.isInteger(b) && b >= 2000 && b <= 2100),
        message: 'At least one valid batch year (2000-2100) must be specified',
      },
    },
    minCgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    maxBacklogs: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    min10th: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    min12th: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
)

const compensationSchema = new mongoose.Schema(
  {
    ctcLpa: {
      type: Number,
      required: true,
      min: 0,
    },
    stipend: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { _id: false }
)

const driveSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    jobType: {
      type: String,
      required: true,
      enum: ['full-time', 'internship', 'full-time+internship'],
    },
    compensation: {
      type: compensationSchema,
      required: true,
    },
    eligibilityCriteria: {
      type: eligibilityCriteriaSchema,
      required: true,
    },
    tier: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    vacancies: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    registrationDeadline: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v > new Date(),
        message: 'Registration deadline must be in the future',
      },
    },
    status: {
      type: String,
      enum: [
        'draft',
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ],
      default: 'draft',
    },
    departmentScope: {
      type: String,
      enum: DEPARTMENTS,
      required: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
driveSchema.index({ company: 1 })
driveSchema.index({ status: 1 })
driveSchema.index({ tier: 1 })
driveSchema.index({ departmentScope: 1 })
driveSchema.index({ registrationDeadline: 1 })
driveSchema.index({ 'eligibilityCriteria.branches': 1 })
driveSchema.index({ 'eligibilityCriteria.batches': 1 })

// Virtual for active status (published+)
driveSchema.virtual('isPublishedPlus').get(function () {
  const publishedPlusStatuses = [
    'published',
    'registration_open',
    'registration_closed',
    'in_progress',
    'completed',
    'results_declared',
  ]
  return publishedPlusStatuses.includes(this.status)
})

// Ensure virtuals are included in toJSON/toObject
driveSchema.set('toJSON', { virtuals: true })
driveSchema.set('toObject', { virtuals: true })

export const Drive = mongoose.model('Drive', driveSchema)
export default Drive
