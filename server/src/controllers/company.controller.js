// Company controller: handles company CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as companySvc from '../services/company.service.js'

// Validation schemas
const hrContactSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254).toLowerCase(),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
})

const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).trim(),
    sector: z.string().max(100).trim().optional(),
    about: z.string().max(2000).trim().optional(),
    hrContact: hrContactSchema,
    website: z.string().url().max(500).optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  }),
})

const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).trim().optional(),
    sector: z.string().max(100).trim().optional(),
    about: z.string().max(2000).trim().optional(),
    hrContact: hrContactSchema.optional(),
    website: z.string().url().max(500).optional().or(z.literal('')),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid company ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    sector: z.string().optional(),
    isActive: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid company ID'),
  }),
})

// POST /companies — create company (coordinator/TPO)
export const createCompany = [
  asyncHandler(async (req, res) => {
    const { body } = createCompanySchema.parse({ body: req.body })
    const company = await companySvc.createCompany(body)
    res.status(201).json({ success: true, company })
  }),
]

// GET /companies — list companies with pagination/filter/sort (coordinator/TPO)
export const getCompanies = [
  asyncHandler(async (req, res) => {
    const queryParams = listQuerySchema.parse({ query: req.query }).query
    const result = await companySvc.getCompanies(queryParams)
    res.json({ success: true, ...result })
  }),
]

// GET /companies/active — get active companies list (student readable)
export const getActiveCompanies = [
  asyncHandler(async (req, res) => {
    const companies = await companySvc.getActiveCompanies()
    res.json({ success: true, companies })
  }),
]

// GET /companies/:id — get single company (coordinator/TPO)
export const getCompanyById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const company = await companySvc.getCompanyById(params.id)
    res.json({ success: true, company })
  }),
]

// PUT /companies/:id — update company (coordinator/TPO)
export const updateCompany = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateCompanySchema.parse({ body: req.body, params: req.params })
    const company = await companySvc.updateCompany(params.id, body)
    res.json({ success: true, company })
  }),
]

// DELETE /companies/:id — delete company (coordinator/TPO)
export const deleteCompany = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await companySvc.deleteCompany(params.id)
    res.json({ success: true, message: 'Company deleted successfully' })
  }),
]

export default {
  createCompany,
  getCompanies,
  getActiveCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
}
