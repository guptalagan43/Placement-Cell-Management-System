// Canonical department list for SKIT, per design.md (the institute's eight
// departments) and srs.md DR-04. Used as the department scope for coordinator
// accounts (DR-01, FR-AUTH-06) and, in later phases, as the branch list for
// drive eligibility criteria and student profiles. Defined once here so every
// enum and dropdown stays in sync. This is institutional reference data, not
// seasonal placement policy, so encoding it as a constant does not conflict
// with rules.md §4 (which targets tier/backlog constants that change yearly).
export const DEPARTMENTS = Object.freeze([
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Basic Sciences & Humanities',
])
