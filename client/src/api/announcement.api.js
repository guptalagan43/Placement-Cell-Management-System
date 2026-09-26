// Announcement API client: wraps the /announcements HTTP calls.
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

// Student-facing: get announcements list
export async function getAnnouncements(params = {}) {
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const res = await fetch(`${API_BASE}/announcements?${query.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single announcement
export async function getAnnouncementById(id) {
  const res = await fetch(`${API_BASE}/announcements/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default { getAnnouncements, getAnnouncementById }
