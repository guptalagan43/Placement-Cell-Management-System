// InfoSession routes integration tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import Company from '../models/Company.model.js'
import Drive from '../models/Drive.model.js'
import InfoSession from '../models/InfoSession.model.js'
import { generateAccessToken } from '../services/auth.service.js'
import { DEPARTMENTS } from '../constants/departments.js'

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
  await Company.deleteMany({})
  await Drive.deleteMany({})
  await InfoSession.deleteMany({})
})

describe('InfoSession API', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let coordinatorUser2, coordinatorToken2
  let tpoUser, tpoToken
  let company
  let drive

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-infosession@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-infosession@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0], // Computer Science & Engineering
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    coordinatorUser2 = new User({
      email: 'coord2-infosession@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1], // Information Technology
      active: true,
    })
    await coordinatorUser2.save()
    coordinatorToken2 = generateAccessToken(coordinatorUser2)

    tpoUser = new User({
      email: 'tpo-infosession@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)

    company = await Company.create({
      name: 'Test Company Pvt Ltd',
      sector: 'IT Services',
      about: 'A leading IT services company',
      hrContact: {
        name: 'John HR',
        email: 'hr@testcompany.com',
        phone: '+91-9876543210',
        designation: 'HR Manager',
      },
      website: 'https://testcompany.com',
      isActive: true,
    })

    drive = await Drive.create({
      company: company._id,
      title: 'Software Engineer Drive',
      jobType: 'full-time',
      compensation: {
        ctcLpa: 12,
        stipend: 0,
        currency: 'INR',
        details: 'Annual CTC',
      },
      eligibilityCriteria: {
        branches: [DEPARTMENTS[0], DEPARTMENTS[1]],
        batches: [2024, 2025],
        minCgpa: 7.0,
        maxBacklogs: 2,
        min10th: 60,
        min12th: 65,
      },
      tier: 3,
      vacancies: 10,
      registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'published',
      departmentScope: DEPARTMENTS[0],
      description: 'We are hiring software engineers',
    })
  })

  const validInfoSessionData = {
    title: 'Pre-Placement Talk',
    dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    mode: 'online',
    meetingLink: 'https://meet.google.com/ppt-abc-defg',
    mandatory: true,
    description: 'Company overview and Q&A session',
  }

  describe('POST /drives/:driveId/info-sessions (create info session)', () => {
    it('creates info session as coordinator in same department', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validInfoSessionData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSession.title).toBe('Pre-Placement Talk')
      expect(res.body.infoSession.mode).toBe('online')
      expect(res.body.infoSession.meetingLink).toBe('https://meet.google.com/ppt-abc-defg')
      expect(res.body.infoSession.mandatory).toBe(true)
      expect(res.body.infoSession.drive.toString()).toBe(drive._id.toString())
    })

    it('creates info session as TPO', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          ...validInfoSessionData,
          title: 'Campus Visit PPT',
          mode: 'offline',
          venue: 'Auditorium, Main Block',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSession.mode).toBe('offline')
      expect(res.body.infoSession.venue).toBe('Auditorium, Main Block')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validInfoSessionData)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .send(validInfoSessionData)

      expect(res.status).toBe(401)
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send(validInfoSessionData)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid drive ID format', async () => {
      const res = await request(app)
        .post('/drives/invalid-id/info-sessions')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validInfoSessionData)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects non-existent drive', async () => {
      const fakeDriveId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post(`/drives/${fakeDriveId}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validInfoSessionData)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Missing Fields' }) // missing dateTime, mode

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validInfoSessionData, mode: 'hybrid' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('requires venue for offline mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validInfoSessionData, mode: 'offline', venue: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Venue is required')
    })

    it('requires meetingLink for online mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validInfoSessionData, meetingLink: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Meeting link is required')
    })

    it('creates info session with mandatory flag false by default', async () => {
      const data = { ...validInfoSessionData }
      delete data.mandatory

      const res = await request(app)
        .post(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSession.mandatory).toBe(false)
    })
  })

  describe('GET /drives/:driveId/info-sessions (list info sessions)', () => {
    beforeEach(async () => {
      await InfoSession.create([
        {
          drive: drive._id,
          title: 'PPT 1',
          dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/ppt1',
        },
        {
          drive: drive._id,
          title: 'PPT 2',
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          mode: 'offline',
          venue: 'Room 101',
        },
        {
          drive: drive._id,
          title: 'PPT 3',
          dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/ppt3',
        },
      ])
    })

    it('returns info sessions for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSessions.length).toBe(3)
      expect(res.body.infoSessions[0].title).toBe('PPT 1')
      expect(res.body.infoSessions[1].title).toBe('PPT 2')
      expect(res.body.infoSessions[2].title).toBe('PPT 3')
      expect(res.body.pagination.total).toBe(3)
    })

    it('returns info sessions for TPO', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions.length).toBe(3)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions?page=1&limit=2`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions.length).toBe(2)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(2)
      expect(res.body.pagination.total).toBe(3)
      expect(res.body.pagination.totalPages).toBe(2)
    })

    it('supports sorting by dateTime desc', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/info-sessions?sortBy=dateTime&sortOrder=desc`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions[0].title).toBe('PPT 3')
      expect(res.body.infoSessions[1].title).toBe('PPT 2')
      expect(res.body.infoSessions[2].title).toBe('PPT 1')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeDriveId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/drives/${fakeDriveId}/info-sessions`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid drive ID format', async () => {
      const res = await request(app)
        .get('/drives/invalid-id/info-sessions')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /drives/:driveId/info-sessions/student (student info session list)', () => {
    let publishedDrive, draftDrive

    beforeEach(async () => {
      publishedDrive = await Drive.create({
        company: company._id,
        title: 'Published Drive',
        jobType: 'full-time',
        compensation: { ctcLpa: 10 },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 6.0,
          maxBacklogs: 3,
          min10th: 50,
          min12th: 55,
        },
        tier: 2,
        vacancies: 5,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'published',
      })

      draftDrive = await Drive.create({
        company: company._id,
        title: 'Draft Drive',
        jobType: 'full-time',
        compensation: { ctcLpa: 10 },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 6.0,
          maxBacklogs: 3,
          min10th: 50,
          min12th: 55,
        },
        tier: 2,
        vacancies: 5,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
      })

      await InfoSession.create([
        {
          drive: publishedDrive._id,
          title: 'Published PPT 1',
          dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/published-ppt1',
        },
        {
          drive: publishedDrive._id,
          title: 'Published PPT 2',
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          mode: 'offline',
          venue: 'Room A',
        },
        {
          drive: draftDrive._id,
          title: 'Draft PPT',
          dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/draft-ppt',
        },
      ])
    })

    it('returns info sessions for published+ drive for student', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/info-sessions/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSessions.length).toBe(2)
      expect(res.body.infoSessions[0].title).toBe('Published PPT 1')
      expect(res.body.infoSessions[1].title).toBe('Published PPT 2')
    })

    it('returns 404 for draft drive', async () => {
      const res = await request(app)
        .get(`/drives/${draftDrive._id}/info-sessions/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('allows coordinator to access student endpoint', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/info-sessions/student`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions.length).toBe(2)
    })

    it('allows TPO to access student endpoint', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/info-sessions/student`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions.length).toBe(2)
    })

    it('info sessions are ordered by dateTime ascending', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/info-sessions/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.infoSessions[0].title).toBe('Published PPT 1')
      expect(res.body.infoSessions[1].title).toBe('Published PPT 2')
    })
  })

  describe('GET /info-sessions/:infoSessionId (get single info session)', () => {
    let infoSession

    beforeEach(async () => {
      infoSession = await InfoSession.create({
        drive: drive._id,
        title: 'Pre-Placement Talk',
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/ppt-main',
        description: 'Main PPT session',
      })
    })

    it('returns info session for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSession.title).toBe('Pre-Placement Talk')
      expect(res.body.infoSession.mode).toBe('online')
      expect(res.body.infoSession.meetingLink).toBe('https://meet.google.com/ppt-main')
    })

    it('returns info session for TPO', async () => {
      const res = await request(app)
        .get(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('returns 404 for coordinator in different department', async () => {
      const res = await request(app)
        .get(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent info session', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/info-sessions/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('INFO_SESSION_NOT_FOUND')
    })

    it('rejects invalid info session ID format', async () => {
      const res = await request(app)
        .get('/info-sessions/invalid-id')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /info-sessions/:infoSessionId (update info session)', () => {
    let infoSession

    beforeEach(async () => {
      infoSession = await InfoSession.create({
        drive: drive._id,
        title: 'Pre-Placement Talk',
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/ppt-main',
      })
    })

    it('updates info session as coordinator in same department', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Updated PPT', mandatory: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.infoSession.title).toBe('Updated PPT')
      expect(res.body.infoSession.mandatory).toBe(true)
    })

    it('updates info session as TPO', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ mode: 'offline', venue: 'Room 101' })

      expect(res.status).toBe(200)
      expect(res.body.infoSession.mode).toBe('offline')
      expect(res.body.infoSession.venue).toBe('Room 101')
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send({ title: 'Unauthorized Update' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Update' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent info session', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .put(`/info-sessions/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Updated' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('INFO_SESSION_NOT_FOUND')
    })

    it('validates venue required for offline mode', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ mode: 'offline', venue: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Venue is required')
    })

    it('validates meetingLink required for online mode', async () => {
      const res = await request(app)
        .put(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ mode: 'online', meetingLink: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Meeting link is required')
    })
  })

  describe('DELETE /info-sessions/:infoSessionId (delete info session)', () => {
    let infoSession

    beforeEach(async () => {
      infoSession = await InfoSession.create({
        drive: drive._id,
        title: 'Pre-Placement Talk',
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/ppt-main',
      })
    })

    it('deletes info session as coordinator in same department', async () => {
      const res = await request(app)
        .delete(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Info session deleted successfully')

      const deleted = await InfoSession.findById(infoSession._id)
      expect(deleted).toBeNull()
    })

    it('deletes info session as TPO', async () => {
      const res = await request(app)
        .delete(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .delete(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .delete(`/info-sessions/${infoSession._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent info session', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .delete(`/info-sessions/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('INFO_SESSION_NOT_FOUND')
    })
  })
})
