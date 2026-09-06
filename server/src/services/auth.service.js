// Auth service: token generation, verification, and refresh logic.
// Keeps all JWT concerns in one place so routes/controllers stay thin.
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/api-error.js'

// Token payload shape (minimal, no sensitive data).
function buildPayload(user) {
  return {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    department: user.department ?? null,
  }
}

export function generateAccessToken(user) {
  const payload = buildPayload(user)
  // Short-lived (e.g., 15 minutes) — adjust via env later if needed.
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    issuer: 'pcms',
    audience: 'pcms-client',
  })
}

export function generateRefreshToken(user) {
  const payload = buildPayload(user)
  // Longer-lived (e.g., 7 days) — rotating on each use.
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'pcms',
    audience: 'pcms-client',
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'pcms',
    audience: 'pcms-client',
  })
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'pcms',
    audience: 'pcms-client',
  })
}

// Cookie options for the httpOnly refresh token cookie.
export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/auth/refresh', // Only sent to the refresh endpoint
}

export function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, REFRESH_COOKIE_OPTS)
}

export function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: 0 })
}

// Check if a user account is active and allowed to log in.
export function assertUserActive(user) {
  if (!user.active) {
    throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_DEACTIVATED')
  }
}

// Generic error for invalid credentials (no user-enumeration leakage).
export const INVALID_CREDENTIALS_ERROR = Object.freeze({
  message: 'Invalid email or password',
  code: 'INVALID_CREDENTIALS',
  statusCode: 401,
})
