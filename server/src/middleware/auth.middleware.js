// Authentication middleware: validates the access token (JWT) and attaches
// the authenticated user to `req.user`. Re-derives the user from the DB
// to ensure fresh role/department/active status — never trusts stale token claims
// (per rules.md §7.3 / NFR-SEC-02/NFR-SEC-05).
import { verifyAccessToken } from '../services/auth.service.js'
import { ApiError } from '../utils/api-error.js'
import User from '../models/User.model.js'

export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED')
  }

  const token = authHeader.slice(7) // Remove 'Bearer ' prefix

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED')
    }
    if (err.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid access token', 'UNAUTHORIZED')
    }
    throw new ApiError(401, 'Authentication failed', 'UNAUTHORIZED')
  }

  // Re-derive user from DB to ensure fresh data (role, department, active status)
  // Do NOT trust token claims for authorization decisions.
  User.findById(payload.sub)
    .select('+passwordHash') // Not needed here but kept for consistency
    .then((user) => {
      if (!user) {
        throw new ApiError(401, 'User no longer exists', 'UNAUTHORIZED')
      }
      if (!user.active) {
        throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_DEACTIVATED')
      }
      req.user = user
      next()
    })
    .catch((err) => {
      if (err instanceof ApiError) {
        next(err)
      } else {
        next(new ApiError(500, 'Authentication error', 'AUTH_ERROR'))
      }
    })
}

// Optional: version that doesn't throw on missing token (for optional auth)
// Not needed for current phases but kept for future extensibility.
export function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    User.findById(payload.sub)
      .then((user) => {
        if (user && user.active) {
          req.user = user
        }
        next()
      })
      .catch(() => next())
  } catch {
    next()
  }
}

export default { authenticate, optionalAuthenticate }
