// Statistics Comparison API client: wraps the /stats comparison HTTP calls.
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

export async function getAvailableSeasons() {
  const res = await fetch(`${API_BASE}/stats/seasons`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export async function compareSeasons(years) {
  const res = await fetch(`${API_BASE}/stats/compare?years=${encodeURIComponent(years)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getAvailableSeasons,
  compareSeasons,
}
