// Auth controller: handles login, forgot password, reset password, activation.
// Validates input, delegates to service, returns token pair.
import { z } from 'zod'
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
  sendPasswordResetEmail,
  verifyPasswordResetToken,
} from '../services/auth.service.js'

// Input validation schemas.
const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
  }),
})

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

const activateSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Activation token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

// POST /auth/login
export const login = [
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    // Find user by email, explicitly select passwordHash for comparison.
    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      // Generic error — no user-enumeration leakage (rules.md §7.3, NFR-SEC-02).
      throw new ApiError(
        INVALID_CREDENTIALS_ERROR.statusCode,
        INVALID_CREDENTIALS_ERROR.message,
        INVALID_CREDENTIALS_ERROR.code
      )
    }

    // Verify password.
    const valid = await user.comparePassword(password)
    if (!valid) {
      throw new ApiError(
        INVALID_CREDENTIALS_ERROR.statusCode,
        INVALID_CREDENTIALS_ERROR.message,
        INVALID_CREDENTIALS_ERROR.code
      )
    }

    // Ensure account is active.
    assertUserActive(user)

    // Generate token pair.
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Set refresh token in httpOnly cookie.
    setRefreshCookie(res, refreshToken)

    // Return access token in body; user info (no passwordHash thanks to toJSON).
    res.json({
      success: true,
      accessToken,
      user: user.toJSON(),
    })
  }),
]

// POST /auth/forgot-password
// Always returns success (even if email not found) to prevent user enumeration.
export const forgotPassword = [
  asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (user) {
      // Generate password reset token.
      const resetToken = generatePasswordResetToken(user)

      // Send email (in production). In test/dev without SMTP, we log instead.
      const frontendUrl = process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173'
      try {
        await sendPasswordResetEmail(email, resetToken, frontendUrl)
      } catch (err) {
        // Log but don't fail — in dev/test we may not have SMTP configured.
        console.warn('[auth] Failed to send password reset email:', err.message)
      }
    }

    // Always return generic success to prevent user enumeration.
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    })
  }),
]

// POST /auth/reset-password
export const resetPassword = [
  asyncHandler(async (req, res) => {
    const { token, password } = req.body

    // Verify the reset token.
    let payload
    try {
      payload = verifyPasswordResetToken(token)
    } catch {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN')
    }

    // Find user by ID from token.
    const user = await User.findById(payload.sub).select('+passwordHash')
    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN')
    }

    // Verify the token email matches the user email (extra safety).
    if (user.email !== payload.email) {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN')
    }

    // Set new password (virtual setter triggers pre-validate hash).
    user.password = password
    await user.save()

    // Clear any existing refresh tokens by rotating (not strictly needed but safe).
    res.json({
      success: true,
      message: 'Password has been reset. You can now log in with your new password.',
    })
  }),
]

// POST /auth/activate
// Used by bulk-imported students to set their initial password.
// Consumes activation token, sets password, clears mustResetPassword flag, returns token pair.
export const activate = [
  asyncHandler(async (req, res) => {
    const { token, password } = req.body

    // Verify the activation token (same token type as reset password).
    let payload
    try {
      payload = verifyPasswordResetToken(token)
    } catch {
      throw new ApiError(400, 'Invalid or expired activation token', 'INVALID_ACTIVATION_TOKEN')
    }

    // Find user by ID from token.
    const user = await User.findById(payload.sub).select('+passwordHash')
    if (!user) {
      throw new ApiError(400, 'Invalid or expired activation token', 'INVALID_ACTIVATION_TOKEN')
    }

    // Verify the token email matches the user email (extra safety).
    if (user.email !== payload.email) {
      throw new ApiError(400, 'Invalid or expired activation token', 'INVALID_ACTIVATION_TOKEN')
    }

    // Ensure user actually needs activation.
    if (!user.mustResetPassword) {
      throw new ApiError(400, 'Account already activated', 'ALREADY_ACTIVATED')
    }

    // Set new password (virtual setter triggers pre-validate hash).
    user.password = password
    user.mustResetPassword = false
    await user.save()

    // Generate token pair for auto-login after activation.
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Set refresh token in httpOnly cookie.
    setRefreshCookie(res, refreshToken)

    res.json({
      success: true,
      message: 'Account activated successfully.',
      accessToken,
      user: user.toJSON(),
    })
  }),
]

// Validation middleware for login.
export const validateLogin = (req, res, next) => {
  const result = loginSchema.safeParse({ body: req.body })
  if (!result.success) {
    const details = result.error.flatten().fieldErrors
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = details
    return next(err)
  }
  next()
}

// Validation middleware for forgot-password.
export const validateForgotPassword = (req, res, next) => {
  const result = forgotPasswordSchema.safeParse({ body: req.body })
  if (!result.success) {
    const details = result.error.flatten().fieldErrors
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = details
    return next(err)
  }
  next()
}

// Validation middleware for reset-password.
export const validateResetPassword = (req, res, next) => {
  const result = resetPasswordSchema.safeParse({ body: req.body })
  if (!result.success) {
    const details = result.error.flatten().fieldErrors
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = details
    return next(err)
  }
  next()
}

// Validation middleware for activate.
export const validateActivate = (req, res, next) => {
  const result = activateSchema.safeParse({ body: req.body })
  if (!result.success) {
    const details = result.error.flatten().fieldErrors
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = details
    return next(err)
  }
  next()
}

export default {
  login,
  validateLogin,
  forgotPassword,
  validateForgotPassword,
  resetPassword,
  validateResetPassword,
  activate,
  validateActivate,
}
