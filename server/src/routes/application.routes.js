// Application routes: CRUD for applications.
// Student can apply, view own applications, withdraw.
// Coordinator/TPO can view drive applications, update round statuses, bulk update.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import {
  requireStudent,
  requireCoordinatorOrTPO,
  requireAnyRole,
} from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationForStudent,
  getDriveApplications,
  updateRoundStatus,
  withdrawApplication,
  bulkUpdateRoundStatus,
} from '../controllers/application.controller.js'

const router = Router()

// Student routes
router.post('/', authenticate, requireStudent, createApplication)

router.get('/my', authenticate, requireStudent, getMyApplications)

router.get('/student/:applicationId', authenticate, requireStudent, getApplicationForStudent)

router.get('/:applicationId', authenticate, requireAnyRole, getApplicationById)

router.post('/:applicationId/withdraw', authenticate, requireStudent, withdrawApplication)

// Coordinator/TPO routes (department scoped)
router.get(
  '/drives/:driveId/applications',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  getDriveApplications
)

router.put(
  '/:applicationId/round-status',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  updateRoundStatus
)

router.post(
  '/drives/:driveId/applications/bulk-update',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  bulkUpdateRoundStatus
)

export default router
