// Statistics routes: Aggregation APIs for placement statistics.
// Coordinator/TPO only with department scoping.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO } from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import { getOverviewStats, getDriveFunnel } from '../controllers/stats.controller.js'

const router = Router()

// All stats routes require coordinator or TPO role with department scoping
router.use(authenticate, requireCoordinatorOrTPO, departmentScope)

router.get('/overview', getOverviewStats)
router.get('/drive/:driveId/funnel', getDriveFunnel)

export default router
