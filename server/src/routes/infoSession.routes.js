// InfoSession routes: CRUD for info sessions nested under drives.
// Coordinator/TPO can write (with department scoping via parent drive); all authenticated users can read.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  createInfoSession,
  getInfoSessions,
  getInfoSessionsForStudent,
  getInfoSessionById,
  updateInfoSession,
  deleteInfoSession,
} from '../controllers/infoSession.controller.js'

const router = Router()

// Student-facing routes (all authenticated users)
// These MUST come before the generic /info-sessions/:infoSessionId route to avoid conflicts
router.get(
  '/drives/:driveId/info-sessions/student',
  authenticate,
  requireAnyRole,
  getInfoSessionsForStudent
)

// Coordinator/TPO write operations (require department scoping via parent drive)
router.post(
  '/drives/:driveId/info-sessions',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  createInfoSession
)
router.get(
  '/drives/:driveId/info-sessions',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  getInfoSessions
)

// Individual info session operations (department scoping enforced via service layer)
router.get(
  '/info-sessions/:infoSessionId',
  authenticate,
  requireCoordinatorOrTPO,
  getInfoSessionById
)
router.put(
  '/info-sessions/:infoSessionId',
  authenticate,
  requireCoordinatorOrTPO,
  updateInfoSession
)
router.delete(
  '/info-sessions/:infoSessionId',
  authenticate,
  requireCoordinatorOrTPO,
  deleteInfoSession
)

export default router
