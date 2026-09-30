// Calendar routes: Student-facing calendar aggregation.
// Student only (own calendar).
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireStudent } from '../middleware/rbac.middleware.js'
import { getMyCalendar } from '../controllers/calendar.controller.js'

const router = Router()

// Student calendar routes
router.get('/me/calendar', authenticate, requireStudent, getMyCalendar)

export default router
