// Resume service: handles resume operations for student profiles.
// Uses Cloudinary for file storage (signed uploads).
import StudentProfile from '../models/StudentProfile.model.js'
import {
  generateSignedUploadParams,
  deleteFile,
  isCloudinaryConfigured,
} from './cloudinary.service.js'
import { ApiError } from '../utils/api-error.js'

// Allowed file types for resumes
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Validate file before upload
export function validateResumeFile(file) {
  const errors = []

  if (!file) {
    errors.push('No file provided')
    return { isValid: false, errors }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
    errors.push(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`)
  }

  if (file.fileSize > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
  }

  return { isValid: errors.length === 0, errors }
}

// Get signed upload params for direct client-to-Cloudinary upload
export function getUploadParams(folder = 'pcms/resumes') {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, 'Cloudinary not configured', 'UPLOAD_SERVICE_UNAVAILABLE')
  }
  return generateSignedUploadParams(folder)
}

// Add a resume to student's profile after successful Cloudinary upload
export async function addResume(userId, resumeData) {
  // Validate required fields
  if (!resumeData.label || !resumeData.cloudinaryPublicId || !resumeData.cloudinarySecureUrl) {
    throw new ApiError(400, 'Missing required resume data', 'INVALID_RESUME_DATA')
  }

  const profile = await StudentProfile.findOne({ user: userId })
  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }

  // If this is the first resume or marked as default, unset other defaults
  if (resumeData.isDefault || profile.resumes.length === 0) {
    profile.resumes.forEach((r) => {
      r.isDefault = false
    })
  }

  const newResume = {
    label: resumeData.label,
    cloudinaryPublicId: resumeData.cloudinaryPublicId,
    cloudinarySecureUrl: resumeData.cloudinarySecureUrl,
    originalFilename: resumeData.originalFilename,
    fileSize: resumeData.fileSize,
    mimeType: resumeData.mimeType,
    isDefault: resumeData.isDefault ?? profile.resumes.length === 0,
    uploadedAt: new Date(),
  }

  profile.resumes.push(newResume)
  await profile.save()

  return profile.resumes[profile.resumes.length - 1]
}

// Get all resumes for a student
export async function getResumes(userId) {
  const profile = await StudentProfile.findOne({ user: userId }).lean()
  if (!profile) {
    return []
  }
  return profile.resumes
}

// Delete a resume by ID
export async function deleteResume(userId, resumeId) {
  const profile = await StudentProfile.findOne({ user: userId })
  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }

  const resumeIndex = profile.resumes.findIndex((r) => r._id.toString() === resumeId)
  if (resumeIndex === -1) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND')
  }

  const resume = profile.resumes[resumeIndex]
  const wasDefault = resume.isDefault

  // Delete from Cloudinary
  try {
    await deleteFile(resume.cloudinaryPublicId)
  } catch (err) {
    // Log but don't fail - Cloudinary deletion failure shouldn't block profile update
    console.warn(`Failed to delete resume from Cloudinary: ${err.message}`)
  }

  // Remove from profile
  profile.resumes.splice(resumeIndex, 1)

  // If deleted resume was default and there are other resumes, make the first one default
  if (wasDefault && profile.resumes.length > 0) {
    profile.resumes[0].isDefault = true
  }

  await profile.save()
  return profile.resumes
}

// Set a resume as default
export async function setDefaultResume(userId, resumeId) {
  const profile = await StudentProfile.findOne({ user: userId })
  if (!profile) {
    throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND')
  }

  const resume = profile.resumes.find((r) => r._id.toString() === resumeId)
  if (!resume) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND')
  }

  // Unset all defaults
  profile.resumes.forEach((r) => {
    r.isDefault = false
  })

  // Set the selected one as default
  const resumeIndex = profile.resumes.findIndex((r) => r._id.toString() === resumeId)
  profile.resumes[resumeIndex].isDefault = true

  await profile.save()
  return profile.resumes
}

// Get default resume
export async function getDefaultResume(userId) {
  const profile = await StudentProfile.findOne({ user: userId }).lean()
  if (!profile) {
    return null
  }
  return profile.resumes.find((r) => r.isDefault) ?? null
}

export default {
  validateResumeFile,
  getUploadParams,
  addResume,
  getResumes,
  deleteResume,
  setDefaultResume,
  getDefaultResume,
}
