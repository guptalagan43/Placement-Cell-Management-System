// StudentProfile service: CRUD operations for student profiles.
// Handles self-profile (student) and scoped list (coordinator/TPO).
import StudentProfile from '../models/StudentProfile.model.js'
import { applyDepartmentScope } from '../middleware/scope.middleware.js'
import { ApiError } from '../utils/api-error.js'

// Fields that a student can update on their own profile
const STUDENT_UPDATABLE_FIELDS = [
  // Academic
  'cgpaOverall',
  'cgpaSemesters',
  'backlogsActive',
  'backlogsHistory',
  'tenthPercent',
  'twelfthPercent',
  'tenthDetails',
  'twelfthDetails',
  // Personal
  'section',
  'classGroup',
  'alternateClassGroup',
  'dateOfBirth',
  'gender',
  'phone2',
  'address',
  'country',
  // Admission
  'admissionYear',
  'dateOfAdmission',
  // Skills, certifications, projects
  'skills',
  'certifications',
  'projects',
  // Guardian
  'guardianInfo',
]

// Get profile by user ID (self)
export async function getSelfProfile(userId) {
  const profile = await StudentProfile.findOne({ user: userId }).lean()
  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }
  return profile
}

// Update self profile (student)
export async function updateSelfProfile(userId, updateData) {
  // Filter to only allowed fields
  const filtered = {}
  for (const key of STUDENT_UPDATABLE_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  const profile = await StudentProfile.findOneAndUpdate(
    { user: userId },
    { $set: filtered },
    { new: true, runValidators: true }
  ).lean()

  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }
  return profile
}

// Get profiles list with department scoping (coordinator/TPO)
export async function getProfilesList(queryParams, departmentScope) {
  const {
    branch,
    batch,
    placementStatus,
    cgpaMin,
    cgpaMax,
    backlogsMax,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams

  const filter = {}

  if (branch) filter.branch = branch
  if (batch) filter.batch = Number(batch)
  if (placementStatus) filter.placementStatus = placementStatus
  if (cgpaMin || cgpaMax) {
    filter.cgpaOverall = {}
    if (cgpaMin) filter.cgpaOverall.$gte = Number(cgpaMin)
    if (cgpaMax) filter.cgpaOverall.$lte = Number(cgpaMax)
  }
  if (backlogsMax !== undefined) filter.backlogsActive = { $lte: Number(backlogsMax) }

  // Apply department scope for coordinators
  let query = StudentProfile.find(filter)
  query = applyDepartmentScope(query, departmentScope)

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1
  query = query.sort(sort)

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [profiles, total] = await Promise.all([
    query.skip(skip).limit(limitNum).lean(),
    StudentProfile.countDocuments(filter).then((count) => {
      // If departmentScope is applied, we need to count with scope too
      if (departmentScope) {
        return StudentProfile.countDocuments({ ...filter, branch: departmentScope })
      }
      return count
    }),
  ])

  return {
    profiles,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single profile by ID (admin/coordinator access)
export async function getProfileById(profileId, departmentScope) {
  const profile = await StudentProfile.findById(profileId).lean()
  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }

  // Check department scope for coordinators
  if (departmentScope && profile.branch !== departmentScope) {
    throw new ApiError(403, 'Access denied to this profile', 'FORBIDDEN')
  }

  return profile
}

// Update profile by ID (admin/coordinator)
export async function updateProfileById(profileId, updateData, departmentScope) {
  // getProfileById throws if not found or scope mismatch
  await getProfileById(profileId, departmentScope)

  // Coordinators can update placement status, blacklist, etc.
  // But cannot change rollNumber, user, branch, batch, registrationNumber, universityEnrollmentNumber
  const ALLOWED_ADMIN_FIELDS = [
    'placementStatus',
    'currentTier',
    'isBlacklisted',
    'blacklistReason',
    'section',
    'cgpaOverall',
    'cgpaSemesters',
    'backlogsActive',
    'backlogsHistory',
    'tenthPercent',
    'twelfthPercent',
    'tenthDetails',
    'twelfthDetails',
    'classGroup',
    'alternateClassGroup',
    'dateOfBirth',
    'gender',
    'phone2',
    'address',
    'country',
    'admissionYear',
    'dateOfAdmission',
  ]

  const filtered = {}
  for (const key of ALLOWED_ADMIN_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  const updated = await StudentProfile.findByIdAndUpdate(
    profileId,
    { $set: filtered },
    { new: true, runValidators: true }
  ).lean()

  return updated
}

export default {
  getSelfProfile,
  updateSelfProfile,
  getProfilesList,
  getProfileById,
  updateProfileById,
}
