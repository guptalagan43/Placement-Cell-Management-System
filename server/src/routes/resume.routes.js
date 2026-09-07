// Resume routes: upload, list, delete, set default.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireStudent } from '../middleware/rbac.middleware.js'
import {
  getResumes,
  getDefaultResume,
  getUploadParams,
  addResume,
  setDefaultResume,
  deleteResume,
  validateAddResume,
  validateSetDefault,
  validateDeleteResume,
} from '../controllers/resume.controller.js'

const router = Router()

// All routes require authentication and student role
router.use(authenticate)
router.use(requireStudent)

// GET /students/me/resumes/upload-params — get signed upload params for Cloudinary
router.get('/me/resumes/upload-params', getUploadParams)

// GET /students/me/resumes/default — get default resume
router.get('/me/resumes/default', getDefaultResume)

// GET /students/me/resumes — list all resumes
router.get('/me/resumes', getResumes)

// POST /students/me/resumes — add resume after client uploads to Cloudinary
router.post('/me/resumes', validateAddResume, addResume)

// PUT /students/me/resumes/:resumeId/default — set as default
router.put('/me/resumes/:resumeId/default', validateSetDefault, setDefaultResume)

// DELETE /students/me/resumes/:resumeId — delete a resume
router.delete('/me/resumes/:resumeId', validateDeleteResume, deleteResume)

export default router
