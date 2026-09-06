// Department scoping middleware: attaches `req.departmentScope` based on the
// authenticated coordinator's department. Must run AFTER `authenticate` and
// `requireCoordinator` (or `requireCoordinatorOrTPO`) so `req.user` is
// guaranteed to exist and be a coordinator/TPO.
// Per NFR-SEC-05: scoping is enforced at the query level, not just UI filtering.
import { ApiError } from '../utils/api-error.js'
import { ROLES } from '../constants/roles.js'

export function departmentScope(req, _res, next) {
  // `authenticate` must run first and attach `req.user`.
  if (!req.user) {
    throw new ApiError(500, 'Authentication required before department scoping', 'AUTH_REQUIRED')
  }

  const user = req.user

  // TPO has no department scope (institute-wide access).
  if (user.role === ROLES.TPO) {
    req.departmentScope = null
    return next()
  }

  // Coordinator must have a department assigned.
  if (user.role === ROLES.COORDINATOR) {
    if (!user.department) {
      throw new ApiError(500, 'Coordinator missing department assignment', 'CONFIG_ERROR')
    }
    req.departmentScope = user.department
    return next()
  }

  // Students and other roles don't get a department scope for admin queries.
  // They should use ownership checks (e.g., req.user._id) instead.
  req.departmentScope = null
  next()
}

// Helper to apply department scope to a Mongoose query.
// Usage: applyDepartmentScope(StudentProfile.find(), req.departmentScope)
export function applyDepartmentScope(query, departmentScope) {
  if (departmentScope) {
    return query.where('department').equals(departmentScope)
  }
  // null/undefined scope means no filtering (TPO or non-scoped query)
  return query
}

export default { departmentScope, applyDepartmentScope }
