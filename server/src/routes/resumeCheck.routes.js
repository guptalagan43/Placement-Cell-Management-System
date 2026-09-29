// ResumeCheck routes: student-only checklist operations.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireStudent } from '../middleware/rbac.middleware.js'
import {
  runResumeCheck,
  getResumeCheckHistory,
  getChecklistItems,
  getResumeCheckById,
} from '../controllers/resumeCheck.controller.js'

const router = Router()

// All routes require student role
router.use(authenticate, requireStudent)

router.post('/run', runResumeCheck)
router.get('/history', getResumeCheckHistory)
router.get('/items', getChecklistItems)
router.get('/:checkId', getResumeCheckById)

export default router
