// Statistics API client: wraps the /stats HTTP calls.
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

export async function getOverviewStats() {
  const res = await fetch(`${API_BASE}/stats/overview`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export async function getDriveFunnel(driveId) {
  const res = await fetch(`${API_BASE}/stats/drive/${driveId}/funnel`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getOverviewStats,
  getDriveFunnel,
}
