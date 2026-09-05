import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

describe('GET /health', () => {
  const app = createApp()

  it('returns 200 with a success payload', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('ok')
  })

  it('reports the current database connection state', async () => {
    const res = await request(app).get('/health')
    expect(res.body).toHaveProperty('database')
  })
})

describe('unmatched routes', () => {
  const app = createApp()

  it('return the 404 error contract { success, message, code }', async () => {
    const res = await request(app).get('/no-such-route')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      success: false,
      message: expect.stringContaining('Route not found'),
      code: 'NOT_FOUND',
    })
  })
})
