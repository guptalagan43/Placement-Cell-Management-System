import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import { generatePasswordResetToken, verifyPasswordResetToken } from '../services/auth.service.js'

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

describe('POST /auth/forgot-password', () => {
  const testEmail = 'forgot-test@example.com'
  const testPassword = 'StrongPass123!'

  beforeEach(async () => {
    const user = new User({
      email: testEmail,
      password: testPassword,
      role: 'student',
      active: true,
    })
    await user.save()
  })

  it('returns generic success for existing email (no user enumeration)', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: testEmail })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('If the email exists')
  })

  it('returns generic success for non-existent email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('If the email exists')
  })

  it('returns 400 for missing email', async () => {
    const res = await request(app).post('/auth/forgot-password').send({})

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /auth/reset-password', () => {
  const testEmail = 'reset-test@example.com'
  const testPassword = 'StrongPass123!'
  let testUser
  let validResetToken

  beforeEach(async () => {
    testUser = new User({
      email: testEmail,
      password: testPassword,
      role: 'student',
      active: true,
    })
    await testUser.save()
    validResetToken = generatePasswordResetToken(testUser)
  })

  it('resets password with valid token', async () => {
    const newPassword = 'NewStrongPass456!'
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: validResetToken, password: newPassword })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('Password has been reset')

    // Verify new password works
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: newPassword })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.success).toBe(true)
  })

  it('rejects invalid token', async () => {
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'invalid.token.here', password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_RESET_TOKEN')
  })

  it('rejects expired token', async () => {
    // Create an expired token by manually signing with past expiry
    const jwt = await import('jsonwebtoken')
    const expiredToken = jwt.default.sign(
      { sub: testUser._id.toString(), email: testUser.email, type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '-1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: expiredToken, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_RESET_TOKEN')
  })

  it('rejects token for non-existent user', async () => {
    // Create token for deleted user
    const deletedUserId = new mongoose.Types.ObjectId()
    const jwt = await import('jsonwebtoken')
    const token = jwt.default.sign(
      { sub: deletedUserId.toString(), email: 'deleted@example.com', type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_RESET_TOKEN')
  })

  it('rejects token with mismatched email', async () => {
    // Create another user
    const otherUser = new User({
      email: 'other@example.com',
      password: 'OtherPass123!',
      role: 'student',
      active: true,
    })
    await otherUser.save()

    // Use valid token but with different user's email in payload
    const jwt = await import('jsonwebtoken')
    const token = jwt.default.sign(
      { sub: otherUser._id.toString(), email: 'wrong@example.com', type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_RESET_TOKEN')
  })

  it('returns 400 for missing token', async () => {
    const res = await request(app).post('/auth/reset-password').send({ password: 'NewPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for password too short', async () => {
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: validResetToken, password: 'short' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('allows login with new password after reset', async () => {
    const newPassword = 'BrandNewPass789!'
    await request(app)
      .post('/auth/reset-password')
      .send({ token: validResetToken, password: newPassword })

    // Old password should no longer work
    const oldLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
    expect(oldLoginRes.status).toBe(401)

    // New password should work
    const newLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: newPassword })
    expect(newLoginRes.status).toBe(200)
    expect(newLoginRes.body.success).toBe(true)
  })
})

describe('Password reset token service', () => {
  const testEmail = 'service-test@example.com'
  const testPassword = 'ServicePass123!'
  let testUser

  beforeEach(async () => {
    testUser = new User({
      email: testEmail,
      password: testPassword,
      role: 'student',
      active: true,
    })
    await testUser.save()
  })

  it('generates a valid password reset token', () => {
    const token = generatePasswordResetToken(testUser)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifies a valid password reset token', () => {
    const token = generatePasswordResetToken(testUser)
    const payload = verifyPasswordResetToken(token)

    expect(payload.sub).toBe(testUser._id.toString())
    expect(payload.email).toBe(testUser.email)
    expect(payload.type).toBe('password_reset')
  })

  it('throws on invalid password reset token', () => {
    expect(() => verifyPasswordResetToken('invalid.token.here')).toThrow()
  })

  it('throws on expired password reset token', () => {
    const jwt = require('jsonwebtoken')
    const expiredToken = jwt.sign(
      { sub: testUser._id.toString(), email: testUser.email, type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '-1h', issuer: 'pcms', audience: 'pcms-password-reset' }
    )
    expect(() => verifyPasswordResetToken(expiredToken)).toThrow()
  })

  it('includes correct issuer and audience', () => {
    const token = generatePasswordResetToken(testUser)
    const payload = verifyPasswordResetToken(token)

    expect(payload.iss).toBe('pcms')
    expect(payload.aud).toBe('pcms-password-reset')
  })

  it('is different from access/refresh tokens', () => {
    const resetToken = generatePasswordResetToken(testUser)
    const { generateAccessToken, generateRefreshToken } = require('../services/auth.service.js')

    const accessToken = generateAccessToken(testUser)
    const refreshToken = generateRefreshToken(testUser)

    expect(resetToken).not.toBe(accessToken)
    expect(resetToken).not.toBe(refreshToken)

    // Different audience
    const resetPayload = verifyPasswordResetToken(resetToken)
    const accessPayload = require('../services/auth.service.js').verifyAccessToken(accessToken)
    const refreshPayload = require('../services/auth.service.js').verifyRefreshToken(refreshToken)

    expect(resetPayload.aud).toBe('pcms-password-reset')
    expect(accessPayload.aud).toBe('pcms-client')
    expect(refreshPayload.aud).toBe('pcms-client')
  })
})
