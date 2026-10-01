// Statistics controller: Handles statistics routes with validation.
// Traces to FR-STA-01, FR-STA-03.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as statsSvc from '../services/stats.service.js'

// Validation schema for drive funnel query
const driveFunnelSchema = z.object({
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

// GET /stats/overview - Overall placement statistics (coordinator/TPO)
export const getOverviewStats = [
  asyncHandler(async (req, res) => {
    // Department scope is attached by middleware for coordinators
    const departmentScope = req.departmentScope || null
    const stats = await statsSvc.getOverviewStats({ departmentScope })
    res.json({ success: true, ...stats })
  }),
]

// GET /stats/drive/:driveId/funnel - Per-drive funnel (coordinator/TPO)
export const getDriveFunnel = [
  asyncHandler(async (req, res) => {
    const { params } = driveFunnelSchema.parse({ params: req.params })
    const departmentScope = req.departmentScope || null
    const funnel = await statsSvc.getDriveFunnel(params.driveId, departmentScope)
    res.json({ success: true, ...funnel })
  }),
]

export default {
  getOverviewStats,
  getDriveFunnel,
}
