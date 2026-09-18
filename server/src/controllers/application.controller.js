// Application controller: handles application routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import StudentProfile from '../models/StudentProfile.model.js'
import * as applicationSvc from '../services/application.service.js'

// Validation schemas
const createApplicationSchema = z.object({
  body: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
    resumeLabel: z.string().min(1, 'Resume label is required'),
  }),
})

const getApplicationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    status: z
      .enum([
        'applied',
        'shortlisted',
        'selected',
        'rejected',
        'withdrawn',
        'offer_issued',
        'offer_accepted',
        'offer_declined',
      ])
      .optional(),
  }),
})

const driveApplicationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    round: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    status: z
      .enum([
        'applied',
        'shortlisted',
        'selected',
        'rejected',
        'withdrawn',
        'offer_issued',
        'offer_accepted',
        'offer_declined',
      ])
      .optional(),
    includeWithdrawn: z.coerce.boolean().default(false),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID'),
  }),
})

const updateRoundStatusSchema = z.object({
  body: z.object({
    roundId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid round ID'),
    status: z.enum(['pending', 'shortlisted', 'cleared', 'not_cleared', 'absent']),
  }),
  params: z.object({
    applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID'),
  }),
})

const bulkUpdateSchema = z.object({
  body: z.object({
    roundId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid round ID'),
    updates: z
      .array(
        z.object({
          rollNumber: z.string().min(1),
          status: z.enum(['pending', 'shortlisted', 'cleared', 'not_cleared', 'absent']),
        })
      )
      .min(1, 'At least one update is required'),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const overrideEligibilitySchema = z.object({
  body: z.object({
    reason: z
      .string()
      .min(1, 'Reason is required')
      .max(2000, 'Reason cannot exceed 2000 characters'),
  }),
  params: z.object({
    applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID'),
  }),
})

// POST /applications — create application (student)
export const createApplication = [
  asyncHandler(async (req, res) => {
    const { body } = createApplicationSchema.parse({ body: req.body })

    // Find student profile for the current user
    const studentProfile = await StudentProfile.findOne({ user: req.user._id }).lean()
    if (!studentProfile) {
      throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
    }

    const application = await applicationSvc.createApplication(
      studentProfile._id.toString(),
      body.driveId,
      body.resumeLabel,
      req.user
    )
    res.status(201).json({ success: true, application })
  }),
]

// GET /applications — list student's own applications
export const getMyApplications = [
  asyncHandler(async (req, res) => {
    const { query } = getApplicationsQuerySchema.parse({ query: req.query })

    const studentProfile = await StudentProfile.findOne({ user: req.user._id }).lean()
    if (!studentProfile) {
      throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
    }

    const result = await applicationSvc.getStudentApplications(studentProfile._id.toString(), query)
    res.json({ success: true, ...result })
  }),
]

// GET /applications/:applicationId — get single application (student owns it or admin)
export const getApplicationById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const application = await applicationSvc.getApplicationById(params.applicationId, req.user)
    res.json({ success: true, application })
  }),
]

// GET /applications/student/:applicationId — get single application for student (with eligibility)
export const getApplicationForStudent = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const application = await applicationSvc.getApplicationForStudent(
      params.applicationId,
      req.user
    )
    res.json({ success: true, application })
  }),
]

// GET /drives/:driveId/applications — list applications for a drive (coordinator/TPO)
export const getDriveApplications = [
  asyncHandler(async (req, res) => {
    const { query, params } = driveApplicationsQuerySchema.parse({
      query: req.query,
      params: req.params,
    })
    const result = await applicationSvc.getDriveApplications(params.driveId, query, req.user)
    res.json({ success: true, ...result })
  }),
]

// PUT /applications/:applicationId/round-status — update round status (coordinator/TPO)
export const updateRoundStatus = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateRoundStatusSchema.parse({ body: req.body, params: req.params })
    const application = await applicationSvc.updateRoundStatus(
      params.applicationId,
      body.roundId,
      body.status,
      req.user._id
    )
    res.json({ success: true, application })
  }),
]

// POST /applications/:applicationId/withdraw — withdraw application (student)
export const withdrawApplication = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const application = await applicationSvc.withdrawApplication(params.applicationId, req.user)
    res.json({ success: true, application })
  }),
]

// POST /drives/:driveId/applications/bulk-update — bulk update round status via CSV (coordinator/TPO)
export const bulkUpdateRoundStatus = [
  asyncHandler(async (req, res) => {
    const { body, params } = bulkUpdateSchema.parse({ body: req.body, params: req.params })
    const results = await applicationSvc.bulkUpdateRoundStatus(
      params.driveId,
      body.roundId,
      body.updates,
      req.user
    )
    res.json({ success: true, ...results })
  }),
]

// POST /applications/:applicationId/eligibility-override — override eligibility (TPO only)
export const overrideEligibility = [
  asyncHandler(async (req, res) => {
    const { body, params } = overrideEligibilitySchema.parse({ body: req.body, params: req.params })
    const application = await applicationSvc.overrideEligibility(
      params.applicationId,
      body.reason,
      req.user._id
    )
    res.json({ success: true, application })
  }),
]

export default {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationForStudent,
  getDriveApplications,
  updateRoundStatus,
  withdrawApplication,
  bulkUpdateRoundStatus,
  overrideEligibility,
}
