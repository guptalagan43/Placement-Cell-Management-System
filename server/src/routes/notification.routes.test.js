// Notification routes integration tests
// Traces to FR-NOT-01, FR-NOT-02.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Notification from '../models/Notification.model.js'
import User from '../models/User.model.js'
import { ROLES } from '../constants/roles.js'
import createApp from '../app.js'

let mongoServer
let app
let studentToken
let studentUser

const createTestUser = async (role, department = null, email = null) => {
  const user = await User.create({
    email: email ?? `${role}@test.com`,
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
  await Notification.deleteMany({})
  await User.deleteMany({})

  // Create test users
  studentUser = await createTestUser(ROLES.STUDENT)

  // Get tokens
  studentToken = await loginAndGetToken('student@test.com')
})

describe('Notification routes', () => {
  describe('GET /notifications/me (user notifications)', () => {
    it('returns empty list when no notifications exist', async () => {
      const res = await request(app)
        .get('/notifications/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('returns user notifications with pagination', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Notification 1' },
        { user: studentUser._id, type: 'general', message: 'Notification 2' },
        { user: studentUser._id, type: 'general', message: 'Notification 3' },
      ])

      const res = await request(app)
        .get('/notifications/me?page=1&limit=2')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications).toHaveLength(2)
      expect(res.body.pagination.total).toBe(3)
      expect(res.body.pagination.totalPages).toBe(2)
    })

    it('returns notifications sorted by createdAt desc by default', async () => {
      const now = new Date()
      await Notification.create([
        {
          user: studentUser._id,
          type: 'general',
          message: 'First',
          createdAt: new Date(now.getTime() - 10000),
        },
        {
          user: studentUser._id,
          type: 'general',
          message: 'Second',
          createdAt: new Date(now.getTime() - 5000),
        },
        { user: studentUser._id, type: 'general', message: 'Third', createdAt: now },
      ])

      const res = await request(app)
        .get('/notifications/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications[0].message).toBe('Third')
      expect(res.body.notifications[1].message).toBe('Second')
      expect(res.body.notifications[2].message).toBe('First')
    })

    it('filters by read status', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Read', read: true },
        { user: studentUser._id, type: 'general', message: 'Unread', read: false },
      ])

      const res = await request(app)
        .get('/notifications/me?read=false')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications).toHaveLength(1)
      expect(res.body.notifications[0].read).toBe(false)
    })

    it('filters by type', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'General' },
        { user: studentUser._id, type: 'offer_issued', message: 'Offer' },
      ])

      const res = await request(app)
        .get('/notifications/me?type=offer_issued')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications).toHaveLength(1)
      expect(res.body.notifications[0].type).toBe('offer_issued')
    })

    it('supports pagination', async () => {
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        user: studentUser._id,
        type: 'general',
        message: `Notification ${i}`,
      }))
      await Notification.create(notifications)

      const res = await request(app)
        .get('/notifications/me?page=2&limit=2')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notifications).toHaveLength(2)
      expect(res.body.pagination.page).toBe(2)
      expect(res.body.pagination.totalPages).toBe(3)
    })

    it('rejects unauthenticated request', async () => {
      await request(app).get('/notifications/me').expect(401)
    })

    it('rejects coordinator access (student only)', async () => {
      const _coordinator = await createTestUser(ROLES.COORDINATOR, 'Computer Science & Engineering')
      const token = await loginAndGetToken('coordinator@test.com')

      await request(app)
        .get('/notifications/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
    })
  })

  describe('GET /notifications/me/unread-count', () => {
    it('returns unread count', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Read', read: true },
        { user: studentUser._id, type: 'general', message: 'Unread 1', read: false },
        { user: studentUser._id, type: 'general', message: 'Unread 2', read: false },
      ])

      const res = await request(app)
        .get('/notifications/me/unread-count')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.count).toBe(2)
    })

    it('returns 0 when no unread notifications', async () => {
      const res = await request(app)
        .get('/notifications/me/unread-count')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.count).toBe(0)
    })

    it('rejects unauthenticated request', async () => {
      await request(app).get('/notifications/me/unread-count').expect(401)
    })
  })

  describe('GET /notifications/me/:id (single notification)', () => {
    it('returns single notification for owner', async () => {
      const notification = await Notification.create({
        user: studentUser._id,
        type: 'general',
        message: 'Test notification',
        link: '/drives/123',
      })

      const res = await request(app)
        .get(`/notifications/me/${notification._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notification.message).toBe('Test notification')
      expect(res.body.notification.link).toBe('/drives/123')
    })

    it('returns 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app)
        .get(`/notifications/me/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('returns 404 for another user notification', async () => {
      const otherUser = await createTestUser(ROLES.STUDENT, null, 'other-student@test.com')
      const notification = await Notification.create({
        user: otherUser._id,
        type: 'general',
        message: 'Other user notification',
      })

      await request(app)
        .get(`/notifications/me/${notification._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('rejects unauthenticated request', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app).get(`/notifications/me/${fakeId}`).expect(401)
    })
  })

  describe('PUT /notifications/me/:id/read (mark as read)', () => {
    it('marks notification as read', async () => {
      const notification = await Notification.create({
        user: studentUser._id,
        type: 'general',
        message: 'Unread',
        read: false,
      })

      const res = await request(app)
        .put(`/notifications/me/${notification._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notification.read).toBe(true)
      expect(res.body.notification._id).toBe(notification._id.toString())
    })

    it('returns 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app)
        .put(`/notifications/me/${fakeId}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('returns 404 for another user notification', async () => {
      const otherUser = await createTestUser(ROLES.STUDENT, null, 'other-student@test.com')
      const notification = await Notification.create({
        user: otherUser._id,
        type: 'general',
        message: 'Other user notification',
        read: false,
      })

      await request(app)
        .put(`/notifications/me/${notification._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404)
    })

    it('idempotent - marking already read returns same result', async () => {
      const notification = await Notification.create({
        user: studentUser._id,
        type: 'general',
        message: 'Already read',
        read: true,
      })

      const res = await request(app)
        .put(`/notifications/me/${notification._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.notification.read).toBe(true)
    })

    it('rejects unauthenticated request', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      await request(app).put(`/notifications/me/${fakeId}/read`).expect(401)
    })
  })

  describe('PUT /notifications/me/read-all (mark all as read)', () => {
    it('marks all unread notifications as read', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Unread 1', read: false },
        { user: studentUser._id, type: 'general', message: 'Unread 2', read: false },
        { user: studentUser._id, type: 'general', message: 'Read', read: true },
      ])

      const res = await request(app)
        .put('/notifications/me/read-all')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.modifiedCount).toBe(2)

      // Verify all are read
      const unread = await Notification.countDocuments({ user: studentUser._id, read: false })
      expect(unread).toBe(0)
    })

    it('returns 0 modified when no unread notifications', async () => {
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Read 1', read: true },
        { user: studentUser._id, type: 'general', message: 'Read 2', read: true },
      ])

      const res = await request(app)
        .put('/notifications/me/read-all')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.modifiedCount).toBe(0)
    })

    it('does not affect other users notifications', async () => {
      const otherUser = await createTestUser(ROLES.STUDENT, null, 'other-student@test.com')
      await Notification.create([
        { user: studentUser._id, type: 'general', message: 'Unread', read: false },
        { user: otherUser._id, type: 'general', message: 'Other unread', read: false },
      ])

      await request(app)
        .put('/notifications/me/read-all')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      // Other user's notification should still be unread
      const otherUnread = await Notification.countDocuments({ user: otherUser._id, read: false })
      expect(otherUnread).toBe(1)
    })

    it('rejects unauthenticated request', async () => {
      await request(app).put('/notifications/me/read-all').expect(401)
    })
  })
})
