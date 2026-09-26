// Notification service: CRUD operations for notifications.
// Traces to FR-NOT-01, FR-NOT-02.
import Notification from '../models/Notification.model.js'
import { ApiError } from '../utils/api-error.js'

// Get user's notifications with pagination
export async function getUserNotifications(userId, queryParams) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', read, type } = queryParams

  const filter = { user: userId }
  if (read !== undefined) filter.read = read === 'true' || read === true
  if (type) filter.type = type

  let query = Notification.find(filter).lean()

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1
  query = query.sort(sort)

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [notifications, total] = await Promise.all([
    query.skip(skip).limit(limitNum),
    Notification.countDocuments(filter),
  ])

  return {
    notifications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get unread count for user
export async function getUnreadCount(userId) {
  return Notification.countDocuments({ user: userId, read: false })
}

// Get single notification by ID (must belong to user)
export async function getNotificationById(notificationId, userId) {
  const notification = await Notification.findOne({ _id: notificationId, user: userId }).lean()
  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND')
  }
  return notification
}

// Mark notification as read
export async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true } },
    { new: true }
  ).lean()

  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND')
  }
  return notification
}

// Mark all notifications as read for user
export async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true } }
  )
  return { modifiedCount: result.modifiedCount }
}

// Create notification (internal use by other services)
export async function createNotification(data) {
  const notification = await Notification.create(data)
  return notification.toObject()
}

// Create multiple notifications (bulk)
export async function createNotifications(notifications) {
  if (!notifications.length) return { insertedCount: 0 }
  const result = await Notification.insertMany(notifications)
  return { insertedCount: result.length }
}

export default {
  getUserNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  createNotification,
  createNotifications,
}
