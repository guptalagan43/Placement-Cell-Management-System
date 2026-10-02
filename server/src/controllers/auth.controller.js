// Auth controller: login (+ OTP 2FA), forgot-password (OTP), reset-password,
// account activation (temp password → new password).
// All email inputs are validated to @skit.ac.in domain.
import { z } from 'zod'
import crypto from 'crypto'
import User from '../models/User.model.js'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  assertUserActive,
  INVALID_CREDENTIALS_ERROR,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../services/auth.service.js'
import { issueOtp, verifyOtp } from '../services/otp.service.js'
import { sendEmail } from '../services/email.service.js'

// ── Shared email domain constraint ─────────────────────────────────────────
const SKIT_EMAIL = z
  .string()
  .email('Enter a valid email address')
  .toLowerCase()
  .trim()
  .refine((e) => e.endsWith('@skit.ac.in'), {
    message: 'Only @skit.ac.in college email addresses are accepted',
  })

// ── Input schemas ───────────────────────────────────────────────────────────
const loginSchema = z.object({
  body: z.object({
    email: SKIT_EMAIL,
    password: z.string().min(1, 'Password is required'),
  }),
})

const verifyLoginOtpSchema = z.object({
  body: z.object({
    email: SKIT_EMAIL,
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
})

const forgotPasswordSchema = z.object({
  body: z.object({ email: SKIT_EMAIL }),
})

const verifyForgotOtpSchema = z.object({
  body: z.object({
    email: SKIT_EMAIL,
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

const requestActivationSchema = z.object({
  body: z.object({ email: SKIT_EMAIL }),
})

const activateSchema = z.object({
  body: z.object({
    email: SKIT_EMAIL,
    tempPassword: z.string().min(1, 'Temporary password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
})

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeValidator(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body })
    if (!result.success) {
      const details = result.error.flatten().fieldErrors
      const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
      err.details = details
      return next(err)
    }
    next()
  }
}

// ── POST /auth/login (Step 1: verify credentials → send OTP) ───────────────
export const validateLogin = makeValidator(loginSchema)
export const login = [
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(
        INVALID_CREDENTIALS_ERROR.statusCode,
        INVALID_CREDENTIALS_ERROR.message,
        INVALID_CREDENTIALS_ERROR.code
      )
    }

    assertUserActive(user)

    // If account still needs first-time activation, block regular login
    if (user.mustResetPassword) {
      throw new ApiError(
        403,
        'Your account has not been activated yet. Please use the "New Account?" flow to activate it.',
        'ACCOUNT_NOT_ACTIVATED'
      )
    }

    // Credentials OK → issue login OTP
    const code = await issueOtp(email, 'login')

    await sendEmail(email, 'login_otp', {
      studentName: user.email.split('@')[0],
      otp: code,
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Login OTP for ${email}: ${code}`)
    }

    res.json({
      success: true,
      requiresOtp: true,
      message: `A 6-digit verification code has been sent to ${email}. It expires in 10 minutes.`,
    })
  }),
]

// ── POST /auth/verify-login-otp (Step 2: verify OTP → issue tokens) ────────
export const validateVerifyLoginOtp = makeValidator(verifyLoginOtpSchema)
export const verifyLoginOtp = [
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body

    await verifyOtp(email, 'login', otp)

    const user = await User.findOne({ email })
    if (!user) throw new ApiError(400, 'User not found', 'USER_NOT_FOUND')

    assertUserActive(user)

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    setRefreshCookie(res, refreshToken)

    res.json({ success: true, accessToken, user: user.toJSON() })
  }),
]

// ── POST /auth/forgot-password (send OTP to email) ─────────────────────────
export const validateForgotPassword = makeValidator(forgotPasswordSchema)
export const forgotPassword = [
  asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (user && user.active) {
      const code = await issueOtp(email, 'forgot_password')
      await sendEmail(email, 'forgot_password_otp', {
        studentName: user.email.split('@')[0],
        otp: code,
      })
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Forgot-password OTP for ${email}: ${code}`)
      }
    }

    // Generic response — no user enumeration
    res.json({
      success: true,
      message: `If ${email} is registered, a 6-digit reset code has been sent. It expires in 10 minutes.`,
    })
  }),
]

// ── POST /auth/verify-forgot-otp (verify OTP → return short-lived reset token) ──
export const validateVerifyForgotOtp = makeValidator(verifyForgotOtpSchema)
export const verifyForgotOtp = [
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body

    await verifyOtp(email, 'forgot_password', otp)

    const user = await User.findOne({ email })
    if (!user) throw new ApiError(400, 'Invalid request', 'USER_NOT_FOUND')

    // Issue a short-lived reset token (existing helper, reused)
    const resetToken = generatePasswordResetToken(user)

    res.json({
      success: true,
      resetToken,
      message: 'OTP verified. Please set your new password.',
    })
  }),
]

// ── POST /auth/reset-password (consume reset token → set new password) ─────
export const validateResetPassword = makeValidator(resetPasswordSchema)
export const resetPassword = [
  asyncHandler(async (req, res) => {
    const { token, password } = req.body

    let payload
    try {
      payload = verifyPasswordResetToken(token)
    } catch {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN')
    }

    const user = await User.findById(payload.sub).select('+passwordHash')
    if (!user || user.email !== payload.email) {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN')
    }

    user.password = password
    await user.save()

    res.json({
      success: true,
      message: 'Password has been reset. Please sign in with your new password.',
    })
  }),
]

// ── POST /auth/request-activation (new student → send temp password) ───────
export const validateRequestActivation = makeValidator(requestActivationSchema)
export const requestActivation = [
  asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (user && user.mustResetPassword && user.active) {
      // Generate a random 12-char temporary password
      const tempPassword = crypto.randomBytes(6).toString('hex') // e.g. "a3f2c9d1e8b7"

      // Store it hashed on the user (reuse password field via virtual setter)
      user.password = tempPassword
      await user.save()

      // Store the plaintext temporarily so we can email it
      await sendEmail(email, 'account_activation', {
        studentName: user.email.split('@')[0],
        tempPassword,
      })
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Activation temp password for ${email}: ${tempPassword}`)
      }
    }

    // Generic response — no user enumeration
    res.json({
      success: true,
      message: `If ${email} is a registered, unactivated account, a temporary password has been sent. Check your college inbox.`,
    })
  }),
]

// ── POST /auth/activate (temp password + new password → activate) ───────────
export const validateActivate = makeValidator(activateSchema)
export const activate = [
  asyncHandler(async (req, res) => {
    const { email, tempPassword, newPassword } = req.body

    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      throw new ApiError(401, 'Invalid email or temporary password', 'INVALID_CREDENTIALS')
    }

    if (!user.mustResetPassword) {
      throw new ApiError(400, 'Account already activated. Please sign in.', 'ALREADY_ACTIVATED')
    }

    const valid = await user.comparePassword(tempPassword)
    if (!valid) {
      throw new ApiError(401, 'Invalid email or temporary password', 'INVALID_CREDENTIALS')
    }

    user.password = newPassword
    user.mustResetPassword = false
    await user.save()

    res.json({
      success: true,
      message: 'Account activated! Please sign in with your new password.',
    })
  }),
]

export default {
  login,
  validateLogin,
  verifyLoginOtp,
  validateVerifyLoginOtp,
  forgotPassword,
  validateForgotPassword,
  verifyForgotOtp,
  validateVerifyForgotOtp,
  resetPassword,
  validateResetPassword,
  requestActivation,
  validateRequestActivation,
  activate,
  validateActivate,
}
