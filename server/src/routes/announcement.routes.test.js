// Announcement routes integration tests
// Traces to FR-ANN-01.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Announcement from '../models/Announcement.model.js'
import User from '../models/User.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
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
let _studentProfile

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
  await Announcement.deleteMany({})
  await User.deleteMany({})
  await StudentProfile.deleteMany({})
  await Drive.deleteMany({})
  await Company.deleteMany({})

  // Create test users
  tpoUser = await createTestUser(ROLES.TPO)
  _coordinatorUser = await createTestUser(ROLES.COORDINATOR, 'Computer Science & Engineering')
  _studentUser = await createTestUser(ROLES.STUDENT)

  // Create student profile for student user
  _studentProfile = await StudentProfile.create({
    user: _studentUser._id,
    rollNumber: 'STU001',
    branch: 'Computer Science & Engineering',
    batch: 2025,
  })

  // Get tokens
  tpoToken = await loginAndGetToken('tpo@test.com')
  coordinatorToken = await loginAndGetToken('coordinator@test.com')
  studentToken = await loginAndGetToken('student@test.com')
})

describe('Announcement routes', () => {
  describe('GET /announcements (student-facing)', () => {
    it('returns empty list when no announcements exist', async () => {
      const res = await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('returns non-expired announcements for student', async () => {
      await Announcement.create([
        {
          title: 'General Announcement',
          body: 'This is a general announcement',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Urgent Announcement',
          body: 'This is urgent',
          category: 'urgent',
          postedBy: tpoUser._id,
        },
        {
          title: 'Expired Announcement',
          body: 'This is expired',
          category: 'general',
          postedBy: tpoUser._id,
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      ])

      const res = await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
      expect(res.body.announcements.map((a) => a.title)).toEqual(
        expect.arrayContaining(['General Announcement', 'Urgent Announcement'])
      )
    })

    it('filters by category', async () => {
      await Announcement.create([
        {
          title: 'General',
          body: 'General body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Urgent',
          body: 'Urgent body',
          category: 'urgent',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements?category=urgent')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].category).toBe('urgent')
    })

    it('includes department-scoped announcements for student in that department', async () => {
      await Announcement.create([
        {
          title: 'General Announcement',
          body: 'General body',
          category: 'general',
          departmentScope: null,
          postedBy: tpoUser._id,
        },
        {
          title: 'CS Dept Announcement',
          body: 'CS department body',
          category: 'general',
          departmentScope: 'Computer Science & Engineering',
          postedBy: tpoUser._id,
        },
        {
          title: 'IT Dept Announcement',
          body: 'IT department body',
          category: 'general',
          departmentScope: 'Information Technology',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
      expect(res.body.announcements.map((a) => a.title)).toEqual(
        expect.arrayContaining(['General Announcement', 'CS Dept Announcement'])
      )
    })

    it('excludes department-scoped announcements for other departments', async () => {
      await Announcement.create({
        title: 'IT Dept Announcement',
        body: 'IT department body',
        category: 'general',
        departmentScope: 'Information Technology',
        postedBy: tpoUser._id,
      })

      const res = await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(0)
    })

    it('sorts pinned announcements first', async () => {
      await Announcement.create([
        {
          title: 'Unpinned',
          body: 'Unpinned body',
          category: 'general',
          isPinned: false,
          postedBy: tpoUser._id,
        },
        {
          title: 'Pinned',
          body: 'Pinned body',
          category: 'general',
          isPinned: true,
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements[0].title).toBe('Pinned')
      expect(res.body.announcements[1].title).toBe('Unpinned')
    })

    it('supports pagination', async () => {
      const announcements = Array.from({ length: 5 }, (_, i) => ({
        title: `Announcement ${i}`,
        body: `Body ${i}`,
        category: 'general',
        postedBy: tpoUser._id,
      }))
      await Announcement.create(announcements)

      const res = await request(app)
        .get('/announcements?page=1&limit=2')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
      expect(res.body.pagination.total).toBe(5)
      expect(res.body.pagination.totalPages).toBe(3)
    })

    it('rejects unauthenticated request', async () => {
      await request(app).get('/announcements').expect(401)
    })

    it('rejects coordinator access (requires student role)', async () => {
      await request(app)
        .get('/announcements')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(403)
    })
  })

  describe('GET /announcements/admin (coordinator/TPO)', () => {
    it('returns all announcements for TPO including expired', async () => {
      await Announcement.create([
        {
          title: 'Active',
          body: 'Active body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Expired',
          body: 'Expired body',
          category: 'general',
          postedBy: tpoUser._id,
          expiresAt: new Date(Date.now() - 86400000),
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?includeExpired=true')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
    })

    it('returns department-scoped announcements for coordinator', async () => {
      await Announcement.create([
        {
          title: 'CS Announcement',
          body: 'CS body',
          category: 'general',
          departmentScope: 'Computer Science & Engineering',
          postedBy: tpoUser._id,
        },
        {
          title: 'IT Announcement',
          body: 'IT body',
          category: 'general',
          departmentScope: 'Information Technology',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements/admin')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].title).toBe('CS Announcement')
    })

    it('filters by category', async () => {
      await Announcement.create([
        {
          title: 'General',
          body: 'General body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Urgent',
          body: 'Urgent body',
          category: 'urgent',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?category=general')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].category).toBe('general')
    })

    it('filters by departmentScope query param', async () => {
      await Announcement.create([
        {
          title: 'CS Announcement',
          body: 'CS body',
          category: 'general',
          departmentScope: 'Computer Science & Engineering',
          postedBy: tpoUser._id,
        },
        {
          title: 'IT Announcement',
          body: 'IT body',
          category: 'general',
          departmentScope: 'Information Technology',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?departmentScope=Information%20Technology')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].title).toBe('IT Announcement')
    })

    it('filters by isPinned', async () => {
      await Announcement.create([
        {
          title: 'Pinned',
          body: 'Pinned body',
          category: 'general',
          isPinned: true,
          postedBy: tpoUser._id,
        },
        {
          title: 'Unpinned',
          body: 'Unpinned body',
          category: 'general',
          isPinned: false,
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?isPinned=true')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].isPinned).toBe(true)
    })

    it('includes expired when includeExpired=true', async () => {
      await Announcement.create([
        {
          title: 'Active',
          body: 'Active body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Expired',
          body: 'Expired body',
          category: 'general',
          postedBy: tpoUser._id,
          expiresAt: new Date(Date.now() - 86400000),
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?includeExpired=true')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
    })

    it('excludes expired by default', async () => {
      await Announcement.create([
        {
          title: 'Active',
          body: 'Active body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Expired',
          body: 'Expired body',
          category: 'general',
          postedBy: tpoUser._id,
          expiresAt: new Date(Date.now() - 86400000),
        },
      ])

      const res = await request(app)
        .get('/announcements/admin')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(1)
      expect(res.body.announcements[0].title).toBe('Active')
    })

    it('supports pagination', async () => {
      const announcements = Array.from({ length: 5 }, (_, i) => ({
        title: `Announcement ${i}`,
        body: `Body ${i}`,
        category: 'general',
        postedBy: tpoUser._id,
      }))
      await Announcement.create(announcements)

      const res = await request(app)
        .get('/announcements/admin?page=1&limit=2')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements).toHaveLength(2)
      expect(res.body.pagination.total).toBe(5)
    })

    it('supports sorting', async () => {
      await Announcement.create([
        {
          title: 'A First',
          body: 'First body',
          category: 'general',
          postedBy: tpoUser._id,
        },
        {
          title: 'Z Last',
          body: 'Last body',
          category: 'general',
          postedBy: tpoUser._id,
        },
      ])

      const res = await request(app)
        .get('/announcements/admin?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcements[0].title).toBe('A First')
    })

    it('rejects student access', async () => {
      await request(app)
        .get('/announcements/admin')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })

    it('rejects unauthenticated request', async () => {
      await request(app).get('/announcements/admin').expect(401)
    })
  })

  describe('GET /announcements/:id', () => {
    it('returns single announcement for student', async () => {
      const announcement = await Announcement.create({
        title: 'Test Announcement',
        body: 'Test body',
        category: 'general',
        postedBy: tpoUser._id,
      })

      const res = await request(app)
        .get(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.title).toBe('Test Announcement')
      expect(res.body.announcement.category).toBe('general')
    })

    it('returns 404 for expired announcement (student)', async () => {
      const announcement = await Announcement.create({
        title: 'Expired Announcement',
        body: 'Expired body',
        category: 'general',
        postedBy: tpoUser._id,
        expiresAt: new Date(Date.now() - 86400000),
      })

      await request(app)
        .get(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('returns 404 for non-existent announcement', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app)
        .get(`/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('returns announcement for coordinator within scope', async () => {
      const announcement = await Announcement.create({
        title: 'CS Announcement',
        body: 'CS body',
        category: 'general',
        departmentScope: 'Computer Science & Engineering',
        postedBy: tpoUser._id,
      })

      const res = await request(app)
        .get(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.title).toBe('CS Announcement')
    })

    it('returns 404 for coordinator outside scope', async () => {
      const announcement = await Announcement.create({
        title: 'IT Announcement',
        body: 'IT body',
        category: 'general',
        departmentScope: 'Information Technology',
        postedBy: tpoUser._id,
      })

      await request(app)
        .get(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(404)
    })

    it('rejects unauthenticated request', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app).get(`/announcements/${fakeId}`).expect(401)
    })
  })

  describe('POST /announcements (create)', () => {
    it('creates announcement as TPO', async () => {
      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          title: 'New Announcement',
          body: 'This is a new announcement',
          category: 'general',
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.title).toBe('New Announcement')
      expect(res.body.announcement.category).toBe('general')
      expect(res.body.announcement.isPinned).toBe(false)
      expect(res.body.announcement.postedBy._id).toBe(tpoUser._id.toString())
    })

    it('creates announcement as coordinator', async () => {
      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Coordinator Announcement',
          body: 'From coordinator',
          category: 'urgent',
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.title).toBe('Coordinator Announcement')
    })

    it('creates department-scoped announcement', async () => {
      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          title: 'Dept Scoped',
          body: 'For CS department',
          category: 'general',
          departmentScope: 'Computer Science & Engineering',
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.departmentScope).toBe('Computer Science & Engineering')
    })

    it('creates drive-specific announcement', async () => {
      const company = await Company.create({
        name: 'Test Company',
        sector: 'IT',
        hrContact: {
          name: 'HR Manager',
          email: 'hr@test.com',
          phone: '1234567890',
        },
      })
      const drive = await Drive.create({
        title: 'Test Drive',
        company: company._id,
        jobType: 'full-time',
        compensation: { ctcLpa: 10 },
        eligibilityCriteria: {
          branches: ['Computer Science & Engineering'],
          batches: [2025],
          minCgpa: 7,
          maxBacklogs: 0,
          min10th: 60,
          min12th: 60,
        },
        tier: 1,
        registrationDeadline: new Date(Date.now() + 86400000 * 30),
        status: 'published',
        departmentScope: 'Computer Science & Engineering',
        vacancies: 10,
      })

      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          title: 'Drive Announcement',
          body: 'For this drive',
          category: 'drive_specific',
          driveId: drive._id.toString(),
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.category).toBe('drive_specific')
      expect(res.body.announcement.drive._id).toBe(drive._id.toString())
    })

    it('creates pinned announcement', async () => {
      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          title: 'Pinned',
          body: 'Pinned body',
          category: 'general',
          isPinned: true,
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.isPinned).toBe(true)
    })

    it('creates announcement with expiry', async () => {
      const expiresAt = new Date(Date.now() + 86400000 * 7).toISOString() // 7 days
      const res = await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          title: 'With Expiry',
          body: 'Expires soon',
          category: 'general',
          expiresAt,
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.expiresAt).toBeDefined()
    })

    it('rejects student from creating', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Announcement',
          body: 'Should fail',
          category: 'general',
        })
        .expect(403)
    })

    it('rejects unauthenticated request', async () => {
      await request(app)
        .post('/announcements')
        .send({ title: 'Test', body: 'Test', category: 'general' })
        .expect(401)
    })

    it('rejects empty title', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: '', body: 'Test', category: 'general' })
        .expect(400)
    })

    it('rejects empty body', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'Test', body: '', category: 'general' })
        .expect(400)
    })

    it('rejects invalid category', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'Test', body: 'Test', category: 'invalid' })
        .expect(400)
    })

    it('rejects title exceeding max length', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'a'.repeat(201), body: 'Test', category: 'general' })
        .expect(400)
    })

    it('rejects body exceeding max length', async () => {
      await request(app)
        .post('/announcements')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'Test', body: 'a'.repeat(10001), category: 'general' })
        .expect(400)
    })
  })

  describe('PUT /announcements/:id (update)', () => {
    it('updates announcement as TPO', async () => {
      const announcement = await Announcement.create({
        title: 'Original',
        body: 'Original body',
        category: 'general',
        postedBy: tpoUser._id,
      })

      const res = await request(app)
        .put(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'Updated Title' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.title).toBe('Updated Title')
    })

    it('updates announcement as coordinator within scope', async () => {
      const announcement = await Announcement.create({
        title: 'CS Announcement',
        body: 'CS body',
        category: 'general',
        departmentScope: 'Computer Science & Engineering',
        postedBy: tpoUser._id,
      })

      const res = await request(app)
        .put(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ body: 'Updated body' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.announcement.body).toBe('Updated body')
    })

    it('rejects coordinator updating announcement outside scope', async () => {
      const announcement = await Announcement.create({
        title: 'IT Announcement',
        body: 'IT body',
        category: 'general',
        departmentScope: 'Information Technology',
        postedBy: tpoUser._id,
      })

      await request(app)
        .put(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Hacked' })
        .expect(404)
    })

    it('rejects student from updating', async () => {
      const announcement = await Announcement.create({
        title: 'Test',
        body: 'Test body',
        category: 'general',
        postedBy: tpoUser._id,
      })

      await request(app)
        .put(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked' })
        .expect(403)
    })

    it('rejects unauthenticated request', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app).put(`/announcements/${fakeId}`).send({ title: 'Test' }).expect(401)
    })

    it('returns 404 for non-existent announcement', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app)
        .put(`/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'Test' })
        .expect(404)
    })
  })

  describe('DELETE /announcements/:id', () => {
    it('deletes announcement as TPO', async () => {
      const announcement = await Announcement.create({
        title: 'To Delete',
        body: 'Will be deleted',
        category: 'general',
        postedBy: tpoUser._id,
      })

      await request(app)
        .delete(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      const exists = await Announcement.findById(announcement._id)
      expect(exists).toBeNull()
    })

    it('deletes announcement as coordinator within scope', async () => {
      const announcement = await Announcement.create({
        title: 'CS To Delete',
        body: 'Will be deleted',
        category: 'general',
        departmentScope: 'Computer Science & Engineering',
        postedBy: tpoUser._id,
      })

      await request(app)
        .delete(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(200)

      const exists = await Announcement.findById(announcement._id)
      expect(exists).toBeNull()
    })

    it('rejects coordinator deleting announcement outside scope', async () => {
      const announcement = await Announcement.create({
        title: 'IT To Delete',
        body: 'Will be deleted',
        category: 'general',
        departmentScope: 'Information Technology',
        postedBy: tpoUser._id,
      })

      await request(app)
        .delete(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(404)
    })

    it('rejects student from deleting', async () => {
      const announcement = await Announcement.create({
        title: 'Test',
        body: 'Test body',
        category: 'general',
        postedBy: tpoUser._id,
      })

      await request(app)
        .delete(`/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })

    it('rejects unauthenticated request', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app).delete(`/announcements/${fakeId}`).expect(401)
    })

    it('returns 404 for non-existent announcement', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app)
        .delete(`/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(404)
    })
  })
})
