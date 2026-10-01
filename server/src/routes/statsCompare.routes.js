// Statistics Comparison routes: Year-over-year comparison.
// TPO only (coordinators can view available seasons but not compare across departments).
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO, requireTPO } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import { compareSeasons, getAvailableSeasons } from '../controllers/statsCompare.controller.js'

const router = Router()

// All stats compare routes require authentication
router.use(authenticate)

// Available seasons - coordinator/TPO
router.get('/seasons', requireCoordinatorOrTPO, departmentScope, getAvailableSeasons)

// Compare seasons - TPO only (institute-wide comparison)
router.get('/compare', requireTPO, compareSeasons)

export default router
