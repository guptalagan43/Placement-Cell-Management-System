// Otp model: short-lived one-time passwords for login 2FA and password reset.
// TTL index ensures MongoDB auto-deletes expired documents.
import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  // bcrypt hash of the 6-digit OTP (never store plaintext)
  otpHash: {
    type: String,
    required: true,
  },
  // 'login' | 'forgot_password'
  type: {
    type: String,
    required: true,
    enum: ['login', 'forgot_password'],
  },
  used: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    // MongoDB TTL: auto-delete document after expiresAt
    index: { expires: 0 },
  },
})

// Only one active (unused) OTP per email+type at a time
otpSchema.index({ email: 1, type: 1 })

export const Otp = mongoose.model('Otp', otpSchema)
export default Otp
