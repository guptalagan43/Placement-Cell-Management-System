import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from './error-handler.js'
import { ApiError } from '../utils/api-error.js'

// Minimal Express-like req/res doubles so the handler can be exercised in
// isolation, including the generic (non-ApiError) 500 branch.
function makeRes() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

const req = { method: 'GET', originalUrl: '/x' }

describe('errorHandler', () => {
  it('maps an ApiError to its status/code/message in the { success, message, code } contract', () => {
    const res = makeRes()
    errorHandler(new ApiError(403, 'Nope', 'FORBIDDEN'), req, res, () => {})
    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ success: false, message: 'Nope', code: 'FORBIDDEN' })
  })

  it('maps an unexpected (non-ApiError) error to a generic 500 without leaking detail', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeRes()
    errorHandler(new Error('secret internal detail: db password xyz'), req, res, () => {})
    expect(res.statusCode).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INTERNAL_ERROR')
    expect(res.body.message).not.toContain('secret internal detail')
    expect(res.body).not.toHaveProperty('stack')
    errorSpy.mockRestore()
  })
})
