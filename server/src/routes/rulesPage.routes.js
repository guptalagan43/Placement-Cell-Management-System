// RulesPage routes: public read, TPO-only write with versioning.
// Traces to FR-RUL-01, FR-AUD-01.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireTPO } from '../middleware/rbac.middleware.js'
import { getRules, updateRules } from '../controllers/rulesPage.controller.js'

const router = Router()

// GET /rules — public endpoint to get current rules page (no auth required)
router.get('/', getRules)

// PUT /rules — update rules page (TPO only)
router.put('/', authenticate, requireTPO, updateRules)

export default router
