// Contact controller: handles contact CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as contactSvc from '../services/contact.service.js'

// Validation schemas
const createContactSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100).trim(),
    role: z.string().min(1, 'Role is required').max(100).trim(),
    department: z.string().max(100).trim().optional(),
    email: z
      .string()
      .email('Valid email is required')
      .max(254)
      .toLowerCase()
      .optional()
      .or(z.literal('')),
    phone: z.string().max(20).optional(),
  }),
})

const updateContactSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    role: z.string().min(1).max(100).trim().optional(),
    department: z.string().max(100).trim().optional(),
    email: z.string().email().max(254).toLowerCase().optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    department: z.string().optional(),
    role: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
})

// POST /contacts — create contact (TPO only)
export const createContact = [
  asyncHandler(async (req, res) => {
    const { body } = createContactSchema.parse({ body: req.body })
    const contact = await contactSvc.createContact(body)
    res.status(201).json({ success: true, contact })
  }),
]

// GET /contacts — list contacts with pagination/filter/sort/search (all authenticated)
export const getContacts = [
  asyncHandler(async (req, res) => {
    const queryParams = listQuerySchema.parse({ query: req.query }).query
    const result = await contactSvc.getContacts(queryParams)
    res.json({ success: true, ...result })
  }),
]

// GET /contacts/departments — get unique departments (for filter dropdown)
export const getContactDepartments = [
  asyncHandler(async (req, res) => {
    const departments = await contactSvc.getContactDepartments()
    res.json({ success: true, departments })
  }),
]

// GET /contacts/roles — get unique roles (for filter dropdown)
export const getContactRoles = [
  asyncHandler(async (req, res) => {
    const roles = await contactSvc.getContactRoles()
    res.json({ success: true, roles })
  }),
]

// GET /contacts/:id — get single contact (all authenticated)
export const getContactById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const contact = await contactSvc.getContactById(params.id)
    res.json({ success: true, contact })
  }),
]

// PUT /contacts/:id — update contact (TPO only)
export const updateContact = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateContactSchema.parse({ body: req.body, params: req.params })
    const contact = await contactSvc.updateContact(params.id, body)
    res.json({ success: true, contact })
  }),
]

// DELETE /contacts/:id — delete contact (TPO only)
export const deleteContact = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await contactSvc.deleteContact(params.id)
    res.json({ success: true, message: 'Contact deleted successfully' })
  }),
]

export default {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactDepartments,
  getContactRoles,
}
