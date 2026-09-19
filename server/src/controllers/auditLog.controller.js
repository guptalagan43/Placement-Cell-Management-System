// AuditLog controller: handles audit log retrieval for admin/TPO.
// Traces to FR-AUD-02.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import AuditLog from '../models/AuditLog.model.js'

// Validation schemas
const auditLogQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('timestamp'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    actor: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    action: z
      .enum([
        'eligibility_override',
        'round_status_update',
        'bulk_shortlist_upload',
        'drive_status_change',
        'drive_clone',
        'company_create',
        'company_update',
        'company_delete',
        'offer_issue',
        'offer_response',
        'rules_edit',
        'blacklist_flag_change',
        'student_profile_edit',
      ])
      .optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    targetEntityType: z
      .enum([
        'Application',
        'Drive',
        'Company',
        'Round',
        'InfoSession',
        'Offer',
        'RulesPage',
        'StudentProfile',
        'User',
      ])
      .optional(),
    targetEntityId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
})

const auditLogIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid audit log ID'),
  }),
})

// GET /audit-logs — list audit logs with filters, pagination, sorting (TPO only)
export const getAuditLogs = [
  asyncHandler(async (req, res) => {
    const { query } = auditLogQuerySchema.parse({ query: req.query })

    const filter = {}

    if (query.actor) {
      filter.actor = query.actor
    }

    if (query.action) {
      filter.action = query.action
    }

    if (query.targetEntityType) {
      filter['target.entityType'] = query.targetEntityType
    }

    if (query.targetEntityId) {
      filter['target.entityId'] = query.targetEntityId
    }

    if (query.dateFrom || query.dateTo) {
      filter.timestamp = {}
      if (query.dateFrom) filter.timestamp.$gte = new Date(query.dateFrom)
      if (query.dateTo) filter.timestamp.$lte = new Date(query.dateTo)
    }

    const sort = {}
    sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1

    const pageNum = Math.max(1, Number(query.page))
    const limitNum = Math.min(100, Math.max(1, Number(query.limit)))
    const skip = (pageNum - 1) * limitNum

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      AuditLog.countDocuments(filter),
    ])

    res.json({
      success: true,
      auditLogs: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  }),
]

// GET /audit-logs/:id — get single audit log entry (TPO only)
export const getAuditLogById = [
  asyncHandler(async (req, res) => {
    const { params } = auditLogIdParamSchema.parse({ params: req.params })

    const log = await AuditLog.findById(params.id).populate('actor', 'name email role').lean({ virtuals: true })

    if (!log) {
      throw new ApiError(404, 'Audit log entry not found', 'AUDIT_LOG_NOT_FOUND')
    }

    res.json({ success: true, auditLog: log })
  }),
]

// GET /audit-logs/actions/list — get list of available action types for filter dropdown (TPO only)
export const getActionTypes = [
  asyncHandler(async (req, res) => {
    const actions = await AuditLog.distinct('action')
    res.json({ success: true, actions })
  }),
]

// GET /audit-logs/actors/list — get list of actors who performed actions (TPO only)
export const getActors = [
  asyncHandler(async (req, res) => {
    const actors = await AuditLog.aggregate([
      { $group: { _id: '$actor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$_id',
          name: '$user.name',
          email: '$user.email',
          role: '$user.role',
          count: 1,
        },
      },
    ])

    res.json({ success: true, actors })
  }),
]

export default {
  getAuditLogs,
  getAuditLogById,
  getActionTypes,
  getActors,
}