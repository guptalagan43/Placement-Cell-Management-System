// Auth controller: handles login (and later, refresh/logout).
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
} from '../services/auth.service.js'

// Input validation schema.
const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
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

export default { login, validateLogin }
