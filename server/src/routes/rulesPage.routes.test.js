// RulesPage routes integration tests
// Traces to FR-RUL-01, FR-AUD-01.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import RulesPage from '../models/RulesPage.model.js'
import AuditLog from '../models/AuditLog.model.js'
import User from '../models/User.model.js'
import { ROLES } from '../constants/roles.js'
import createApp from '../app.js'

let mongoServer
let app
let tpoToken
let coordinatorToken
let studentToken
let tpoUser
let _coordinatorUser
let _studentUser

const createTestUser = async (role, department = null) => {
  const user = await User.create({
    email: `${role}@test.com`,
    password: 'TestPass123',
    role,
    department,
    active: true,
  })
  return user
}

const loginAndGetToken = async (email) => {
  const res = await request(app).post('/auth/login').send({ email, password: 'TestPass123' })
  return res.body.accessToken
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
  await mongoose.connect(mongoServer.getUri())

  app = createApp()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await RulesPage.deleteMany({})
  await AuditLog.collection.deleteMany({})
  await User.deleteMany({})

  // Create test users
  tpoUser = await createTestUser(ROLES.TPO)
  _coordinatorUser = await createTestUser(ROLES.COORDINATOR, 'Computer Science & Engineering')
  _studentUser = await createTestUser(ROLES.STUDENT)

  // Get tokens
  tpoToken = await loginAndGetToken('tpo@test.com')
  coordinatorToken = await loginAndGetToken('coordinator@test.com')
  studentToken = await loginAndGetToken('student@test.com')
})

describe('RulesPage routes', () => {
  describe('GET /rules', () => {
    it('returns empty rules page when none exists (public access)', async () => {
      const res = await request(app).get('/rules').expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.rulesPage).toEqual(
        expect.objectContaining({
          content: '',
          version: 0,
          editor: null,
          editedAt: null,
        })
      )
    })

    it('returns existing rules page with populated editor (public access)', async () => {
      await RulesPage.create({
        content: 'Test rules content',
        version: 1,
        editor: tpoUser._id,
      })

      const res = await request(app).get('/rules').expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.rulesPage.content).toBe('Test rules content')
      expect(res.body.rulesPage.version).toBe(1)
      expect(res.body.rulesPage.editor).toHaveProperty('email', 'tpo@test.com')
    })

    it('works without authentication', async () => {
      const res = await request(app).get('/rules').expect(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('PUT /rules', () => {
    it('creates first version when no rules page exists (TPO)', async () => {
      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: 'First version of rules' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.rulesPage.content).toBe('First version of rules')
      expect(res.body.rulesPage.version).toBe(1)
      expect(res.body.rulesPage.editor._id).toBe(tpoUser._id.toString())
    })

    it('increments version on update (TPO)', async () => {
      // Create initial version
      await RulesPage.create({
        content: 'Original content',
        version: 1,
        editor: tpoUser._id,
      })

      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: 'Updated content' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.rulesPage.content).toBe('Updated content')
      expect(res.body.rulesPage.version).toBe(2)
    })

    it('creates AuditLog entry on create', async () => {
      await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: 'First version' })
        .expect(200)

      const auditLogs = await AuditLog.find().lean()
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].action).toBe('rules_edit')
      expect(auditLogs[0].target.entityType).toBe('RulesPage')
      expect(auditLogs[0].metadata.previousVersion).toBe(0)
      expect(auditLogs[0].metadata.newVersion).toBe(1)
    })

    it('creates AuditLog entry on update with version metadata', async () => {
      await RulesPage.create({
        content: 'Original',
        version: 1,
        editor: tpoUser._id,
      })

      await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: 'Updated' })
        .expect(200)

      const auditLogs = await AuditLog.find().sort({ timestamp: 1 }).lean()
      expect(auditLogs).toHaveLength(1) // Only the update creates an audit log (test setup uses direct create)
      const updateLog = auditLogs[0]
      expect(updateLog.action).toBe('rules_edit')
      expect(updateLog.metadata.previousVersion).toBe(1)
      expect(updateLog.metadata.newVersion).toBe(2)
    })

    it('rejects coordinator with 403', async () => {
      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ content: 'Coordinator attempt' })
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects student with 403', async () => {
      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Student attempt' })
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).put('/rules').send({ content: 'No auth' }).expect(401)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('UNAUTHORIZED')
    })

    it('rejects empty content with 400', async () => {
      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: '' })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects content exceeding max length', async () => {
      const longContent = 'a'.repeat(50001)
      const res = await request(app)
        .put('/rules')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ content: longContent })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })
})
