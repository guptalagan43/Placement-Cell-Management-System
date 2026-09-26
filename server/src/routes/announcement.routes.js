// Announcement routes: student-facing read, coordinator/TPO CRUD.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import {
  requireCoordinatorOrTPO,
  requireStudent,
  requireAnyRole,
} from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  getAnnouncements,
  getAnnouncementsAdmin,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js'

const router = Router()

// Admin/Coordinator routes (must come before /:id to avoid route matching conflicts)
router.get('/admin', authenticate, requireCoordinatorOrTPO, departmentScope, getAnnouncementsAdmin)
router.post('/', authenticate, requireCoordinatorOrTPO, createAnnouncement)
router.put('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, updateAnnouncement)
router.delete('/:id', authenticate, requireCoordinatorOrTPO, departmentScope, deleteAnnouncement)

// Student-facing routes (students only)
router.get('/', authenticate, requireStudent, getAnnouncements)

// All authenticated users can view single announcement (scoping handled in service)
router.get('/:id', authenticate, requireAnyRole, departmentScope, getAnnouncementById)

export default router
