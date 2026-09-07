// Resume controller: handles resume upload, listing, deletion, and default setting.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import * as resumeSvc from '../services/resume.service.js'

// Validation schemas
const addResumeSchema = z.object({
  body: z.object({
    label: z.string().min(1, 'Label is required').max(100),
    cloudinaryPublicId: z.string().min(1, 'Cloudinary public ID is required'),
    cloudinarySecureUrl: z.string().url('Invalid Cloudinary URL'),
    originalFilename: z.string().min(1, 'Original filename is required'),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
    isDefault: z.boolean().optional(),
  }),
})

const setDefaultSchema = z.object({
  params: z.object({
    resumeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid resume ID'),
  }),
})

const deleteResumeSchema = z.object({
  params: z.object({
    resumeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid resume ID'),
  }),
})

// GET /students/me/resumes — list student's resumes
export const getResumes = [
  asyncHandler(async (req, res) => {
    const resumes = await resumeSvc.getResumes(req.user._id)
    res.json({ success: true, resumes })
  }),
]

// GET /students/me/resumes/default — get default resume
export const getDefaultResume = [
  asyncHandler(async (req, res) => {
    const resume = await resumeSvc.getDefaultResume(req.user._id)
    res.json({ success: true, resume })
  }),
]

// GET /students/me/resumes/upload-params — get signed upload parameters
export const getUploadParams = [
  asyncHandler(async (req, res) => {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new ApiError(503, 'Upload service not configured', 'UPLOAD_SERVICE_UNAVAILABLE')
    }

    const params = resumeSvc.getUploadParams()
    res.json({ success: true, ...params })
  }),
]

// POST /students/me/resumes — add resume after client uploads to Cloudinary
export const addResume = [
  asyncHandler(async (req, res) => {
    const resumeData = req.body
    const resume = await resumeSvc.addResume(req.user._id, resumeData)
    res.status(201).json({ success: true, message: 'Resume added successfully', resume })
  }),
]

// PUT /students/me/resumes/:resumeId/default — set resume as default
export const setDefaultResume = [
  asyncHandler(async (req, res) => {
    const { resumeId } = req.params
    const resumes = await resumeSvc.setDefaultResume(req.user._id, resumeId)
    res.json({ success: true, message: 'Default resume updated', resumes })
  }),
]

// DELETE /students/me/resumes/:resumeId — delete a resume
export const deleteResume = [
  asyncHandler(async (req, res) => {
    const { resumeId } = req.params
    const resumes = await resumeSvc.deleteResume(req.user._id, resumeId)
    res.json({ success: true, message: 'Resume deleted successfully', resumes })
  }),
]

// Validation middlewares
export const validateAddResume = (req, res, next) => {
  const result = addResumeSchema.safeParse({ body: req.body })
  if (!result.success) {
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = result.error.flatten().fieldErrors
    return next(err)
  }
  next()
}

export const validateSetDefault = (req, res, next) => {
  const result = setDefaultSchema.safeParse({ params: req.params })
  if (!result.success) {
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = result.error.flatten().fieldErrors
    return next(err)
  }
  next()
}

export const validateDeleteResume = (req, res, next) => {
  const result = deleteResumeSchema.safeParse({ params: req.params })
  if (!result.success) {
    const err = new ApiError(400, 'Invalid input', 'VALIDATION_ERROR')
    err.details = result.error.flatten().fieldErrors
    return next(err)
  }
  next()
}

export default {
  getResumes,
  getDefaultResume,
  getUploadParams,
  addResume,
  setDefaultResume,
  deleteResume,
  validateAddResume,
  validateSetDefault,
  validateDeleteResume,
}
