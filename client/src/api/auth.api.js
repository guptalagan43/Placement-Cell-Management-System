// Auth API client: wraps the /auth HTTP calls. Uses native fetch (rules.md §3).
// Access token is stored in memory (AuthContext); refresh token is httpOnly cookie.

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

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Required for httpOnly refresh cookie
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function logout() {
  // Refresh token is cleared server-side via cookie; access token cleared in memory.
  // If a /auth/logout endpoint is added later, call it here.
  return { success: true }
}
