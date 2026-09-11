// Drive API client: wraps the /drives HTTP calls.
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

// Get all drives (coordinator/TPO)
export async function getDrives(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/drives?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get drives for students (published+ only)
export async function getDrivesForStudents(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/drives/student?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get active companies for drive creation dropdowns
export async function getActiveCompanies() {
  const res = await fetch(`${API_BASE}/drives/active-companies`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single drive by ID (coordinator/TPO)
export async function getDriveById(id) {
  const res = await fetch(`${API_BASE}/drives/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single drive by ID for students
export async function getDriveByIdForStudent(id) {
  const res = await fetch(`${API_BASE}/drives/student/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Create drive (coordinator/TPO)
export async function createDrive(data) {
  const res = await fetch(`${API_BASE}/drives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Update drive (coordinator/TPO)
export async function updateDrive(id, data) {
  const res = await fetch(`${API_BASE}/drives/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Delete drive (coordinator/TPO)
export async function deleteDrive(id) {
  const res = await fetch(`${API_BASE}/drives/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getDrives,
  getDrivesForStudents,
  getActiveCompanies,
  getDriveById,
  getDriveByIdForStudent,
  createDrive,
  updateDrive,
  deleteDrive,
}
