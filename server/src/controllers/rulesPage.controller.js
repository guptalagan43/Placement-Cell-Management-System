// RulesPage controller: handles rules page routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as rulesPageSvc from '../services/rulesPage.service.js'

// Validation schemas
const updateRulesPageSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Content is required')
      .max(50000, 'Content cannot exceed 50000 characters'),
  }),
})

// GET /rules — get current rules page (public)
export const getRules = [
  asyncHandler(async (req, res) => {
    const rulesPage = await rulesPageSvc.getRulesPage()
    res.json({ success: true, rulesPage })
  }),
]

// PUT /rules — update rules page (TPO only)
export const updateRules = [
  asyncHandler(async (req, res) => {
    const { body } = updateRulesPageSchema.parse({ body: req.body })
    const rulesPage = await rulesPageSvc.updateRulesPage(body.content, req.user._id, req.user)
    res.json({ success: true, rulesPage })
  }),
]

export default {
  getRules,
  updateRules,
}
