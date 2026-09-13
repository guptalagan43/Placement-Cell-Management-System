// Round routes: CRUD for rounds nested under drives.
// Coordinator/TPO can write (with department scoping via parent drive); all authenticated users can read.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  createRound,
  getRounds,
  getRoundsForStudent,
  getRoundById,
  updateRound,
  deleteRound,
} from '../controllers/round.controller.js'

const router = Router()

// Student-facing routes (all authenticated users)
// These MUST come before the generic /rounds/:roundId route to avoid conflicts
router.get('/drives/:driveId/rounds/student', authenticate, requireAnyRole, getRoundsForStudent)

// Coordinator/TPO write operations (require department scoping via parent drive)
router.post(
  '/drives/:driveId/rounds',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  createRound
)
router.get(
  '/drives/:driveId/rounds',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  getRounds
)

// Individual round operations (department scoping enforced via service layer)
router.get('/rounds/:roundId', authenticate, requireCoordinatorOrTPO, getRoundById)
router.put('/rounds/:roundId', authenticate, requireCoordinatorOrTPO, updateRound)
router.delete('/rounds/:roundId', authenticate, requireCoordinatorOrTPO, deleteRound)

export default router
