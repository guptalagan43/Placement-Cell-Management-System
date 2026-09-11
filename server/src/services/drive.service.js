// Drive service: CRUD operations for drives with department scoping enforcement.
// Handles create, read, update, delete with RBAC enforcement and department scoping.
// Traces to FR-DRV-02, FR-DRV-03, FR-DRV-04.
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
import SeasonConfig from '../models/SeasonConfig.model.js'
import { ApiError } from '../utils/api-error.js'
import mongoose from 'mongoose'
import { ROLES } from '../constants/roles.js'
import eligibilitySvc from './eligibility.service.js'

// Fields allowed for create/update by coordinators/TPO
const ALLOWED_FIELDS = [
  'company',
  'title',
  'jobType',
  'compensation',
  'eligibilityCriteria',
  'tier',
  'vacancies',
  'registrationDeadline',
  'status',
  'departmentScope',
  'description',
]

// Valid status transitions (forward-only lifecycle)
// Draft → Published → Registration Open → Registration Closed → In Progress → Completed → Results Declared
const STATUS_TRANSITIONS = {
  draft: ['published'],
  published: ['registration_open'],
  registration_open: ['registration_closed'],
  registration_closed: ['in_progress'],
  in_progress: ['completed'],
  completed: ['results_declared'],
}

// Create a new drive (coordinator/TPO)
export async function createDrive(data, user) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      filtered[key] = data[key]
    }
  }

  // Validate company exists
  const company = await Company.findById(filtered.company).lean()
  if (!company) {
    throw new ApiError(400, 'Company not found', 'COMPANY_NOT_FOUND')
  }

  // Apply department scoping on write: coordinators can only create drives
  // scoped to their department (or institute-wide if TPO)
  if (user.role === ROLES.COORDINATOR) {
    if (!user.department) {
      throw new ApiError(500, 'Coordinator missing department assignment', 'CONFIG_ERROR')
    }
    // Force departmentScope to coordinator's department
    filtered.departmentScope = user.department
  }
  // TPO can set departmentScope to any department or leave null (institute-wide)

  // Validate status is draft (drives must start as draft)
  if (filtered.status && filtered.status !== 'draft') {
    throw new ApiError(400, 'New drives must be created with status "draft"', 'VALIDATION_ERROR')
  }

  try {
    const drive = await Drive.create(filtered)
    return drive.toObject({ virtuals: true })
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      // Handle any unique constraint violations
      throw new ApiError(
        400,
        'Drive creation failed due to duplicate constraint',
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

// Get all drives with pagination, filtering, sorting, and department scoping
export async function getDrives(queryParams, user) {
  const {
    search,
    status,
    jobType,
    tier,
    departmentScope,
    companyId,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams

  const filter = {}

  // For coordinators, merge the department scope into filter
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  } else if (departmentScope) {
    // TPO can filter by specific department scope
    filter.departmentScope = departmentScope
  }
  // TPO with no departmentScope filter sees all drives

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ]
  }
  if (status) filter.status = status
  if (jobType) filter.jobType = jobType
  if (tier) filter.tier = Number(tier)
  if (companyId) filter.company = companyId

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [drives, total] = await Promise.all([
    Drive.find(filter)
      .populate('company', 'name sector')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Drive.countDocuments(filter),
  ])

  return {
    drives,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single drive by ID (coordinator/TPO - department scoped)
export async function getDriveById(driveId, user) {
  const filter = { _id: driveId }

  // Apply department scoping for coordinators
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }

  const drive = await Drive.findOne(filter)
    .populate('company', 'name sector hrContact')
    .lean({ virtuals: true })
  if (!drive) {
    throw new ApiError(404, 'Drive not found', 'DRIVE_NOT_FOUND')
  }
  return drive
}

// Update drive by ID (coordinator/TPO with department scoping)
export async function updateDrive(driveId, updateData, user) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  // Prevent changing company reference
  if (updateData.company !== undefined) {
    delete filtered.company
  }

  // Validate company if being updated
  if (filtered.company) {
    const company = await Company.findById(filtered.company).lean()
    if (!company) {
      throw new ApiError(400, 'Company not found', 'COMPANY_NOT_FOUND')
    }
  }

  // Apply department scoping: coordinators can only update drives in their department
  const filter = { _id: driveId }
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
    // Coordinators cannot change departmentScope
    delete filtered.departmentScope
  }

  try {
    const drive = await Drive.findOneAndUpdate(
      filter,
      { $set: filtered },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('company', 'name sector')
      .lean({ virtuals: true })

    if (!drive) {
      throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
    }
    return drive
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(400, 'Drive update failed due to duplicate constraint', 'VALIDATION_ERROR')
    }
    throw err
  }
}

// Delete drive by ID (coordinator/TPO with department scoping)
export async function deleteDrive(driveId, user) {
  const filter = { _id: driveId }
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }

  const drive = await Drive.findOneAndDelete(filter).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }
  return { deleted: true }
}

// Get active companies for drive creation dropdown
export async function getActiveCompaniesForDrive() {
  const companies = await Company.find({ isActive: true })
    .select('name sector')
    .sort({ name: 1 })
    .lean()
  return companies
}

// Get active season configuration for eligibility business rules
async function getActiveSeasonConfig() {
  const config = await SeasonConfig.findOne({ isActive: true }).lean()
  return config || {}
}

// Annotate drives with eligibility for a specific student
async function annotateDrivesWithEligibility(drives, student) {
  if (!student) {
    return drives.map((drive) => ({ ...drive, eligibility: { eligible: null, reasons: [] } }))
  }

  const seasonConfig = await getActiveSeasonConfig()

  return drives.map((drive) => {
    const rawEligibility = eligibilitySvc.checkEligibility(student, drive)
    const finalEligibility = eligibilitySvc.applyBusinessRules(
      rawEligibility,
      student,
      drive,
      seasonConfig
    )
    return {
      ...drive,
      eligibility: {
        eligible: finalEligibility.eligible,
        reasons: finalEligibility.reasons,
        reasonMessages: eligibilitySvc.getReasonMessages(finalEligibility.reasons),
      },
    }
  })
}

// Get drives for students (published+ only) with eligibility annotations
export async function getDrivesForStudents(queryParams, student) {
  const {
    search,
    jobType,
    tier,
    ctcMin,
    ctcMax,
    status,
    page = 1,
    limit = 20,
    sortBy = 'registrationDeadline',
    sortOrder = 'asc',
  } = queryParams

  const filter = {
    status: {
      $in: [
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ],
    },
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ]
  }
  if (jobType) filter.jobType = jobType
  if (tier) filter.tier = Number(tier)
  if (status) filter.status = status
  if (ctcMin || ctcMax) {
    filter['compensation.ctcLpa'] = {}
    if (ctcMin) filter['compensation.ctcLpa'].$gte = Number(ctcMin)
    if (ctcMax) filter['compensation.ctcLpa'].$lte = Number(ctcMax)
  }

  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [drives, total] = await Promise.all([
    Drive.find(filter)
      .populate('company', 'name sector')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Drive.countDocuments(filter),
  ])

  // Annotate with eligibility
  const annotatedDrives = await annotateDrivesWithEligibility(drives, student)

  return {
    drives: annotatedDrives,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single drive by ID for students (published+ only) with eligibility annotation
export async function getDriveByIdForStudent(driveId, student) {
  const drive = await Drive.findOne({
    _id: driveId,
    status: {
      $in: [
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ],
    },
  })
    .populate('company', 'name sector hrContact')
    .lean({ virtuals: true })

  if (!drive) {
    return null
  }

  const annotatedDrives = await annotateDrivesWithEligibility([drive], student)
  return annotatedDrives[0]
}

// Update drive status with transition validation (coordinator/TPO with department scoping)
export async function updateDriveStatus(driveId, newStatus, user) {
  // Validate new status is a valid status value
  const validStatuses = [
    'draft',
    'published',
    'registration_open',
    'registration_closed',
    'in_progress',
    'completed',
    'results_declared',
  ]
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(400, 'Invalid status value', 'VALIDATION_ERROR')
  }

  // Apply department scoping: coordinators can only update drives in their department
  const filter = { _id: driveId }
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }

  // Get current drive to validate transition
  const currentDrive = await Drive.findOne(filter).lean()
  if (!currentDrive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }

  const currentStatus = currentDrive.status

  // Check if transition is valid
  const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus] || []
  if (!allowedNextStatuses.includes(newStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedNextStatuses.join(', ') || 'none'}`,
      'INVALID_STATUS_TRANSITION'
    )
  }

  // Update status
  const drive = await Drive.findOneAndUpdate(
    filter,
    { $set: { status: newStatus } },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('company', 'name sector')
    .lean({ virtuals: true })

  if (!drive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }
  return drive
}

// Clone drive (coordinator/TPO with department scoping)
// Creates a new Draft drive with all fields copied except deadline/status
export async function cloneDrive(driveId, user) {
  // Apply department scoping
  const filter = { _id: driveId }
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }

  const originalDrive = await Drive.findOne(filter).lean()
  if (!originalDrive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }

  // Prepare clone data - copy all fields except _id, createdAt, updatedAt, status, registrationDeadline
  const cloneData = {
    company: originalDrive.company,
    title: `${originalDrive.title} (Copy)`,
    jobType: originalDrive.jobType,
    compensation: originalDrive.compensation,
    eligibilityCriteria: originalDrive.eligibilityCriteria,
    tier: originalDrive.tier,
    vacancies: originalDrive.vacancies,
    registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'draft',
    departmentScope: originalDrive.departmentScope,
    description: originalDrive.description,
  }

  // For coordinators, force department scope
  if (user.role === ROLES.COORDINATOR) {
    if (!user.department) {
      throw new ApiError(500, 'Coordinator missing department assignment', 'CONFIG_ERROR')
    }
    cloneData.departmentScope = user.department
  }

  try {
    const drive = await Drive.create(cloneData)
    return drive.toObject({ virtuals: true })
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(400, 'Drive clone failed due to duplicate constraint', 'VALIDATION_ERROR')
    }
    throw err
  }
}

export default {
  createDrive,
  getDrives,
  getDrivesForStudents,
  getDriveById,
  getDriveByIdForStudent,
  updateDrive,
  deleteDrive,
  getActiveCompaniesForDrive,
  updateDriveStatus,
  cloneDrive,
}
