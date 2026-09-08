// StudentProfile controller: handles self-profile and scoped list routes.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as studentProfileSvc from '../services/studentProfile.service.js'

// Validation schemas
const listQuerySchema = z.object({
  query: z.object({
    branch: z.string().optional(),
    batch: z.coerce.number().int().positive().optional(),
    placementStatus: z.enum(['not_placed', 'placed', 'opted_out']).optional(),
    cgpaMin: z.coerce.number().min(0).max(10).optional(),
    cgpaMax: z.coerce.number().min(0).max(10).optional(),
    backlogsMax: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

const academicDetailsSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  rollNumber: z.string().optional(),
  board: z.string().optional(),
  obtainedMarks: z.number().min(0).optional(),
  maxMarks: z.number().min(1).optional(),
  percentage: z.number().min(0).max(100).optional(),
})

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
})

const guardianSchema = z.object({
  name: z.string().optional(),
  mobile: z.string().optional(),
  mobile2: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  occupation: z.string().optional(),
})

const guardianInfoSchema = z.object({
  father: guardianSchema.optional(),
  mother: guardianSchema.optional(),
  localGuardianName: z.string().optional(),
})

const updateSelfSchema = z.object({
  body: z.object({
    // Academic
    cgpaOverall: z.number().min(0).max(10).nullable().optional(),
    cgpaSemesters: z.array(z.number().min(0).max(10)).optional(),
    backlogsActive: z.number().int().min(0).nullable().optional(),
    backlogsHistory: z.array(z.number().int().min(0)).optional(),
    tenthPercent: z.number().min(0).max(100).nullable().optional(),
    twelfthPercent: z.number().min(0).max(100).nullable().optional(),
    tenthDetails: academicDetailsSchema.optional(),
    twelfthDetails: academicDetailsSchema.optional(),
    // Personal
    section: z.string().optional(),
    classGroup: z.string().optional(),
    alternateClassGroup: z.string().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    phone2: z.string().optional(),
    address: addressSchema.optional(),
    country: z.string().optional(),
    // Admission
    admissionYear: z.number().int().min(2000).max(2100).nullable().optional(),
    dateOfAdmission: z.string().datetime().nullable().optional(),
    // Skills, certifications, projects
    skills: z.array(z.string()).optional(),
    certifications: z.array(z.object({
      name: z.string().min(1),
      issuer: z.string().optional(),
      year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),
      proofUrl: z.string().url().optional().or(z.literal('')),
    })).optional(),
    projects: z.array(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      techStack: z.array(z.string()).optional(),
      link: z.string().url().optional().or(z.literal('')),
    })).optional(),
    // Guardian
    guardianInfo: guardianInfoSchema.optional(),
  }),
})

const updateAdminSchema = z.object({
  body: z.object({
    placementStatus: z.enum(['not_placed', 'placed', 'opted_out']).optional(),
    currentTier: z.number().int().positive().optional(),
    isBlacklisted: z.boolean().optional(),
    blacklistReason: z.string().optional(),
    section: z.string().optional(),
    cgpaOverall: z.number().min(0).max(10).optional(),
    cgpaSemesters: z.array(z.number().min(0).max(10)).optional(),
    backlogsActive: z.number().int().min(0).optional(),
    backlogsHistory: z.array(z.number().int().min(0)).optional(),
    tenthPercent: z.number().min(0).max(100).optional(),
    twelfthPercent: z.number().min(0).max(100).optional(),
    tenthDetails: academicDetailsSchema.optional(),
    twelfthDetails: academicDetailsSchema.optional(),
    classGroup: z.string().optional(),
    alternateClassGroup: z.string().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    phone2: z.string().optional(),
    address: addressSchema.optional(),
    country: z.string().optional(),
    admissionYear: z.number().int().min(2000).max(2100).nullable().optional(),
    dateOfAdmission: z.string().datetime().nullable().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid profile ID'),
  }),
})

// GET /students/me/profile — student self-profile
export const getSelfProfile = [
  asyncHandler(async (req, res) => {
    const profile = await studentProfileSvc.getSelfProfile(req.user._id)
    res.json({ success: true, profile })
  }),
]

// PUT /students/me/profile — student updates own profile
export const updateSelfProfile = [
  asyncHandler(async (req, res) => {
    const { body } = updateSelfSchema.parse({ body: req.body })
    const result = await studentProfileSvc.updateSelfProfile(req.user._id, body)
    res.json({ success: true, profile: result })
  }),
]

// GET /students — list profiles (coordinator/TPO with department scoping)
export const getProfilesList = [
  asyncHandler(async (req, res) => {
    const queryParams = listQuerySchema.parse({ query: req.query }).query
    const departmentScope = req.departmentScope ?? null

    const result = await studentProfileSvc.getProfilesList(queryParams, departmentScope)
    res.json({ success: true, ...result })
  }),
]

// GET /students/:id — get single profile (coordinator/TPO with scoping)
export const getProfileById = [
  asyncHandler(async (req, res) => {
    const departmentScope = req.departmentScope ?? null
    const profile = await studentProfileSvc.getProfileById(req.params.id, departmentScope)
    res.json({ success: true, profile })
  }),
]

// PUT /students/:id — update profile (coordinator/TPO with scoping)
export const updateProfileById = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateAdminSchema.parse({ body: req.body, params: req.params })
    const departmentScope = req.departmentScope ?? null
    const profile = await studentProfileSvc.updateProfileById(params.id, body, departmentScope)
    res.json({ success: true, profile })
  }),
]

export default {
  getSelfProfile,
  updateSelfProfile,
  getProfilesList,
  getProfileById,
  updateProfileById,
}