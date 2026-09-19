// Offer API client: wraps the /offers HTTP calls.
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

// Issue an offer against an application (coordinator/TPO)
export async function issueOffer(applicationId, data) {
  const res = await fetch(`${API_BASE}/offers/${applicationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Get offer for an application
export async function getOfferByApplication(applicationId) {
  const res = await fetch(`${API_BASE}/offers/application/${applicationId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get offer by ID
export async function getOfferById(offerId) {
  const res = await fetch(`${API_BASE}/offers/${offerId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Respond to offer (student)
export async function respondToOffer(offerId, response) {
  const res = await fetch(`${API_BASE}/offers/${offerId}/respond`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response }),
  })
  return handleResponse(res)
}

// Get signed upload parameters for Cloudinary
export async function getOfferUploadParams() {
  const res = await fetch(`${API_BASE}/offers/upload-params`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  issueOffer,
  getOfferByApplication,
  getOfferById,
  respondToOffer,
  getOfferUploadParams,
}