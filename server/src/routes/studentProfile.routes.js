// StudentProfile routes: self-profile (student) and scoped list (coordinator/TPO).
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireStudent, requireCoordinatorOrTPO } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  getSelfProfile,
  updateSelfProfile,
  getProfilesList,
  getProfileById,
  updateProfileById,
} from '../controllers/studentProfile.controller.js'

const router = Router()

// Student self-profile routes (require student role)
router.get('/me/profile', authenticate, requireStudent, getSelfProfile)
router.put('/me/profile', authenticate, requireStudent, updateSelfProfile)

// Coordinator/TPO scoped list and individual access
router.get('/', authenticate, requireCoordinatorOrTPO, departmentScope, getProfilesList)
router.get('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, getProfileById)
router.put('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, updateProfileById)

export default router
