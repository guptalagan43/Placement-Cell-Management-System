// Company service: CRUD operations for company master list.
// Handles create, read, update, delete with RBAC enforcement.
// Traces to FR-DRV-01.
import Company from '../models/Company.model.js'
import { ApiError } from '../utils/api-error.js'
import mongoose from 'mongoose'

// Fields allowed for create/update by coordinators/TPO
const ALLOWED_FIELDS = ['name', 'sector', 'about', 'hrContact', 'website', 'isActive']

// Create a new company (coordinator/TPO)
export async function createCompany(data) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      filtered[key] = data[key]
    }
  }

  try {
    const company = await Company.create(filtered)
    return company.toObject()
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      if (err.keyPattern?.name) {
        throw new ApiError(400, 'Company name already exists', 'VALIDATION_ERROR')
      }
    }
    throw err
  }
}

// Get all companies with pagination, filtering, sorting
export async function getCompanies(queryParams) {
  const {
    search,
    sector,
    isActive,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams

  const filter = {}

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sector: { $regex: search, $options: 'i' } },
    ]
  }
  if (sector) filter.sector = sector
  if (isActive !== undefined) filter.isActive = isActive === 'true'

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [companies, total] = await Promise.all([
    Company.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    Company.countDocuments(filter),
  ])

  return {
    companies,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single company by ID
export async function getCompanyById(companyId) {
  const company = await Company.findById(companyId).lean()
  if (!company) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND')
  }
  return company
}

// Update company by ID (coordinator/TPO)
export async function updateCompany(companyId, updateData) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  try {
    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: filtered },
      { returnDocument: 'after', runValidators: true }
    ).lean()

    if (!company) {
      throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND')
    }
    return company
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      if (err.keyPattern?.name) {
        throw new ApiError(400, 'Company name already exists', 'VALIDATION_ERROR')
      }
    }
    throw err
  }
}

// Delete company by ID (coordinator/TPO)
export async function deleteCompany(companyId) {
  const company = await Company.findByIdAndDelete(companyId).lean()
  if (!company) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND')
  }
  return { deleted: true }
}

// Get active companies list (for student drive creation dropdowns)
export async function getActiveCompanies() {
  const companies = await Company.find({ isActive: true })
    .select('name sector')
    .sort({ name: 1 })
    .lean()
  return companies
}

export default {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getActiveCompanies,
}
