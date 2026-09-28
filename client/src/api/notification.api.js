// Notification API client: wraps the /notifications HTTP calls.
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message ?? 'Request failed')
    err.status = res.status
    err.code = data.code
    err.details = data.details
    throw err
  }
  return data
}

// Get user's notifications
export async function getMyNotifications(params = {}) {
  const query = new URLSearchParams()
  if (params.read !== undefined) query.set('read', String(params.read))
  if (params.type) query.set('type', params.type)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const res = await fetch(`${API_BASE}/notifications/me?${query.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get unread count for bell badge
export async function getUnreadCount() {
  const res = await fetch(`${API_BASE}/notifications/me/unread-count`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single notification
export async function getNotificationById(id) {
  const res = await fetch(`${API_BASE}/notifications/me/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Mark notification as read
export async function markAsRead(id) {
  const res = await fetch(`${API_BASE}/notifications/me/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Mark all notifications as read
export async function markAllAsRead() {
  const res = await fetch(`${API_BASE}/notifications/me/read-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
}
