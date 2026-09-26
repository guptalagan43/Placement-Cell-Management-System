// Announcement service: CRUD operations for announcements.
// Traces to FR-ANN-01.
import Announcement from '../models/Announcement.model.js'
import { applyDepartmentScope } from '../middleware/scope.middleware.js'
import { ApiError } from '../utils/api-error.js'

// Student-facing: get announcements (excludes expired, applies department scoping)
export async function getAnnouncementsForStudent(queryParams, user) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', category } = queryParams

  const now = new Date()

  // Base filter: non-expired
  const baseFilter = {
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }

  if (category) baseFilter.category = category

  // Apply department scope for students
  let filter
  if (user.role === 'student') {
    const StudentProfile = (await import('../models/StudentProfile.model.js')).default
    const profile = await StudentProfile.findOne({ user: user._id }).lean()
    if (profile?.branch) {
      // Combine non-expired with department scope
      filter = {
        $and: [
          baseFilter,
          {
            $or: [
              { departmentScope: null }, // General announcements
              { departmentScope: profile.branch }, // Department-scoped
            ],
          },
        ],
      }
    } else {
      // Only general (non-department-scoped) and non-expired
      filter = {
        $and: [baseFilter, { departmentScope: null }],
      }
    }
  } else {
    filter = baseFilter
  }

  let query = Announcement.find(filter)
    .populate('postedBy', 'name email role')
    .populate('drive', 'title company')
    .lean()

  // Apply department scope for coordinators if needed
  query = applyDepartmentScope(query, null)

  // Sorting: pinned first, then by sortBy
  const sort = {}
  sort.isPinned = -1
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1
  query = query.sort(sort)

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [announcements, total] = await Promise.all([
    query.skip(skip).limit(limitNum),
    Announcement.countDocuments(filter),
  ])

  return {
    announcements,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Admin/Coordinator: get all announcements (including expired)
export async function getAnnouncementsAdmin(queryParams, departmentScope) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    category,
    departmentScope: queryDeptScope,
    isPinned,
    includeExpired = false,
  } = queryParams

  const filter = {}

  if (category) filter.category = category
  if (isPinned !== undefined) filter.isPinned = isPinned
  if (!includeExpired) {
    filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  }
  if (queryDeptScope) filter.departmentScope = queryDeptScope

  // Apply department scope for coordinators (use 'departmentScope' field for Announcements)
  let query = Announcement.find(filter)
    .populate('postedBy', 'name email role')
    .populate('drive', 'title company')
    .lean()

  query = applyDepartmentScope(query, departmentScope, 'departmentScope')

  // Sorting: pinned first
  const sort = {}
  sort.isPinned = -1
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1
  query = query.sort(sort)

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [announcements, total] = await Promise.all([
    query.skip(skip).limit(limitNum),
    Announcement.countDocuments(filter),
  ])

  return {
    announcements,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single announcement
export async function getAnnouncementById(announcementId, user, departmentScope) {
  const announcement = await Announcement.findById(announcementId)
    .populate('postedBy', 'name email role')
    .populate('drive', 'title company')
    .lean()

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
  }

  // Check if expired (for students)
  if (
    user.role === 'student' &&
    announcement.expiresAt &&
    new Date(announcement.expiresAt) <= new Date()
  ) {
    throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
  }

  // Check department scope for coordinators
  if (user.role === 'coordinator' && announcement.departmentScope) {
    if (announcement.departmentScope !== departmentScope) {
      throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
    }
  }

  // For students, check if they have access to department-scoped announcements
  if (user.role === 'student' && announcement.departmentScope) {
    const StudentProfile = (await import('../models/StudentProfile.model.js')).default
    const profile = await StudentProfile.findOne({ user: user._id }).lean()
    if (!profile || profile.branch !== announcement.departmentScope) {
      throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
    }
  }

  return announcement
}

// Create announcement (coordinator/TPO)
export async function createAnnouncement(data, postedBy) {
  const announcement = await Announcement.create({
    ...data,
    postedBy,
  })

  return Announcement.findById(announcement._id)
    .populate('postedBy', 'name email role')
    .populate('drive', 'title company')
    .lean()
}

// Update announcement (coordinator/TPO)
export async function updateAnnouncement(announcementId, data, departmentScope) {
  const filter = { _id: announcementId }
  if (departmentScope) filter.departmentScope = departmentScope

  const announcement = await Announcement.findOneAndUpdate(
    filter,
    { $set: data },
    { new: true, runValidators: true }
  )
    .populate('postedBy', 'name email role')
    .populate('drive', 'title company')
    .lean()

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
  }
  return announcement
}

// Delete announcement (coordinator/TPO)
export async function deleteAnnouncement(announcementId, departmentScope) {
  const filter = { _id: announcementId }
  if (departmentScope) filter.departmentScope = departmentScope

  const announcement = await Announcement.findOneAndDelete(filter)
  if (!announcement) {
    throw new ApiError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')
  }
  return { success: true }
}

export default {
  getAnnouncementsForStudent,
  getAnnouncementsAdmin,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
}
