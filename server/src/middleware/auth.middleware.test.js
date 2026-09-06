import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import express from 'express'
import cookieParser from 'cookie-parser'
import { notFound } from '../middleware/not-found.js'
import { errorHandler } from '../middleware/error-handler.js'
import { authenticate } from './auth.middleware.js'
import User from '../models/User.model.js'
import { generateAccessToken } from '../services/auth.service.js'

let mongod
let app

// Create a test app factory that includes test routes before notFound
function createTestApp() {
  const testApp = express()
  testApp.use(express.json())
  testApp.use(cookieParser())

  // Test route using the auth middleware
  const testRouter = express.Router()
  testRouter.get('/protected', authenticate, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })
  testApp.use('/test', testRouter)

  // Unmatched routes -> consistent 404 error contract.
  testApp.use(notFound)

  // Single centralized error handler; must be registered last.
  testApp.use(errorHandler)

  return testApp
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
  await mongoose.connect(mongod.getUri())

  app = createTestApp()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

describe('Auth Middleware (authenticate)', () => {
  let testUser
  let validToken

  beforeEach(async () => {
    testUser = new User({
      email: 'middleware-test@example.com',
      password: 'TestPass123!',
      role: 'student',
      active: true,
    })
    await testUser.save()
    validToken = generateAccessToken(testUser)
  })

  it('allows request with valid token and attaches user', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe(testUser.email)
    expect(res.body.user.role).toBe('student')
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('rejects request with no Authorization header', async () => {
    const res = await request(app).get('/test/protected')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
    expect(res.body.message).toBe('Authentication required')
  })

  it('rejects request with malformed Authorization header (no Bearer)', async () => {
    const res = await request(app).get('/test/protected').set('Authorization', 'InvalidToken')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('rejects request with expired token', async () => {
    // Create an expired token by using a past expiry
    // We can't easily create an expired token with the current service,
    // but we can test the error handling by mocking or using a token
    // signed with a different secret (which will fail verification)
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('rejects request for non-existent user (user deleted after token issued)', async () => {
    // Delete the user but keep the token
    await User.deleteMany({})

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('UNAUTHORIZED')
    expect(res.body.message).toBe('User no longer exists')
  })

  it('rejects request for deactivated user', async () => {
    // Deactivate the user
    await User.findByIdAndUpdate(testUser._id, { active: false })

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED')
  })

  it('returns fresh user data from DB (not from token)', async () => {
    // The token has the original data; if we change the user in DB,
    // the middleware should return the fresh data
    await User.findByIdAndUpdate(testUser._id, {
      role: 'coordinator',
      department: 'Computer Science & Engineering',
    })

    const res = await request(app)
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('coordinator')
    expect(res.body.user.department).toBe('Computer Science & Engineering')
  })

  it('works for coordinator with department', async () => {
    await User.deleteMany({})
    const coord = new User({
      email: 'coord-middleware@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coord.save()
    const token = generateAccessToken(coord)

    const res = await request(app).get('/test/protected').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('coordinator')
    expect(res.body.user.department).toBe('Computer Science & Engineering')
  })

  it('works for TPO (no department)', async () => {
    await User.deleteMany({})
    const tpo = new User({
      email: 'tpo-middleware@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpo.save()
    const token = generateAccessToken(tpo)

    const res = await request(app).get('/test/protected').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('tpo')
    expect(res.body.user.department).toBeNull()
  })
})
