// Application routes: CRUD for applications.
// Student can apply, view own applications, withdraw.
// Coordinator/TPO can update round statuses.
// TPO can override eligibility.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import {
  requireStudent,
  requireCoordinatorOrTPO,
  requireTPO,
  requireAnyRole,
} from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationForStudent,
  updateRoundStatus,
  withdrawApplication,
  overrideEligibility,
} from '../controllers/application.controller.js'

const router = Router()

// Student routes
router.post('/', authenticate, requireStudent, createApplication)

router.get('/my', authenticate, requireStudent, getMyApplications)

router.get('/student/:applicationId', authenticate, requireStudent, getApplicationForStudent)

router.get('/:applicationId', authenticate, requireAnyRole, getApplicationById)

router.post('/:applicationId/withdraw', authenticate, requireStudent, withdrawApplication)

// Coordinator/TPO routes (department scoped) - note: GET /drives/:driveId/applications and bulk-update are in drive.routes.js
router.put(
  '/:applicationId/round-status',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  updateRoundStatus
)

// TPO-only: Eligibility override with audit logging
router.post('/:applicationId/eligibility-override', authenticate, requireTPO, overrideEligibility)

export default router
