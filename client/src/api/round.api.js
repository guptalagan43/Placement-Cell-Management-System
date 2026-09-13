// Round API client: wraps the /rounds HTTP calls.
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

// Get rounds for a drive (coordinator/TPO)
export async function getRounds(driveId, params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/drives/${driveId}/rounds?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get rounds for a drive (student-facing, published+ drives only)
export async function getRoundsForStudent(driveId) {
  const res = await fetch(`${API_BASE}/drives/${driveId}/rounds/student`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single round by ID (coordinator/TPO)
export async function getRoundById(roundId) {
  const res = await fetch(`${API_BASE}/rounds/${roundId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Create round (coordinator/TPO)
export async function createRound(driveId, data) {
  const res = await fetch(`${API_BASE}/drives/${driveId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Update round (coordinator/TPO)
export async function updateRound(roundId, data) {
  const res = await fetch(`${API_BASE}/rounds/${roundId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Delete round (coordinator/TPO)
export async function deleteRound(roundId) {
  const res = await fetch(`${API_BASE}/rounds/${roundId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getRounds,
  getRoundsForStudent,
  getRoundById,
  createRound,
  updateRound,
  deleteRound,
}
