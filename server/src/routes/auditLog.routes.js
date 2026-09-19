// AuditLog routes: read-only access to audit log entries.
// TPO only (super admin).
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireTPO } from '../middleware/rbac.middleware.js'
import {
  getAuditLogs,
  getAuditLogById,
  getActionTypes,
  getActors,
} from '../controllers/auditLog.controller.js'

const router = Router()

// All routes require TPO role
router.use(authenticate, requireTPO)

// GET /audit-logs — list with filters, pagination, sorting
router.get('/', getAuditLogs)

// GET /audit-logs/actions/list — get action types for filter dropdown
router.get('/actions/list', getActionTypes)

// GET /audit-logs/actors/list — get actors for filter dropdown
router.get('/actors/list', getActors)

// GET /audit-logs/:id — get single audit log entry
router.get('/:id', getAuditLogById)

export default router