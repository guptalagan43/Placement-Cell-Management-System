// Contact model. Directory of TPO, coordinators, representatives (DR-12).
// Traces to FR-CON-01, srs.md §6.9.
import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
contactSchema.index({ name: 'text', role: 'text', department: 'text' })
contactSchema.index({ department: 1 })
contactSchema.index({ role: 1 })

export const Contact = mongoose.model('Contact', contactSchema)
export default Contact
