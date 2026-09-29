// FAQ API client: wraps the /faqs HTTP calls.
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

// Get published FAQs for students (no pagination)
export async function getPublishedFAQs() {
  const res = await fetch(`${API_BASE}/faqs/published`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get unique categories for filter dropdown
export async function getFAQCategories() {
  const res = await fetch(`${API_BASE}/faqs/categories`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get all FAQs with pagination/filter/sort/search (TPO)
export async function getFAQs(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const res = await fetch(`${API_BASE}/faqs?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Get single FAQ by ID (TPO)
export async function getFAQById(id) {
  const res = await fetch(`${API_BASE}/faqs/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

// Create FAQ (TPO only)
export async function createFAQ(data) {
  const res = await fetch(`${API_BASE}/faqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Update FAQ (TPO only)
export async function updateFAQ(id, data) {
  const res = await fetch(`${API_BASE}/faqs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// Delete FAQ (TPO only)
export async function deleteFAQ(id) {
  const res = await fetch(`${API_BASE}/faqs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return handleResponse(res)
}

export default {
  getPublishedFAQs,
  getFAQCategories,
  getFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
}
