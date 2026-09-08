// Resume API client: wraps the /students/me/resumes HTTP calls.
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

// Get signed upload parameters for direct Cloudinary upload
export async function getUploadParams() {
  const res = await fetch(`${API_BASE}/students/me/resumes/upload-params`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// List all resumes for the current student
export async function getResumes() {
  const res = await fetch(`${API_BASE}/students/me/resumes`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get default resume
export async function getDefaultResume() {
  const res = await fetch(`${API_BASE}/students/me/resumes/default`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Add resume metadata after client uploads to Cloudinary
export async function addResume(data) {
  const res = await fetch(`${API_BASE}/students/me/resumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Set a resume as default
export async function setDefaultResume(resumeId) {
  const res = await fetch(`${API_BASE}/students/me/resumes/${resumeId}/default`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Delete a resume
export async function deleteResume(resumeId) {
  const res = await fetch(`${API_BASE}/students/me/resumes/${resumeId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getUploadParams,
  getResumes,
  getDefaultResume,
  addResume,
  setDefaultResume,
  deleteResume,
}
