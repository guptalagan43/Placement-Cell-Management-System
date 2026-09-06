import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'

let mongod
let app

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
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

describe('POST /auth/login', () => {
  const testEmail = 'login-test@example.com'
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

  it('returns access token and user for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.accessToken).toBeDefined()
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.body.accessToken.split('.').length).toBe(3) // JWT has 3 parts
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe(testEmail)
    expect(res.body.user.role).toBe('student')
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('sets httpOnly refresh token cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })

    expect(res.headers['set-cookie']).toBeDefined()
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toContain('refreshToken=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/auth/refresh')
  })

  it('returns generic error for wrong password (no user-enumeration)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'WrongPass' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_CREDENTIALS')
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('returns generic error for non-existent email (no user-enumeration)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'AnyPass' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_CREDENTIALS')
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('returns 400 for missing email', async () => {
    const res = await request(app).post('/auth/login').send({ password: testPassword })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: testPassword })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 403 for deactivated account', async () => {
    // Deactivate the user
    await User.findOneAndUpdate({ email: testEmail }, { active: false })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED')
  })

  it('works for coordinator with department', async () => {
    await User.deleteMany({})
    const coord = new User({
      email: 'coord@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coord.save()

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'coord@example.com', password: 'CoordPass123!' })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('coordinator')
    expect(res.body.user.department).toBe('Computer Science & Engineering')
  })

  it('works for TPO (no department required)', async () => {
    await User.deleteMany({})
    const tpo = new User({
      email: 'tpo@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpo.save()

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'tpo@example.com', password: 'TpoPass123!' })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('tpo')
    expect(res.body.user.department).toBeNull()
  })
})
