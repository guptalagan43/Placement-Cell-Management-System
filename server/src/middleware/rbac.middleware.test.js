import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import express from 'express'
import cookieParser from 'cookie-parser'
import { notFound } from '../middleware/not-found.js'
import { errorHandler } from '../middleware/error-handler.js'
import { authenticate } from './auth.middleware.js'
import {
  authorize,
  requireStudent,
  requireCoordinator,
  requireTPO,
  requireCoordinatorOrTPO,
  requireAnyRole,
} from './rbac.middleware.js'
import User from '../models/User.model.js'
import { generateAccessToken } from '../services/auth.service.js'

let mongod
let app

// Create a test app factory with test routes for each RBAC guard
function createTestApp() {
  const testApp = express()
  testApp.use(express.json())
  testApp.use(cookieParser())

  // Test routes for each role guard
  const testRouter = express.Router()

  // All authenticated users
  testRouter.get('/any', authenticate, requireAnyRole, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  // Student only
  testRouter.get('/student', authenticate, requireStudent, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  // Coordinator only
  testRouter.get('/coordinator', authenticate, requireCoordinator, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  // TPO only
  testRouter.get('/tpo', authenticate, requireTPO, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  // Coordinator or TPO
  testRouter.get('/coordinator-or-tpo', authenticate, requireCoordinatorOrTPO, (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  // Factory-based authorize with custom roles
  testRouter.get('/custom', authenticate, authorize('student', 'tpo'), (req, res) => {
    res.json({ success: true, user: req.user.toJSON() })
  })

  testApp.use('/test', testRouter)
  testApp.use(notFound)
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

describe('RBAC Middleware', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let tpoUser, tpoToken

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-rbac@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coordinator-rbac@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    tpoUser = new User({
      email: 'tpo-rbac@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)
  })

  describe('requireAnyRole (all authenticated)', () => {
    it('allows student', async () => {
      const res = await request(app).get('/test/any').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('student')
    })

    it('allows coordinator', async () => {
      const res = await request(app)
        .get('/test/any')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('coordinator')
    })

    it('allows TPO', async () => {
      const res = await request(app).get('/test/any').set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('tpo')
    })
  })

  describe('requireStudent', () => {
    it('allows student', async () => {
      const res = await request(app)
        .get('/test/student')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
    })

    it('rejects coordinator with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/test/student')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects TPO with FORBIDDEN', async () => {
      const res = await request(app).get('/test/student').set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('requireCoordinator', () => {
    it('allows coordinator', async () => {
      const res = await request(app)
        .get('/test/coordinator')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(200)
    })

    it('rejects student with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/test/coordinator')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects TPO with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/test/coordinator')
        .set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('requireTPO', () => {
    it('allows TPO', async () => {
      const res = await request(app).get('/test/tpo').set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(200)
    })

    it('rejects student with FORBIDDEN', async () => {
      const res = await request(app).get('/test/tpo').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects coordinator with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/test/tpo')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('requireCoordinatorOrTPO', () => {
    it('allows coordinator', async () => {
      const res = await request(app)
        .get('/test/coordinator-or-tpo')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(200)
    })

    it('allows TPO', async () => {
      const res = await request(app)
        .get('/test/coordinator-or-tpo')
        .set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(200)
    })

    it('rejects student with FORBIDDEN', async () => {
      const res = await request(app)
        .get('/test/coordinator-or-tpo')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('authorize factory with custom roles', () => {
    it('allows student (custom: student, tpo)', async () => {
      const res = await request(app)
        .get('/test/custom')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(200)
    })

    it('allows TPO (custom: student, tpo)', async () => {
      const res = await request(app).get('/test/custom').set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(200)
    })

    it('rejects coordinator (custom: student, tpo)', async () => {
      const res = await request(app)
        .get('/test/custom')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('error when authenticate not run first', () => {
    it('throws AUTH_REQUIRED if req.user missing', async () => {
      // Create a route that uses authorize without authenticate
      const badApp = express()
      badApp.use(express.json())
      badApp.get('/bad', authorize('student'), (req, res) => {
        res.json({ success: true })
      })
      badApp.use(notFound)
      badApp.use(errorHandler)

      const res = await request(badApp).get('/bad')
      expect(res.status).toBe(500)
      expect(res.body.code).toBe('AUTH_REQUIRED')
    })
  })

  describe('validate roles at startup', () => {
    it('throws on invalid role in authorize()', () => {
      expect(() => authorize('invalid-role')).toThrow(/Invalid role/)
    })
  })
})
