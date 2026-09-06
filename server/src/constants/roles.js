// Canonical user roles. The three actor classes from srs.md §2 (Students,
// Placement Coordinators, and the Training & Placement Officer / Super Admin)
// are encoded here once so schema enums, RBAC guards (Phase 9), and token
// claims (Phase 7) all reference a single source of truth rather than loose
// string literals scattered across the codebase.
export const ROLES = Object.freeze({
  STUDENT: 'student',
  COORDINATOR: 'coordinator',
  TPO: 'tpo',
})

export const ROLE_VALUES = Object.freeze(Object.values(ROLES))
