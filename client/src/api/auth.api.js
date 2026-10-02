// Auth API client: wraps all /auth HTTP calls. Uses native fetch (rules.md §3).
// Access token stored in memory (AuthContext); refresh token is httpOnly cookie.

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

// ── Login (2-step) ──────────────────────────────────────────────────────────

// Step 1: email + password → OTP sent to college email
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

// Step 2: email + OTP → token pair
export async function verifyLoginOtp(email, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, otp }),
  })
  return handleResponse(res)
}

// ── Forgot Password (3-step) ────────────────────────────────────────────────

// Step 1: email → OTP sent
export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse(res)
}

// Step 2: email + OTP → reset token
export async function verifyForgotOtp(email, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-forgot-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  return handleResponse(res)
}

// Step 3: reset token + new password → done
export async function resetPassword(token, password) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  return handleResponse(res)
}

// ── Account Activation / New Student (2-step) ───────────────────────────────

// Step 1: college email → temp password emailed
export async function requestActivation(email) {
  const res = await fetch(`${API_BASE}/auth/request-activation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse(res)
}

// Step 2: email + temp password + new password → account activated
export async function activate(email, tempPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tempPassword, newPassword }),
  })
  return handleResponse(res)
}

export async function logout() {
  return { success: true }
}
