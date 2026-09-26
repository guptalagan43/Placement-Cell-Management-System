// Rules API client: wraps the /rules HTTP calls.
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

// Get current rules page (public)
export async function getRules() {
  const res = await fetch(`${API_BASE}/rules`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Update rules page (TPO only)
export async function updateRules(content) {
  const res = await fetch(`${API_BASE}/rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  return handleResponse(res)
}

export default { getRules, updateRules }
