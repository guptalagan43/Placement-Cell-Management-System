// Statistics controller: Handles statistics routes with validation.
// Traces to FR-STA-01, FR-STA-03.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as statsSvc from '../services/stats.service.js'
import {
  toCSV,
  STATS_OVERVIEW_EXPORT_COLUMNS,
  STATS_OVERVIEW_EXPORT_LABELS,
  FUNNEL_EXPORT_COLUMNS,
  FUNNEL_EXPORT_LABELS,
} from '../services/csvExport.service.js'

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

// GET /stats/export — export statistics overview as CSV (coordinator/TPO)
export const exportStatsOverview = [
  asyncHandler(async (req, res) => {
    const departmentScope = req.departmentScope || null
    const stats = await statsSvc.getOverviewStats({ departmentScope })

    const csvData = [
      { metric: 'Total Students', value: stats.overview.totalStudents },
      { metric: 'Placed Students', value: stats.overview.placedStudents },
      { metric: 'Placement %', value: stats.overview.placementPercentage.toFixed(2) + '%' },
      { metric: 'Avg CTC (LPA)', value: stats.overview.avgCtcLpa || 'N/A' },
      { metric: 'Median CTC (LPA)', value: stats.overview.medianCtcLpa || 'N/A' },
      { metric: 'Highest CTC (LPA)', value: stats.overview.highestCtcLpa || 'N/A' },
      { metric: 'Total Drives', value: stats.overview.totalDrives || 0 },
      { metric: 'Total Applications', value: stats.overview.totalApplications || 0 },
    ]

    // Add department breakdown
    stats.departmentBreakdown.forEach((dept) => {
      csvData.push({
        metric: `${dept.department} - Total Students`,
        value: dept.totalStudents,
      })
      csvData.push({
        metric: `${dept.department} - Placed Students`,
        value: dept.placedStudents,
      })
      csvData.push({
        metric: `${dept.department} - Placement %`,
        value: dept.placementPercentage.toFixed(2) + '%',
      })
    })

    const csv = toCSV(csvData, STATS_OVERVIEW_EXPORT_COLUMNS, STATS_OVERVIEW_EXPORT_LABELS)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stats-overview-${new Date().toISOString().split('T')[0]}.csv"`
    )
    res.send(csv)
  }),
]

// GET /stats/drive/:driveId/funnel/export — export drive funnel as CSV (coordinator/TPO)
export const exportDriveFunnel = [
  asyncHandler(async (req, res) => {
    const { params } = driveFunnelSchema.parse({ params: req.params })
    const departmentScope = req.departmentScope || null
    const funnel = await statsSvc.getDriveFunnel(params.driveId, departmentScope)

    const csvData = [
      { stage: 'Applied', count: funnel.funnel.applied, conversionRate: '100%' },
      {
        stage: 'Shortlisted',
        count: funnel.funnel.shortlisted,
        conversionRate: funnel.conversionRates.appliedToShortlisted + '%',
      },
      {
        stage: 'Selected',
        count: funnel.funnel.selected,
        conversionRate: funnel.conversionRates.shortlistedToSelected + '%',
      },
      { stage: 'Rejected', count: funnel.funnel.rejected, conversionRate: '' },
      { stage: 'Pending', count: funnel.funnel.pending, conversionRate: '' },
      { stage: 'Withdrawn', count: funnel.funnel.withdrawn, conversionRate: '' },
    ]

    const csv = toCSV(csvData, FUNNEL_EXPORT_COLUMNS, FUNNEL_EXPORT_LABELS)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="funnel-drive-${params.driveId}-${new Date().toISOString().split('T')[0]}.csv"`
    )
    res.send(csv)
  }),
]

export default {
  getOverviewStats,
  getDriveFunnel,
  exportStatsOverview,
  exportDriveFunnel,
}
