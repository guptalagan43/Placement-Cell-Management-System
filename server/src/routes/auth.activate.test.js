import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import { generatePasswordResetToken } from '../services/auth.service.js'

let mongod
let app

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
  process.env.FRONTEND_BASE_URL = 'http://localhost:5173'
  await mongoose.connect(mongod.getUri())
  app = createApp()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

describe('POST /auth/activate', () => {
  let testUser

  beforeEach(async () => {
    testUser = new User({
      email: 'activate-test@example.com',
      password: 'TempPass123!',
      role: 'student',
      active: true,
      mustResetPassword: true,
    })
    await testUser.save()
  })

  it('activates account with valid token and returns token pair', async () => {
    const token = generatePasswordResetToken(testUser)
    const newPassword = 'NewStrongPass456!'

    const res = await request(app).post('/auth/activate').send({ token, password: newPassword })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toBe('Account activated successfully.')
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe(testUser.email)
    expect(res.body.user.mustResetPassword).toBe(false)

    // Verify mustResetPassword is cleared in DB
    const updatedUser = await User.findById(testUser._id)
    expect(updatedUser.mustResetPassword).toBe(false)

    // Verify new password works for login
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: newPassword })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.success).toBe(true)
  })

  it('sets httpOnly refresh token cookie', async () => {
    const token = generatePasswordResetToken(testUser)
    const newPassword = 'NewStrongPass456!'

    const res = await request(app).post('/auth/activate').send({ token, password: newPassword })

    expect(res.headers['set-cookie']).toBeDefined()
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toContain('refreshToken=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/auth/refresh')
  })

  it('rejects invalid token', async () => {
    const res = await request(app)
      .post('/auth/activate')
      .send({ token: 'invalid.token.here', password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_ACTIVATION_TOKEN')
  })

  it('rejects expired token', async () => {
    const jwt = await import('jsonwebtoken')
    const expiredToken = jwt.default.sign(
      { sub: testUser._id.toString(), email: testUser.email, type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '-1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app)
      .post('/auth/activate')
      .send({ token: expiredToken, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_ACTIVATION_TOKEN')
  })

  it('rejects token for non-existent user', async () => {
    const deletedUserId = new mongoose.Types.ObjectId()
    const jwt = await import('jsonwebtoken')
    const token = jwt.default.sign(
      { sub: deletedUserId.toString(), email: 'deleted@example.com', type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app).post('/auth/activate').send({ token, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_ACTIVATION_TOKEN')
  })

  it('rejects token with mismatched email', async () => {
    const otherUser = new User({
      email: 'other@example.com',
      password: 'OtherPass123!',
      role: 'student',
      active: true,
    })
    await otherUser.save()

    const jwt = await import('jsonwebtoken')
    const token = jwt.default.sign(
      { sub: otherUser._id.toString(), email: 'wrong@example.com', type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app).post('/auth/activate').send({ token, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_ACTIVATION_TOKEN')
  })

  it('rejects activation for already activated user', async () => {
    // Create user without mustResetPassword
    const activatedUser = new User({
      email: 'activated@example.com',
      password: 'ActivatedPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await activatedUser.save()

    const token = generatePasswordResetToken(activatedUser)

    const res = await request(app).post('/auth/activate').send({ token, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('ALREADY_ACTIVATED')
  })

  it('returns 400 for missing token', async () => {
    const res = await request(app).post('/auth/activate').send({ password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for password too short', async () => {
    const token = generatePasswordResetToken(testUser)

    const res = await request(app).post('/auth/activate').send({ token, password: 'short' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('works for coordinator role with mustResetPassword', async () => {
    const coordUser = new User({
      email: 'coord-activate@example.com',
      password: 'TempPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
      mustResetPassword: true,
    })
    await coordUser.save()

    const token = generatePasswordResetToken(coordUser)

    const res = await request(app)
      .post('/auth/activate')
      .send({ token, password: 'NewCoordPass456!' })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('coordinator')
    expect(res.body.user.mustResetPassword).toBe(false)
  })
})
