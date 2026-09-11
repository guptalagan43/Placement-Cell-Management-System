// Drive routes: CRUD for drives.
// Coordinator/TPO can write (with department scoping); all authenticated users can read.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  createDrive,
  getDrives,
  getDrivesForStudents,
  getActiveCompaniesForDrive,
  getDriveById,
  getDriveByIdForStudent,
  updateDrive,
  deleteDrive,
  updateDriveStatus,
  cloneDrive,
} from '../controllers/drive.controller.js'

const router = Router()

// Student-facing routes (all authenticated users)
// These MUST come before the generic /:id route to avoid conflicts
router.get('/student', authenticate, requireAnyRole, getDrivesForStudents)
router.get('/student/:id', authenticate, requireAnyRole, getDriveByIdForStudent)
router.get('/active-companies', authenticate, requireAnyRole, getActiveCompaniesForDrive)

// Coordinator/TPO write operations (require department scoping middleware)
router.post('/', authenticate, requireCoordinatorOrTPO, departmentScope, createDrive)
router.get('/', authenticate, requireCoordinatorOrTPO, departmentScope, getDrives)
router.get('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, getDriveById)
router.put('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, updateDrive)
router.delete('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, deleteDrive)

// Status lifecycle transition
router.patch(
  '/:id/status',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  updateDriveStatus
)

// Clone drive
router.post('/:id/clone', authenticate, requireCoordinatorOrTPO, departmentScope, cloneDrive)

export default router
