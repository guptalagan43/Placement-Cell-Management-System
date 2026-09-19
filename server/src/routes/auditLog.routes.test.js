// AuditLog routes integration tests
// Traces to FR-AUD-02.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
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
let coordinatorUser
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
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password: 'TestPass123' })
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
  // Clear audit logs before each test (bypass Mongoose middleware since AuditLog is immutable)
  await AuditLog.collection.deleteMany({})
  await User.deleteMany({})

  // Create test users
  tpoUser = await createTestUser(ROLES.TPO)
  coordinatorUser = await createTestUser(ROLES.COORDINATOR, 'Computer Science & Engineering')
  _studentUser = await createTestUser(ROLES.STUDENT)

  // Get tokens
  tpoToken = await loginAndGetToken('tpo@test.com')
  coordinatorToken = await loginAndGetToken('coordinator@test.com')
  studentToken = await loginAndGetToken('student@test.com')
})

describe('AuditLog routes', () => {
  let auditLog1

  beforeEach(async () => {
    // Create test audit log entries
    auditLog1 = await AuditLog.create({
      actor: tpoUser._id,
      action: 'eligibility_override',
      target: {
        entityType: 'Application',
        entityId: new mongoose.Types.ObjectId(),
      },
      reason: 'Student has exceptional circumstances',
      metadata: { drive: new mongoose.Types.ObjectId(), student: new mongoose.Types.ObjectId() },
      timestamp: new Date('2024-01-15T10:00:00Z'),
    })

    await AuditLog.create({
      actor: coordinatorUser._id,
      action: 'round_status_update',
      target: {
        entityType: 'Application',
        entityId: new mongoose.Types.ObjectId(),
      },
      reason: 'Student cleared technical round',
      metadata: { round: new mongoose.Types.ObjectId() },
      timestamp: new Date('2024-01-16T10:00:00Z'),
    })

    await AuditLog.create({
      actor: tpoUser._id,
      action: 'company_create',
      target: {
        entityType: 'Company',
        entityId: new mongoose.Types.ObjectId(),
      },
      reason: 'New company added for placement season',
      timestamp: new Date('2024-01-17T10:00:00Z'),
    })
  })

  describe('GET /audit-logs', () => {
    it('returns paginated audit logs for TPO', async () => {
      const res = await request(app)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(3)
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      })
    })

    it('rejects coordinator with 403', async () => {
      const res = await request(app)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects student with 403', async () => {
      const res = await request(app)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/audit-logs').expect(401)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('UNAUTHORIZED')
    })

    it('filters by actor', async () => {
      const res = await request(app)
        .get(`/audit-logs?actor=${tpoUser._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(2)
      expect(res.body.auditLogs.every((log) => log.actor._id === tpoUser._id.toString())).toBe(true)
    })

    it('filters by action', async () => {
      const res = await request(app)
        .get('/audit-logs?action=eligibility_override')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(1)
      expect(res.body.auditLogs[0].action).toBe('eligibility_override')
    })

    it('filters by dateFrom', async () => {
      const res = await request(app)
        .get('/audit-logs?dateFrom=2024-01-16T00:00:00.000Z')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(2)
      expect(new Date(res.body.auditLogs[0].timestamp) >= new Date('2024-01-16T00:00:00.000Z')).toBe(true)
    })

    it('filters by dateTo', async () => {
      const res = await request(app)
        .get('/audit-logs?dateTo=2024-01-16T23:59:59.999Z')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(2)
      expect(new Date(res.body.auditLogs[0].timestamp) <= new Date('2024-01-16T23:59:59.999Z')).toBe(true)
    })

    it('filters by targetEntityType', async () => {
      const res = await request(app)
        .get('/audit-logs?targetEntityType=Company')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(1)
      expect(res.body.auditLogs[0].target.entityType).toBe('Company')
    })

    it('filters by targetEntityId', async () => {
      const targetId = auditLog1.target.entityId.toString()
      const res = await request(app)
        .get(`/audit-logs?targetEntityId=${targetId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(1)
      expect(res.body.auditLogs[0].target.entityId).toBe(targetId)
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/audit-logs?page=1&limit=2')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs).toHaveLength(2)
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      })
    })

    it('supports sorting', async () => {
      const res = await request(app)
        .get('/audit-logs?sortBy=timestamp&sortOrder=asc')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      const timestamps = res.body.auditLogs.map((log) => new Date(log.timestamp).getTime())
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b))
    })

    it('populates actor with name, email, role', async () => {
      const res = await request(app)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLogs[0].actor).toHaveProperty('email')
      expect(res.body.auditLogs[0].actor).toHaveProperty('role')
    })
  })

  describe('GET /audit-logs/actions/list', () => {
    it('returns distinct action types for TPO', async () => {
      const res = await request(app)
        .get('/audit-logs/actions/list')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.actions).toEqual(
        expect.arrayContaining(['eligibility_override', 'round_status_update', 'company_create'])
      )
    })

    it('rejects coordinator with 403', async () => {
      const res = await request(app)
        .get('/audit-logs/actions/list')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /audit-logs/actors/list', () => {
    it('returns actors with action counts for TPO', async () => {
      const res = await request(app)
        .get('/audit-logs/actors/list')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.actors).toHaveLength(2)

      const tpoActor = res.body.actors.find((a) => a._id === tpoUser._id.toString())
      expect(tpoActor).toBeDefined()
      expect(tpoActor.count).toBe(2)
      expect(tpoActor.name).toBe(tpoUser.name)
      expect(tpoActor.email).toBe(tpoUser.email)
      expect(tpoActor.role).toBe(tpoUser.role)

      const coordinatorActor = res.body.actors.find((a) => a._id === coordinatorUser._id.toString())
      expect(coordinatorActor).toBeDefined()
      expect(coordinatorActor.count).toBe(1)
    })

    it('rejects coordinator with 403', async () => {
      const res = await request(app)
        .get('/audit-logs/actors/list')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /audit-logs/:id', () => {
    it('returns single audit log entry for TPO', async () => {
      const res = await request(app)
        .get(`/audit-logs/${auditLog1._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.auditLog._id).toBe(auditLog1._id.toString())
      expect(res.body.auditLog.action).toBe('eligibility_override')
      expect(res.body.auditLog.reason).toBe('Student has exceptional circumstances')
      expect(res.body.auditLog.actor).toHaveProperty('email')
      expect(res.body.auditLog.actor).toHaveProperty('role')
    })

    it('returns 404 for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/audit-logs/${fakeId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('AUDIT_LOG_NOT_FOUND')
    })

    it('rejects coordinator with 403', async () => {
      const res = await request(app)
        .get(`/audit-logs/${auditLog1._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })
})