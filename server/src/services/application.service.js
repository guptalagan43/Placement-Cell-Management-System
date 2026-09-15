// Application service: handles application creation, retrieval, and management.
// Traces to FR-APP-01, FR-APP-03.
import mongoose from 'mongoose'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Drive from '../models/Drive.model.js'
import { ApiError } from '../utils/api-error.js'
import eligibilitySvc from './eligibility.service.js'
import SeasonConfig from '../models/SeasonConfig.model.js'
import { ROLES } from '../constants/roles.js'

// Get active season configuration for eligibility business rules
async function getActiveSeasonConfig() {
  const config = await SeasonConfig.findOne({ isActive: true }).lean()
  return config || {}
}

// Create a new application (student)
export async function createApplication(studentId, driveId, resumeLabel, user) {
  // Verify student owns the profile
  const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
  if (!studentProfile) {
    throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
  }
  if (studentProfile._id.toString() !== studentId) {
    throw new ApiError(403, 'Cannot apply on behalf of another student', 'FORBIDDEN')
  }

  // Verify drive exists and is in registration_open status
  const drive = await Drive.findById(driveId).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found', 'DRIVE_NOT_FOUND')
  }

  if (drive.status !== 'registration_open') {
    throw new ApiError(400, 'Applications are not open for this drive', 'APPLICATION_NOT_OPEN')
  }

  // Check if application already exists
  const existingApplication = await Application.findOne({
    student: studentId,
    drive: driveId,
  }).lean()
  if (existingApplication) {
    throw new ApiError(409, 'You have already applied to this drive', 'ALREADY_APPLIED')
  }

  // Find the selected resume (exact label match only)
  const resume = studentProfile.resumes?.find((r) => r.label === resumeLabel)

  if (!resume) {
    throw new ApiError(400, 'Selected resume not found', 'RESUME_NOT_FOUND')
  }

  // Run eligibility check
  const studentForEligibility = {
    branch: studentProfile.branch,
    batch: studentProfile.batch,
    cgpaOverall: studentProfile.cgpaOverall,
    backlogsActive: studentProfile.backlogsActive,
    tenthPercent: studentProfile.tenthPercent,
    twelfthPercent: studentProfile.twelfthPercent,
    tenthDetails: studentProfile.tenthDetails,
    twelfthDetails: studentProfile.twelfthDetails,
    isBlacklisted: studentProfile.isBlacklisted,
    placementStatus: studentProfile.placementStatus,
    currentTier: studentProfile.currentTier,
  }

  const rawEligibility = eligibilitySvc.checkEligibility(studentForEligibility, drive)
  const seasonConfig = await getActiveSeasonConfig()
  const finalEligibility = eligibilitySvc.applyBusinessRules(
    rawEligibility,
    studentForEligibility,
    drive,
    seasonConfig
  )

  // Check for eligibility override
  const hasOverride = await Application.findOne({
    student: studentId,
    drive: driveId,
    'eligibilityOverride.overridden': true,
  }).lean()

  if (!finalEligibility.eligible && !hasOverride) {
    throw new ApiError(400, 'You are not eligible for this drive', 'NOT_ELIGIBLE', {
      reasons: finalEligibility.reasons,
      reasonMessages: eligibilitySvc.getReasonMessages(finalEligibility.reasons),
    })
  }

  // Initialize round statuses for all rounds in this drive
  const rounds = await mongoose.model('Round').find({ drive: driveId }).select('_id').lean()
  const roundStatuses = rounds.map((r) => ({
    round: r._id,
    status: 'pending',
  }))

  // Create application
  const application = await Application.create({
    student: studentId,
    drive: driveId,
    resumeSnapshot: {
      label: resume.label,
      cloudinaryPublicId: resume.cloudinaryPublicId,
      cloudinarySecureUrl: resume.cloudinarySecureUrl,
      originalFilename: resume.originalFilename,
      fileSize: resume.fileSize,
      mimeType: resume.mimeType,
    },
    roundStatuses,
    overallStatus: 'applied',
    eligibilityOverride: {
      overridden: !finalEligibility.eligible,
      reason: finalEligibility.eligible
        ? ''
        : 'Auto-override: eligibility check failed but application allowed', // This shouldn't happen with the check above, but kept for completeness
    },
  })

  return application.toObject({ virtuals: true })
}

// Get application by ID (student owns it or admin)
export async function getApplicationById(applicationId, user) {
  const application = await Application.findById(applicationId)
    .populate('student', 'user branch batch')
    .populate('drive', 'title company status')
    .lean({ virtuals: true })

  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  // Students can only see their own applications
  if (user.role === 'student') {
    const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
    if (!studentProfile || application.student._id.toString() !== studentProfile._id.toString()) {
      throw new ApiError(403, 'Access denied', 'FORBIDDEN')
    }
  }

  return application
}

// Get student's applications
export async function getStudentApplications(studentId, queryParams) {
  const { page = 1, limit = 20, sortBy = 'appliedAt', sortOrder = 'desc', status } = queryParams

  const filter = { student: studentId }
  if (status) filter.overallStatus = status

  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('drive', 'title company status jobType compensation tier registrationDeadline')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Application.countDocuments(filter),
  ])

  return {
    applications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get applications for a drive (admin/coordinator)
export async function getDriveApplications(driveId, queryParams, user) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'appliedAt',
    sortOrder = 'desc',
    round,
    status,
  } = queryParams

  // Verify user has access to this drive (department scoping)
  const _drive = await getDriveAndValidateAccess(driveId, user)

  const filter = { drive: driveId }
  if (status) filter.overallStatus = status
  if (round) {
    filter['roundStatuses.round'] = round
  }

  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate(
        'student',
        'user rollNumber branch batch cgpaOverall backlogsActive placementStatus'
      )
      .populate('drive', 'title')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Application.countDocuments(filter),
  ])

  return {
    applications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Update round status for an application (admin)
export async function updateRoundStatus(applicationId, roundId, status, updatedBy) {
  const validStatuses = ['pending', 'shortlisted', 'cleared', 'not_cleared', 'absent']
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid round status', 'VALIDATION_ERROR')
  }

  const application = await Application.findById(applicationId)
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  const roundStatusIndex = application.roundStatuses.findIndex(
    (rs) => rs.round.toString() === roundId
  )
  if (roundStatusIndex === -1) {
    throw new ApiError(404, 'Round not found in this application', 'ROUND_NOT_FOUND')
  }

  application.roundStatuses[roundStatusIndex].status = status
  application.roundStatuses[roundStatusIndex].updatedAt = new Date()
  application.roundStatuses[roundStatusIndex].updatedBy = updatedBy

  // Update overall status based on round statuses
  const allStatuses = application.roundStatuses.map((rs) => rs.status)
  if (allStatuses.every((s) => s === 'cleared')) {
    application.overallStatus = 'selected'
  } else if (
    allStatuses.some((s) => s === 'not_cleared') ||
    allStatuses.some((s) => s === 'absent')
  ) {
    application.overallStatus = 'rejected'
  } else if (allStatuses.some((s) => s === 'shortlisted')) {
    application.overallStatus = 'shortlisted'
  } else if (allStatuses.every((s) => s === 'pending')) {
    application.overallStatus = 'applied'
  }

  await application.save()
  return application.toObject({ virtuals: true })
}

// Withdraw application (student)
export async function withdrawApplication(applicationId, user) {
  const application = await Application.findById(applicationId).lean()
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  // Verify student owns the application
  const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
  if (!studentProfile || application.student.toString() !== studentProfile._id.toString()) {
    throw new ApiError(403, 'Access denied', 'FORBIDDEN')
  }

  // Check if drive registration is still open
  const drive = await Drive.findById(application.drive).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found', 'DRIVE_NOT_FOUND')
  }

  if (drive.status !== 'registration_open' && drive.status !== 'published') {
    throw new ApiError(
      400,
      'Cannot withdraw application after registration deadline',
      'WITHDRAWAL_NOT_ALLOWED'
    )
  }

  // Check if already withdrawn or in terminal state
  const terminalStatuses = [
    'withdrawn',
    'selected',
    'rejected',
    'offer_issued',
    'offer_accepted',
    'offer_declined',
  ]
  if (terminalStatuses.includes(application.overallStatus)) {
    throw new ApiError(
      400,
      `Cannot withdraw application with status: ${application.overallStatus}`,
      'INVALID_STATUS'
    )
  }

  const updated = await Application.findByIdAndUpdate(
    applicationId,
    {
      $set: {
        overallStatus: 'withdrawn',
        withdrawnAt: new Date(),
      },
    },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('drive', 'title')
    .lean({ virtuals: true })

  return updated
}

// Bulk update round statuses via CSV (admin)
export async function bulkUpdateRoundStatus(driveId, roundId, updates, user) {
  const validStatuses = ['pending', 'shortlisted', 'cleared', 'not_cleared', 'absent']
  const results = { updated: 0, errors: [] }

  for (const update of updates) {
    const { rollNumber, status } = update

    if (!validStatuses.includes(status)) {
      results.errors.push({ rollNumber, error: 'Invalid status' })
      continue
    }

    // Find student profile by roll number
    const studentProfile = await StudentProfile.findOne({ rollNumber }).lean()
    if (!studentProfile) {
      results.errors.push({ rollNumber, error: 'Student not found' })
      continue
    }

    // Find application
    const application = await Application.findOne({ student: studentProfile._id, drive: driveId })
    if (!application) {
      results.errors.push({ rollNumber, error: 'Application not found' })
      continue
    }

    const roundStatusIndex = application.roundStatuses.findIndex(
      (rs) => rs.round.toString() === roundId
    )
    if (roundStatusIndex === -1) {
      results.errors.push({ rollNumber, error: 'Round not found in application' })
      continue
    }

    application.roundStatuses[roundStatusIndex].status = status
    application.roundStatuses[roundStatusIndex].updatedAt = new Date()
    application.roundStatuses[roundStatusIndex].updatedBy = user._id

    // Update overall status
    const allStatuses = application.roundStatuses.map((rs) => rs.status)
    if (allStatuses.every((s) => s === 'cleared')) {
      application.overallStatus = 'selected'
    } else if (
      allStatuses.some((s) => s === 'not_cleared') ||
      allStatuses.some((s) => s === 'absent')
    ) {
      application.overallStatus = 'rejected'
    } else if (allStatuses.some((s) => s === 'shortlisted')) {
      application.overallStatus = 'shortlisted'
    } else if (allStatuses.every((s) => s === 'pending')) {
      application.overallStatus = 'applied'
    }

    await application.save()
    results.updated++
  }

  return results
}

// Get single application for student (with eligibility info)
export async function getApplicationForStudent(applicationId, user) {
  const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
  if (!studentProfile) {
    throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
  }

  const application = await Application.findOne({ _id: applicationId, student: studentProfile._id })
    .populate(
      'drive',
      'title company status jobType compensation tier registrationDeadline eligibilityCriteria'
    )
    .populate('student', 'user')
    .lean({ virtuals: true })

  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  return application
}

// Helper: verify drive exists and user has access based on department scoping
async function getDriveAndValidateAccess(driveId, user) {
  const filter = { _id: driveId }

  // Apply department scoping for coordinators
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }
  // TPO has access to all drives (no departmentScope filter)

  const drive = await Drive.findOne(filter).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }

  return drive
}

export default {
  createApplication,
  getApplicationById,
  getStudentApplications,
  getDriveApplications,
  updateRoundStatus,
  withdrawApplication,
  bulkUpdateRoundStatus,
  getApplicationForStudent,
}
