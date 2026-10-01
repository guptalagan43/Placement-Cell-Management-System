// Statistics Comparison controller: Handles year-over-year comparison routes.
// Traces to FR-STA-02.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as statsCompareSvc from '../services/statsCompare.service.js'

// Validation schema for compare query
const compareQuerySchema = z.object({
  query: z.object({
    years: z
      .string()
      .min(1, 'years parameter is required')
      .refine((val) => {
        const years = val.split(',').map((y) => y.trim())
        return years.length > 0 && years.every((y) => /^\d{4}-\d{2}$/.test(y))
      }, 'years must be comma-separated list of seasons in format YYYY-YY'),
  }),
})

// Validation schema for available seasons
const availableSeasonsQuerySchema = z.object({
  query: z.object({}),
})

// GET /stats/compare — Year-over-year comparison (TPO only)
export const compareSeasons = [
  asyncHandler(async (req, res) => {
    const { query } = compareQuerySchema.parse({ query: req.query })
    const years = query.years.split(',').map((y) => y.trim())
    const departmentScope = req.departmentScope || null

    const comparison = await statsCompareSvc.compareSeasons(years, departmentScope)
    res.json({ success: true, ...comparison })
  }),
]

// GET /stats/seasons — Get available seasons (TPO/Coordinator)
export const getAvailableSeasons = [
  asyncHandler(async (req, res) => {
    availableSeasonsQuerySchema.parse({ query: req.query })
    const seasons = await statsCompareSvc.getAvailableSeasons()
    res.json({ success: true, seasons })
  }),
]

export default {
  compareSeasons,
  getAvailableSeasons,
}
