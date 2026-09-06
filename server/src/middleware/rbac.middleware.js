// RBAC (Role-Based Access Control) middleware: enforces role authorization
// on protected routes. Must be applied AFTER `authenticate` middleware so
// `req.user` is guaranteed to exist (per NFR-SEC-02, rules.md §7.3).
import { ApiError } from '../utils/api-error.js'
import { ROLES, ROLE_VALUES } from '../constants/roles.js'

// Factory: returns middleware that allows only the specified roles.
export function authorize(...allowedRoles) {
  // Validate roles at startup.
  for (const role of allowedRoles) {
    if (!ROLE_VALUES.includes(role)) {
      throw new Error(`Invalid role in authorize(): ${role}`)
    }
  }

  return (req, _res, next) => {
    // `authenticate` must run first and attach `req.user`.
    if (!req.user) {
      throw new ApiError(500, 'Authentication required before authorization', 'AUTH_REQUIRED')
    }

    const userRole = req.user.role
    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(403, 'Insufficient permissions', 'FORBIDDEN')
    }

    next()
  }
}

// Convenience exports for common role combinations.
export const requireStudent = authorize(ROLES.STUDENT)
export const requireCoordinator = authorize(ROLES.COORDINATOR)
export const requireTPO = authorize(ROLES.TPO)
export const requireCoordinatorOrTPO = authorize(ROLES.COORDINATOR, ROLES.TPO)
export const requireAnyRole = authorize(...ROLE_VALUES) // Any authenticated user

export default {
  authorize,
  requireStudent,
  requireCoordinator,
  requireTPO,
  requireCoordinatorOrTPO,
  requireAnyRole,
}
