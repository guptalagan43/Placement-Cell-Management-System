// Drive controller: handles drive CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as driveSvc from '../services/drive.service.js'
import { DEPARTMENTS } from '../constants/departments.js'
import StudentProfile from '../models/StudentProfile.model.js'

// Helper to get student profile for eligibility computation
async function getStudentProfileForEligibility(user) {
  if (!user || user.role !== 'student') {
    return null
  }
  const profile = await StudentProfile.findOne({ user: user._id }).lean()
  if (!profile) {
    return null
  }
  return {
    branch: profile.branch,
    batch: profile.batch,
    cgpaOverall: profile.cgpaOverall,
    backlogsActive: profile.backlogsActive,
    tenthPercent: profile.tenthPercent,
    twelfthPercent: profile.twelfthPercent,
    tenthDetails: profile.tenthDetails,
    twelfthDetails: profile.twelfthDetails,
    isBlacklisted: profile.isBlacklisted,
    placementStatus: profile.placementStatus,
    currentTier: profile.currentTier,
  }
}

// Validation schemas
const eligibilityCriteriaSchema = z.object({
  branches: z.array(z.enum(DEPARTMENTS)).min(1, 'At least one branch must be specified'),
  batches: z
    .array(z.number().int().min(2000).max(2100))
    .min(1, 'At least one batch must be specified'),
  minCgpa: z.number().min(0).max(10),
  maxBacklogs: z.number().int().min(0).max(50),
  min10th: z.number().min(0).max(100),
  min12th: z.number().min(0).max(100),
})

const compensationSchema = z.object({
  ctcLpa: z.number().min(0),
  stipend: z.number().min(0).optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  details: z.string().max(500).optional(),
})

const createDriveSchema = z.object({
  body: z.object({
    company: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid company ID'),
    title: z.string().min(1).max(200).trim(),
    jobType: z.enum(['full-time', 'internship', 'full-time+internship']),
    compensation: compensationSchema,
    eligibilityCriteria: eligibilityCriteriaSchema,
    tier: z.number().int().min(1).max(10),
    vacancies: z.number().int().min(1).max(1000),
    registrationDeadline: z.string().datetime({ offset: true }),
    status: z.enum(['draft']).optional().default('draft'),
    departmentScope: z.enum(DEPARTMENTS).optional(),
    description: z.string().max(5000).optional(),
  }),
})

const updateDriveSchema = z.object({
  body: z.object({
    company: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid company ID')
      .optional(),
    title: z.string().min(1).max(200).trim().optional(),
    jobType: z.enum(['full-time', 'internship', 'full-time+internship']).optional(),
    compensation: compensationSchema.optional(),
    eligibilityCriteria: eligibilityCriteriaSchema.optional(),
    tier: z.number().int().min(1).max(10).optional(),
    vacancies: z.number().int().min(1).max(1000).optional(),
    registrationDeadline: z.string().datetime({ offset: true }).optional(),
    status: z
      .enum([
        'draft',
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ])
      .optional(),
    departmentScope: z.enum(DEPARTMENTS).optional(),
    description: z.string().max(5000).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z
      .enum([
        'draft',
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ])
      .optional(),
    jobType: z.enum(['full-time', 'internship', 'full-time+internship']).optional(),
    tier: z.coerce.number().int().min(1).max(10).optional(),
    departmentScope: z.enum(DEPARTMENTS).optional(),
    companyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid company ID')
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

const studentListQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    jobType: z.enum(['full-time', 'internship', 'full-time+internship']).optional(),
    tier: z.coerce.number().int().min(1).max(10).optional(),
    ctcMin: z.coerce.number().min(0).optional(),
    ctcMax: z.coerce.number().min(0).optional(),
    status: z
      .enum([
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('registrationDeadline'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'draft',
      'published',
      'registration_open',
      'registration_closed',
      'in_progress',
      'completed',
      'results_declared',
    ]),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

// POST /drives/:id/status — update drive status with transition validation (coordinator/TPO)
export const updateDriveStatus = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateStatusSchema.parse({ body: req.body, params: req.params })
    const drive = await driveSvc.updateDriveStatus(params.id, body.status, req.user)
    res.json({ success: true, drive })
  }),
]

// POST /drives/:id/clone — clone drive (coordinator/TPO)
export const cloneDrive = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const drive = await driveSvc.cloneDrive(params.id, req.user)
    res.status(201).json({ success: true, drive })
  }),
]

// POST /drives — create drive (coordinator/TPO)
export const createDrive = [
  asyncHandler(async (req, res) => {
    const { body } = createDriveSchema.parse({ body: req.body })
    const drive = await driveSvc.createDrive(body, req.user)
    res.status(201).json({ success: true, drive })
  }),
]

// GET /drives — list drives with pagination/filter/sort (coordinator/TPO)
export const getDrives = [
  asyncHandler(async (req, res) => {
    const queryParams = listQuerySchema.parse({ query: req.query }).query
    const result = await driveSvc.getDrives(queryParams, req.user)
    res.json({ success: true, ...result })
  }),
]

// GET /drives/student — list drives for students (published+ only) with eligibility
export const getDrivesForStudents = [
  asyncHandler(async (req, res) => {
    const queryParams = studentListQuerySchema.parse({ query: req.query }).query
    const student = await getStudentProfileForEligibility(req.user)
    const result = await driveSvc.getDrivesForStudents(queryParams, student)
    res.json({ success: true, ...result })
  }),
]

// GET /drives/active-companies — get active companies for drive creation dropdown
export const getActiveCompaniesForDrive = [
  asyncHandler(async (req, res) => {
    const companies = await driveSvc.getActiveCompaniesForDrive()
    res.json({ success: true, companies })
  }),
]

// GET /drives/:id — get single drive (coordinator/TPO)
export const getDriveById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const drive = await driveSvc.getDriveById(params.id, req.user)
    res.json({ success: true, drive })
  }),
]

// GET /drives/student/:id — get single drive for students with eligibility
export const getDriveByIdForStudent = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const student = await getStudentProfileForEligibility(req.user)
    const drive = await driveSvc.getDriveByIdForStudent(params.id, student)
    if (!drive) {
      throw new (await import('../utils/api-error.js')).ApiError(
        404,
        'Drive not found',
        'DRIVE_NOT_FOUND'
      )
    }
    res.json({ success: true, drive })
  }),
]

// PUT /drives/:id — update drive (coordinator/TPO)
export const updateDrive = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateDriveSchema.parse({ body: req.body, params: req.params })
    const drive = await driveSvc.updateDrive(params.id, body, req.user)
    res.json({ success: true, drive })
  }),
]

// DELETE /drives/:id — delete drive (coordinator/TPO)
export const deleteDrive = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await driveSvc.deleteDrive(params.id, req.user)
    res.json({ success: true, message: 'Drive deleted successfully' })
  }),
]

export default {
  createDrive,
  getDrives,
  getDrivesForStudents,
  getActiveCompaniesForDrive,
  getDriveById,
  getDriveByIdForStudent,
  updateDrive,
  deleteDrive,
  updateDriveStatus,
  cloneDrive,
}
