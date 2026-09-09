// Company model. Master list of organizations that run drives (DR-03).
// Traces to FR-DRV-01, srs.md §6.3.
import mongoose from 'mongoose'

const hrContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    phone: { type: String, trim: true, maxlength: 20 },
    designation: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false }
)

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      unique: true,
    },
    sector: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    about: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    hrContact: {
      type: hrContactSchema,
      required: true,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
      match: [/^https?:\/\/.+/, 'Website must start with http:// or https://'],
    },
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

// Indexes for common queries
companySchema.index({ sector: 1 })
companySchema.index({ isActive: 1 })

export const Company = mongoose.model('Company', companySchema)
export default Company
