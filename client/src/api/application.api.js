// Application API client: wraps the /applications HTTP calls.
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

// Create application (student)
export async function createApplication(data) {
  const res = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Get applications for a drive (coordinator/TPO)
export async function getDriveApplications(driveId, params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/drives/${driveId}/applications?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Update round status for an application (coordinator/TPO)
export async function updateRoundStatus(applicationId, data) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/round-status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Bulk update round statuses via CSV (coordinator/TPO)
export async function bulkUpdateRoundStatus(driveId, roundId, updates) {
  const res = await fetch(`${API_BASE}/drives/${driveId}/applications/bulk-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roundId, updates }),
  })
  return handleResponse(res)
}

// Get student's own applications
export async function getMyApplications(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/applications/my?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single application by ID
export async function getApplicationById(id) {
  const res = await fetch(`${API_BASE}/applications/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single application for student (with eligibility details)
export async function getApplicationForStudent(id) {
  const res = await fetch(`${API_BASE}/applications/student/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Withdraw application
export async function withdrawApplication(id) {
  const res = await fetch(`${API_BASE}/applications/${id}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationForStudent,
  withdrawApplication,
  getDriveApplications,
  updateRoundStatus,
  bulkUpdateRoundStatus,
}
