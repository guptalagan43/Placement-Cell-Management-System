// Contact service: CRUD operations for contacts directory.
// Traces to FR-CON-01, FR-SEA-01.
import Contact from '../models/Contact.model.js'
import { ApiError } from '../utils/api-error.js'

// Fields allowed for create/update by TPO
const ALLOWED_FIELDS = ['name', 'role', 'department', 'email', 'phone']

// Create a new contact (TPO only)
export async function createContact(data) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      filtered[key] = data[key]
    }
  }

  const contact = await Contact.create(filtered)
  return contact.toObject()
}

// Get all contacts with pagination, filtering, sorting, search
export async function getContacts(queryParams) {
  const {
    search,
    department,
    role,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
  } = queryParams

  const filter = {}

  if (search) {
    filter.$text = { $search: search }
  }
  if (department) filter.department = department
  if (role) filter.role = role

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    Contact.countDocuments(filter),
  ])

  return {
    contacts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single contact by ID
export async function getContactById(contactId) {
  const contact = await Contact.findById(contactId).lean()
  if (!contact) {
    throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
  }
  return contact
}

// Update contact by ID (TPO only)
export async function updateContact(contactId, updateData) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  const contact = await Contact.findByIdAndUpdate(
    contactId,
    { $set: filtered },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  if (!contact) {
    throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
  }
  return contact
}

// Delete contact by ID (TPO only)
export async function deleteContact(contactId) {
  const contact = await Contact.findByIdAndDelete(contactId).lean()
  if (!contact) {
    throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
  }
  return { deleted: true }
}

// Get unique departments from contacts (for filter dropdown)
export async function getContactDepartments() {
  const departments = await Contact.distinct('department', { department: { $ne: '' } })
  return departments.sort()
}

// Get unique roles from contacts (for filter dropdown)
export async function getContactRoles() {
  const roles = await Contact.distinct('role')
  return roles.sort()
}

export default {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactDepartments,
  getContactRoles,
}
