// ResumeCheck API client: wraps the /resume-checks HTTP calls.
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

// Run checklist on a resume (student only)
export async function runResumeCheck(resumeId) {
  const res = await fetch(`${API_BASE}/resume-checks/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ resumeId }),
  })
  return handleResponse(res)
}

// Get checklist history (student only)
export async function getResumeCheckHistory(limit = 20) {
  const res = await fetch(`${API_BASE}/resume-checks/history?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get checklist items definition (student only)
export async function getChecklistItems() {
  const res = await fetch(`${API_BASE}/resume-checks/items`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single check result (student only)
export async function getResumeCheckById(checkId) {
  const res = await fetch(`${API_BASE}/resume-checks/${checkId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  runResumeCheck,
  getResumeCheckHistory,
  getChecklistItems,
  getResumeCheckById,
}
