// ResumeCheck controller: handles resume checklist routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as resumeCheckSvc from '../services/resumeCheck.service.js'

// Validation schemas
const runCheckSchema = z.object({
  body: z.object({
    resumeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid resume ID'),
  }),
})

const checkIdParamSchema = z.object({
  params: z.object({
    checkId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid check ID'),
  }),
})

const historyQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
})

// POST /resume-checks/run — run checklist on a resume (student only)
export const runResumeCheck = [
  asyncHandler(async (req, res) => {
    const { body } = runCheckSchema.parse({ body: req.body })
    const result = await resumeCheckSvc.runResumeCheck(req.user._id, body.resumeId)
    res.status(201).json({ success: true, resumeCheck: result })
  }),
]

// GET /resume-checks/history — get checklist history (student only)
export const getResumeCheckHistory = [
  asyncHandler(async (req, res) => {
    const { query } = historyQuerySchema.parse({ query: req.query })
    const history = await resumeCheckSvc.getResumeCheckHistory(req.user._id, query.limit)
    res.json({ success: true, history })
  }),
]

// GET /resume-checks/items — get checklist items definition (student only)
export const getChecklistItems = [
  asyncHandler(async (req, res) => {
    const items = resumeCheckSvc.getChecklistItems()
    res.json({ success: true, items })
  }),
]

// GET /resume-checks/:checkId — get single check result (student only)
export const getResumeCheckById = [
  asyncHandler(async (req, res) => {
    const { params } = checkIdParamSchema.parse({ params: req.params })
    const check = await resumeCheckSvc.getResumeCheckById(params.checkId, req.user._id)
    res.json({ success: true, resumeCheck: check })
  }),
]

export default {
  runResumeCheck,
  getResumeCheckHistory,
  getChecklistItems,
  getResumeCheckById,
}
