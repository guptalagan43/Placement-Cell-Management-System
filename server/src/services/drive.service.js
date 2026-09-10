// Drive service: CRUD operations for drives with department scoping enforcement.
// Handles create, read, update, delete with RBAC enforcement and department scoping.
// Traces to FR-DRV-02, FR-DRV-03.
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
import { ApiError } from '../utils/api-error.js'
import mongoose from 'mongoose'
import { ROLES } from '../constants/roles.js'

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

// Get drives for students (published+ only, with eligibility annotations added later)
// This is a simplified list without department scoping restriction
export async function getDrivesForStudents(queryParams) {
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

// Get single drive by ID for students (published+ only)
export async function getDriveByIdForStudent(driveId) {
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

export default {
  createDrive,
  getDrives,
  getDrivesForStudents,
  getDriveById,
  getDriveByIdForStudent,
  updateDrive,
  deleteDrive,
  getActiveCompaniesForDrive,
}
