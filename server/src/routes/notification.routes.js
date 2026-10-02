// Notification routes: user-facing notification management.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireAnyRole } from '../middleware/rbac.middleware.js'
import {
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js'

const router = Router()

// All routes require any authenticated role (students, coordinators, and TPO all get notifications)
router.use(authenticate, requireAnyRole)

// GET /notifications/me — user's notifications
router.get('/me', getMyNotifications)

// GET /notifications/me/unread-count — unread count
router.get('/me/unread-count', getUnreadCount)

// GET /notifications/me/:id — single notification
router.get('/me/:id', getNotificationById)

// PUT /notifications/me/:id/read — mark as read
router.put('/me/:id/read', markAsRead)

// PUT /notifications/me/read-all — mark all as read
router.put('/me/read-all', markAllAsRead)

export default router
