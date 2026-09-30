// Calendar routes integration tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import Company from '../models/Company.model.js'
import Drive from '../models/Drive.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Round from '../models/Round.model.js'
import InfoSession from '../models/InfoSession.model.js'
import Application from '../models/Application.model.js'
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
  await StudentProfile.deleteMany({})
  await Round.deleteMany({})
  await InfoSession.deleteMany({})
  await Application.deleteMany({})
})

describe('Calendar API', () => {
  let studentUser, studentToken, studentProfile
  let studentUser2, studentToken2
  let coordinatorUser, coordinatorToken
  let tpoUser, tpoToken
  let company
  let drive
  let round1, round2

  beforeEach(async () => {
    // Create student user
    studentUser = new User({
      email: 'student-cal@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    // Create student profile with academic details
    studentProfile = await StudentProfile.create({
      user: studentUser._id,
      rollNumber: '21CS001',
      branch: DEPARTMENTS[0],
      batch: 2024,
      section: 'A',
      cgpaOverall: 8.5,
      backlogsActive: 0,
      tenthPercent: 90,
      twelfthPercent: 92,
      resumes: [
        {
          label: 'Default Resume',
          cloudinaryPublicId: 'resume1',
          cloudinarySecureUrl: 'https://cloudinary.com/resume1.pdf',
          originalFilename: 'resume.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          isDefault: true,
          uploadedAt: new Date(),
        },
      ],
      placementStatus: 'not_placed',
      isBlacklisted: false,
    })

    // Create second student (for testing isolation)
    studentUser2 = new User({
      email: 'student2-cal@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser2.save()
    studentToken2 = generateAccessToken(studentUser2)

    await StudentProfile.create({
      user: studentUser2._id,
      rollNumber: '21CS002',
      branch: DEPARTMENTS[0],
      batch: 2024,
      section: 'A',
      cgpaOverall: 8.0,
      backlogsActive: 0,
      tenthPercent: 85,
      twelfthPercent: 87,
      resumes: [
        {
          label: 'Default Resume',
          cloudinaryPublicId: 'resume2',
          cloudinarySecureUrl: 'https://cloudinary.com/resume2.pdf',
          originalFilename: 'resume2.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          isDefault: true,
          uploadedAt: new Date(),
        },
      ],
      placementStatus: 'not_placed',
      isBlacklisted: false,
    })

    // Create coordinator
    coordinatorUser = new User({
      email: 'coord-cal@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0],
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    // Create TPO
    tpoUser = new User({
      email: 'tpo-cal@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)

    // Create company
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

    // Create drive in registration_open status
    drive = await Drive.create({
      company: company._id,
      title: 'Software Engineer',
      jobType: 'full-time',
      compensation: {
        ctcLpa: 12,
        stipend: 0,
        currency: 'INR',
        details: 'Annual CTC',
      },
      eligibilityCriteria: {
        branches: [DEPARTMENTS[0]],
        batches: [2024],
        minCgpa: 7.0,
        maxBacklogs: 2,
        min10th: 60,
        min12th: 65,
      },
      tier: 3,
      vacancies: 10,
      registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'registration_open',
      departmentScope: DEPARTMENTS[0],
      description: 'We are hiring software engineers',
    })

    // Create rounds - one now+7days, one now+14days
    const round1Time = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const round2Time = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    round1 = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Online Assessment',
      dateTime: round1Time,
      mode: 'online',
      meetingLink: 'https://meet.google.com/round1',
    })

    round2 = await Round.create({
      drive: drive._id,
      roundNumber: 2,
      name: 'Technical Interview',
      dateTime: round2Time,
      mode: 'offline',
      venue: 'Room 101',
    })

    // Create info session - now+3days
    const infoSessionTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    await InfoSession.create({
      drive: drive._id,
      title: 'Company Pre-Placement Talk',
      dateTime: infoSessionTime,
      mode: 'online',
      meetingLink: 'https://meet.google.com/ppt',
      mandatory: true,
      description: 'Learn about our company culture',
    })

    // Create application for student
    await Application.create({
      student: studentProfile._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Default Resume',
        cloudinaryPublicId: 'resume1',
        cloudinarySecureUrl: 'https://cloudinary.com/resume1.pdf',
        originalFilename: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      },
      roundStatuses: [
        { round: round1._id, status: 'pending' },
        { round: round2._id, status: 'pending' },
      ],
      overallStatus: 'applied',
    })
  })

  describe('GET /students/me/calendar', () => {
    it('returns calendar events for student with application', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.events).toBeDefined()
      expect(Array.isArray(res.body.events)).toBe(true)
      expect(res.body.events.length).toBe(3) // 2 rounds + 1 info session
    })

    it('returns events sorted by start time', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const events = res.body.events
      for (let i = 0; i < events.length - 1; i++) {
        expect(new Date(events[i].startTime) <= new Date(events[i + 1].startTime)).toBe(true)
      }
    })

    it('includes round events with correct structure', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      const roundEvent = res.body.events.find((e) => e.type === 'round')
      expect(roundEvent).toBeDefined()
      expect(roundEvent).toHaveProperty('id')
      expect(roundEvent).toHaveProperty('type', 'round')
      expect(roundEvent).toHaveProperty('driveId')
      expect(roundEvent).toHaveProperty('driveTitle')
      expect(roundEvent).toHaveProperty('company')
      expect(roundEvent).toHaveProperty('title')
      expect(roundEvent).toHaveProperty('startTime')
      expect(roundEvent).toHaveProperty('endTime')
      expect(roundEvent).toHaveProperty('mode')
      expect(roundEvent).toHaveProperty('roundNumber')
      expect(roundEvent).toHaveProperty('isConflict', false)
    })

    it('includes info session events with correct structure', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      const infoEvent = res.body.events.find((e) => e.type === 'info_session')
      expect(infoEvent).toBeDefined()
      expect(infoEvent).toHaveProperty('id')
      expect(infoEvent).toHaveProperty('type', 'info_session')
      expect(infoEvent).toHaveProperty('driveId')
      expect(infoEvent).toHaveProperty('driveTitle')
      expect(infoEvent).toHaveProperty('company')
      expect(infoEvent).toHaveProperty('title')
      expect(infoEvent).toHaveProperty('startTime')
      expect(infoEvent).toHaveProperty('endTime')
      expect(infoEvent).toHaveProperty('mode')
      expect(infoEvent).toHaveProperty('mandatory', true)
      expect(infoEvent).toHaveProperty('isConflict', false)
    })

    it('returns empty array for student with no applications', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken2}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.events).toHaveLength(0)
    })

    it('filters by date range when provided', async () => {
      const startDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

      const res = await request(app)
        .get(`/students/me/calendar?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      // Should only include info session (day 3)
      expect(res.body.events.length).toBe(1)
      expect(res.body.events[0].type).toBe('info_session')
    })

    it('detects conflict when two events overlap', async () => {
      // Create a conflicting round at the same time as round1
      const conflictingTime = new Date(round1.dateTime.getTime() + 30 * 60 * 1000) // 30 min after round1 starts
      await Round.create({
        drive: drive._id,
        roundNumber: 3,
        name: 'Group Discussion',
        dateTime: conflictingTime,
        mode: 'offline',
        venue: 'Room 201',
      })

      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const events = res.body.events
      const roundEvents = events.filter((e) => e.type === 'round')
      // Both round1 and round3 should have isConflict = true
      const conflictingEvents = roundEvents.filter((e) => e.isConflict)
      expect(conflictingEvents.length).toBe(2)
    })

    it('detects conflict between round and info session', async () => {
      // Create an info session that overlaps with round1
      const conflictingInfoTime = new Date(round1.dateTime.getTime() + 15 * 60 * 1000)
      await InfoSession.create({
        drive: drive._id,
        title: 'Urgent Info Session',
        dateTime: conflictingInfoTime,
        mode: 'online',
        meetingLink: 'https://meet.google.com/urgent',
        mandatory: false,
      })

      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const events = res.body.events
      const conflictingEvents = events.filter((e) => e.isConflict)
      expect(conflictingEvents.length).toBeGreaterThanOrEqual(2)
    })

    it('does not flag non-overlapping events as conflicts', async () => {
      // Events are at day 3, day 7, day 14 - no overlap expected
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const events = res.body.events
      const conflictingEvents = events.filter((e) => e.isConflict)
      expect(conflictingEvents.length).toBe(0)
    })

    it('excludes withdrawn applications', async () => {
      // Update application to withdrawn
      await Application.findOneAndUpdate(
        { student: studentProfile._id, drive: drive._id },
        { overallStatus: 'withdrawn' }
      )

      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.events).toHaveLength(0)
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects TPO access', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/students/me/calendar')

      expect(res.status).toBe(401)
    })

    it('rejects invalid date format', async () => {
      const res = await request(app)
        .get('/students/me/calendar?startDate=invalid-date')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('returns events with endTime calculated from startTime + default duration', async () => {
      const res = await request(app)
        .get('/students/me/calendar')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      const event = res.body.events[0]
      const start = new Date(event.startTime)
      const end = new Date(event.endTime)
      const diffMinutes = (end - start) / (1000 * 60)
      expect(diffMinutes).toBe(90) // Default 90 minutes
    })
  })
})
