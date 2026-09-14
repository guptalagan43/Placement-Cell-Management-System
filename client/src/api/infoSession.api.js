// InfoSession API client: wraps the /info-sessions HTTP calls.
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

// Get info sessions for a drive (coordinator/TPO)
export async function getInfoSessions(driveId, params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(
    `${API_BASE}/drives/${driveId}/info-sessions?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }
  )
  return handleResponse(res)
}

// Get info sessions for a drive (student-facing, published+ drives only)
export async function getInfoSessionsForStudent(driveId) {
  const res = await fetch(`${API_BASE}/drives/${driveId}/info-sessions/student`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single info session by ID (coordinator/TPO)
export async function getInfoSessionById(infoSessionId) {
  const res = await fetch(`${API_BASE}/info-sessions/${infoSessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Create info session (coordinator/TPO)
export async function createInfoSession(driveId, data) {
  const res = await fetch(`${API_BASE}/drives/${driveId}/info-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Update info session (coordinator/TPO)
export async function updateInfoSession(infoSessionId, data) {
  const res = await fetch(`${API_BASE}/info-sessions/${infoSessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Delete info session (coordinator/TPO)
export async function deleteInfoSession(infoSessionId) {
  const res = await fetch(`${API_BASE}/info-sessions/${infoSessionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getInfoSessions,
  getInfoSessionsForStudent,
  getInfoSessionById,
  createInfoSession,
  updateInfoSession,
  deleteInfoSession,
}
