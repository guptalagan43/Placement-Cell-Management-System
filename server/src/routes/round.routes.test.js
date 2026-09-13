// Round routes integration tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import Company from '../models/Company.model.js'
import Drive from '../models/Drive.model.js'
import Round from '../models/Round.model.js'
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
  await Round.deleteMany({})
})

describe('Round API', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let coordinatorUser2, coordinatorToken2
  let tpoUser, tpoToken
  let company
  let drive

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-round@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-round@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0], // Computer Science & Engineering
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    coordinatorUser2 = new User({
      email: 'coord2-round@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1], // Information Technology
      active: true,
    })
    await coordinatorUser2.save()
    coordinatorToken2 = generateAccessToken(coordinatorUser2)

    tpoUser = new User({
      email: 'tpo-round@example.com',
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

  const validRoundData = {
    roundNumber: 1,
    name: 'Online Assessment',
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    mode: 'online',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    instructions: 'Bring your own laptop',
  }

  describe('POST /drives/:driveId/rounds (create round)', () => {
    it('creates round as coordinator in same department', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validRoundData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.round.roundNumber).toBe(1)
      expect(res.body.round.name).toBe('Online Assessment')
      expect(res.body.round.mode).toBe('online')
      expect(res.body.round.meetingLink).toBe('https://meet.google.com/abc-defg-hij')
      expect(res.body.round.drive.toString()).toBe(drive._id.toString())
    })

    it('creates round as TPO', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          ...validRoundData,
          roundNumber: 2,
          name: 'Technical Interview',
          mode: 'offline',
          venue: 'Conference Room A',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.round.roundNumber).toBe(2)
      expect(res.body.round.mode).toBe('offline')
      expect(res.body.round.venue).toBe('Conference Room A')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validRoundData)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post(`/drives/${drive._id}/rounds`).send(validRoundData)

      expect(res.status).toBe(401)
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send(validRoundData)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid drive ID format', async () => {
      const res = await request(app)
        .post('/drives/invalid-id/rounds')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validRoundData)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects non-existent drive', async () => {
      const fakeDriveId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post(`/drives/${fakeDriveId}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validRoundData)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ roundNumber: 1 }) // missing name, dateTime, mode

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects duplicate round number for same drive', async () => {
      // Create first round
      await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validRoundData)

      // Try to create another round with same roundNumber
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          ...validRoundData,
          name: 'Another Round',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('round number already exists')
    })

    it('rejects invalid mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validRoundData, mode: 'hybrid' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('requires venue for offline mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validRoundData, mode: 'offline', venue: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Venue is required')
    })

    it('requires meetingLink for online mode', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validRoundData, meetingLink: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Meeting link is required')
    })

    it('rejects roundNumber out of range', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validRoundData, roundNumber: 25 })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /drives/:driveId/rounds (list rounds)', () => {
    beforeEach(async () => {
      await Round.create([
        {
          drive: drive._id,
          roundNumber: 1,
          name: 'Online Assessment',
          dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/round1',
        },
        {
          drive: drive._id,
          roundNumber: 2,
          name: 'Technical Interview',
          dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          mode: 'offline',
          venue: 'Room 101',
        },
        {
          drive: drive._id,
          roundNumber: 3,
          name: 'HR Interview',
          dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/round3',
        },
      ])
    })

    it('returns rounds for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.rounds.length).toBe(3)
      expect(res.body.rounds[0].roundNumber).toBe(1)
      expect(res.body.rounds[1].roundNumber).toBe(2)
      expect(res.body.rounds[2].roundNumber).toBe(3)
      expect(res.body.pagination.total).toBe(3)
    })

    it('returns rounds for TPO', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds.length).toBe(3)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds?page=1&limit=2`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds.length).toBe(2)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(2)
      expect(res.body.pagination.total).toBe(3)
      expect(res.body.pagination.totalPages).toBe(2)
    })

    it('supports sorting by roundNumber desc', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/rounds?sortBy=roundNumber&sortOrder=desc`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds[0].roundNumber).toBe(3)
      expect(res.body.rounds[1].roundNumber).toBe(2)
      expect(res.body.rounds[2].roundNumber).toBe(1)
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeDriveId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/drives/${fakeDriveId}/rounds`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid drive ID format', async () => {
      const res = await request(app)
        .get('/drives/invalid-id/rounds')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /drives/:driveId/rounds/student (student round list)', () => {
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

      await Round.create([
        {
          drive: publishedDrive._id,
          roundNumber: 1,
          name: 'Online Test',
          dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/published-round1',
        },
        {
          drive: publishedDrive._id,
          roundNumber: 2,
          name: 'Technical Interview',
          dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          mode: 'offline',
          venue: 'Room A',
        },
        {
          drive: draftDrive._id,
          roundNumber: 1,
          name: 'Draft Round',
          dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mode: 'online',
          meetingLink: 'https://meet.google.com/draft-round1',
        },
      ])
    })

    it('returns rounds for published+ drive for student', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/rounds/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.rounds.length).toBe(2)
      expect(res.body.rounds[0].roundNumber).toBe(1)
      expect(res.body.rounds[1].roundNumber).toBe(2)
    })

    it('returns 404 for draft drive', async () => {
      const res = await request(app)
        .get(`/drives/${draftDrive._id}/rounds/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('allows coordinator to access student endpoint', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/rounds/student`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds.length).toBe(2)
    })

    it('allows TPO to access student endpoint', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/rounds/student`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds.length).toBe(2)
    })

    it('rounds are ordered by roundNumber ascending', async () => {
      const res = await request(app)
        .get(`/drives/${publishedDrive._id}/rounds/student`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.rounds[0].roundNumber).toBe(1)
      expect(res.body.rounds[1].roundNumber).toBe(2)
    })
  })

  describe('GET /rounds/:roundId (get single round)', () => {
    let round

    beforeEach(async () => {
      round = await Round.create({
        drive: drive._id,
        roundNumber: 1,
        name: 'Online Assessment',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/round1',
        instructions: 'Test instructions',
      })
    })

    it('returns round for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.round.name).toBe('Online Assessment')
      expect(res.body.round.roundNumber).toBe(1)
      expect(res.body.round.mode).toBe('online')
      expect(res.body.round.meetingLink).toBe('https://meet.google.com/round1')
    })

    it('returns round for TPO', async () => {
      const res = await request(app)
        .get(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('returns 404 for coordinator in different department', async () => {
      const res = await request(app)
        .get(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent round', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/rounds/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('ROUND_NOT_FOUND')
    })

    it('rejects invalid round ID format', async () => {
      const res = await request(app)
        .get('/rounds/invalid-id')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /rounds/:roundId (update round)', () => {
    let round

    beforeEach(async () => {
      round = await Round.create({
        drive: drive._id,
        roundNumber: 1,
        name: 'Online Assessment',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/round1',
      })
    })

    it('updates round as coordinator in same department', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Updated Assessment', roundNumber: 2 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.round.name).toBe('Updated Assessment')
      expect(res.body.round.roundNumber).toBe(2)
    })

    it('updates round as TPO', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ mode: 'offline', venue: 'Room 101' })

      expect(res.status).toBe(200)
      expect(res.body.round.mode).toBe('offline')
      expect(res.body.round.venue).toBe('Room 101')
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send({ name: 'Unauthorized Update' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Student Update' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent round', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .put(`/rounds/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Updated' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('ROUND_NOT_FOUND')
    })

    it('rejects duplicate round number on update', async () => {
      // Create another round with roundNumber 2
      await Round.create({
        drive: drive._id,
        roundNumber: 2,
        name: 'Technical Interview',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        mode: 'offline',
        venue: 'Room 101',
      })

      // Try to update first round to roundNumber 2
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ roundNumber: 2 })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('round number already exists')
    })

    it('validates venue required for offline mode', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ mode: 'offline', venue: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Venue is required')
    })

    it('validates meetingLink required for online mode', async () => {
      const res = await request(app)
        .put(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ mode: 'online', meetingLink: '' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.message).toContain('Meeting link is required')
    })
  })

  describe('DELETE /rounds/:roundId (delete round)', () => {
    let round

    beforeEach(async () => {
      round = await Round.create({
        drive: drive._id,
        roundNumber: 1,
        name: 'Online Assessment',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mode: 'online',
        meetingLink: 'https://meet.google.com/round1',
      })
    })

    it('deletes round as coordinator in same department', async () => {
      const res = await request(app)
        .delete(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Round deleted successfully')

      const deleted = await Round.findById(round._id)
      expect(deleted).toBeNull()
    })

    it('deletes round as TPO', async () => {
      const res = await request(app)
        .delete(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .delete(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .delete(`/rounds/${round._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent round', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .delete(`/rounds/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('ROUND_NOT_FOUND')
    })
  })
})
