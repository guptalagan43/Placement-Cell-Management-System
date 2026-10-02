// OTP service: generate, send, verify, and invalidate one-time passwords.
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Otp from '../models/Otp.model.js'
import { ApiError } from '../utils/api-error.js'

const OTP_TTL_MINUTES = 10
const OTP_LENGTH = 6

// Generate a cryptographically random 6-digit OTP
function generateOtpCode() {
  // Use crypto.randomInt for unbiased random number
  return String(crypto.randomInt(100000, 999999))
}

// Issue a new OTP for the given email+type (invalidates any existing unused OTP)
export async function issueOtp(email, type) {
  const code = generateOtpCode()
  const otpHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

  // Remove any prior unused OTPs for this email+type (one active OTP at a time)
  await Otp.deleteMany({ email, type })

  await Otp.create({ email, type, otpHash, expiresAt })
  return code // Return plaintext OTP — caller sends it via email; never stored
}

// Verify an OTP. Returns true on success; throws ApiError on failure.
// Marks the OTP as used on success so it cannot be reused.
export async function verifyOtp(email, type, code) {
  const otpDoc = await Otp.findOne({ email, type, used: false })

  if (!otpDoc) {
    throw new ApiError(400, 'OTP has expired or is invalid. Please request a new one.', 'INVALID_OTP')
  }

  if (otpDoc.expiresAt < new Date()) {
    await otpDoc.deleteOne()
    throw new ApiError(400, 'OTP has expired. Please request a new one.', 'OTP_EXPIRED')
  }

  const match = await bcrypt.compare(String(code).trim(), otpDoc.otpHash)
  if (!match) {
    throw new ApiError(400, 'Incorrect OTP. Please check and try again.', 'INVALID_OTP')
  }

  // Mark as used and delete (single-use)
  await otpDoc.deleteOne()
  return true
}
