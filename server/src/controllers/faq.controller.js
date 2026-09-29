// FAQ controller: handles FAQ CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as faqSvc from '../services/faq.service.js'

// Validation schemas
const createFAQSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question is required').max(500).trim(),
    answer: z.string().min(1, 'Answer is required').max(5000).trim(),
    category: z.string().max(100).trim().optional(),
    tags: z.array(z.string().max(50).trim()).max(10).optional(),
    isPublished: z.boolean().optional(),
  }),
})

const updateFAQSchema = z.object({
  body: z.object({
    question: z.string().min(1).max(500).trim().optional(),
    answer: z.string().min(1).max(5000).trim().optional(),
    category: z.string().max(100).trim().optional(),
    tags: z.array(z.string().max(50).trim()).max(10).optional(),
    isPublished: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid FAQ ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    isPublished: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid FAQ ID'),
  }),
})

// POST /faqs — create FAQ (TPO only)
export const createFAQ = [
  asyncHandler(async (req, res) => {
    const { body } = createFAQSchema.parse({ body: req.body })
    const faq = await faqSvc.createFAQ(body)
    res.status(201).json({ success: true, faq })
  }),
]

// GET /faqs — list FAQs with pagination/filter/sort/search (TPO)
export const getFAQs = [
  asyncHandler(async (req, res) => {
    const queryParams = listQuerySchema.parse({ query: req.query }).query
    const result = await faqSvc.getFAQs(queryParams)
    res.json({ success: true, ...result })
  }),
]

// GET /faqs/published — get published FAQs for students (no pagination)
export const getPublishedFAQs = [
  asyncHandler(async (req, res) => {
    const faqs = await faqSvc.getPublishedFAQs()
    res.json({ success: true, faqs })
  }),
]

// GET /faqs/categories — get unique categories (for filter dropdown)
export const getFAQCategories = [
  asyncHandler(async (req, res) => {
    const categories = await faqSvc.getFAQCategories()
    res.json({ success: true, categories })
  }),
]

// GET /faqs/:id — get single FAQ (all authenticated)
export const getFAQById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const faq = await faqSvc.getFAQById(params.id)
    res.json({ success: true, faq })
  }),
]

// PUT /faqs/:id — update FAQ (TPO only)
export const updateFAQ = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateFAQSchema.parse({ body: req.body, params: req.params })
    const faq = await faqSvc.updateFAQ(params.id, body)
    res.json({ success: true, faq })
  }),
]

// DELETE /faqs/:id — delete FAQ (TPO only)
export const deleteFAQ = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await faqSvc.deleteFAQ(params.id)
    res.json({ success: true, message: 'FAQ deleted successfully' })
  }),
]

export default {
  createFAQ,
  getFAQs,
  getPublishedFAQs,
  getFAQCategories,
  getFAQById,
  updateFAQ,
  deleteFAQ,
}
