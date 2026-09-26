// Notification controller: handles notification routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as notificationSvc from '../services/notification.service.js'

// Validation schemas
const listQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    read: z.union([z.boolean(), z.string()]).optional(),
    type: z.string().optional(),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID'),
  }),
})

const markAllReadSchema = z.object({
  body: z.object({}).optional(),
})

// GET /notifications/me — user's notifications
export const getMyNotifications = [
  asyncHandler(async (req, res) => {
    const { query } = listQuerySchema.parse({ query: req.query })
    const result = await notificationSvc.getUserNotifications(req.user._id, query)
    res.json({ success: true, ...result })
  }),
]

// GET /notifications/me/unread-count — unread count
export const getUnreadCount = [
  asyncHandler(async (req, res) => {
    const count = await notificationSvc.getUnreadCount(req.user._id)
    res.json({ success: true, count })
  }),
]

// GET /notifications/me/:id — single notification
export const getNotificationById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const notification = await notificationSvc.getNotificationById(params.id, req.user._id)
    res.json({ success: true, notification })
  }),
]

// PUT /notifications/me/:id/read — mark as read
export const markAsRead = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const notification = await notificationSvc.markAsRead(params.id, req.user._id)
    res.json({ success: true, notification })
  }),
]

// PUT /notifications/me/read-all — mark all as read
export const markAllAsRead = [
  asyncHandler(async (req, res) => {
    markAllReadSchema.parse({ body: req.body })
    const result = await notificationSvc.markAllAsRead(req.user._id)
    res.json({ success: true, ...result })
  }),
]

export default {
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
}
