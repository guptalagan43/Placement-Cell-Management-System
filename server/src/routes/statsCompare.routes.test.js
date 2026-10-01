// Statistics Comparison routes integration tests
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
  await Application.deleteMany({})
})

describe('Statistics Comparison API', () => {
  let tpoUser, tpoToken
  let coordinatorUser, coordinatorToken
  let _coordinatorUser2, _coordinatorToken2
  let studentUser, studentToken
  let company

  beforeEach(async () => {
    // Create TPO
    tpoUser = new User({
      email: 'tpo-compare@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)

    // Create coordinator for DEPARTMENTS[0]
    coordinatorUser = new User({
      email: 'coord-compare@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0],
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    // Create coordinator for DEPARTMENTS[1]
    _coordinatorUser2 = new User({
      email: 'coord2-compare@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1],
      active: true,
    })
    await _coordinatorUser2.save()
    _coordinatorToken2 = generateAccessToken(_coordinatorUser2)

    // Create student user
    studentUser = new User({
      email: 'student-compare@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

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
  })

  const createStudentProfile = async (overrides = {}) => {
    const user = new User({
      email: `student-${Date.now()}-${Math.random()}@example.com`,
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await user.save()

    const profile = await StudentProfile.create({
      user: user._id,
      rollNumber: `21CS${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
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
      ...overrides,
    })

    return { user, profile }
  }

  const createApplication = async (
    studentProfile,
    driveId,
    overallStatus = 'applied',
    roundStatuses = []
  ) => {
    const rounds = await Round.find({ drive: driveId }).select('_id').lean()
    const defaultRoundStatuses = rounds.map((r) => ({ round: r._id, status: 'pending' }))

    const application = await Application.create({
      student: studentProfile._id,
      drive: driveId,
      resumeSnapshot: {
        label: 'Default Resume',
        cloudinaryPublicId: 'resume1',
        cloudinarySecureUrl: 'https://cloudinary.com/resume1.pdf',
        originalFilename: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      },
      roundStatuses: roundStatuses.length > 0 ? roundStatuses : defaultRoundStatuses,
      overallStatus,
    })

    return application
  }

  describe('GET /stats/seasons', () => {
    beforeEach(async () => {
      // Create drives for season 2024-25
      const drive1 = await Drive.create({
        company: company._id,
        title: 'Software Engineer',
        jobType: 'full-time',
        compensation: { ctcLpa: 12, stipend: 0, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 7,
          maxBacklogs: 2,
          min10th: 60,
          min12th: 65,
        },
        tier: 3,
        vacancies: 10,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'registration_open',
        departmentScope: DEPARTMENTS[0],
        season: '2024-25',
      })

      const drive2 = await Drive.create({
        company: company._id,
        title: 'Data Scientist',
        jobType: 'full-time',
        compensation: { ctcLpa: 15, stipend: 0, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 7.5,
          maxBacklogs: 1,
          min10th: 65,
          min12th: 70,
        },
        tier: 2,
        vacancies: 5,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'registration_open',
        departmentScope: DEPARTMENTS[0],
        season: '2024-25',
      })

      // Create drive for season 2023-24 (use future date to pass validation, but label with season)
      const drive3 = await Drive.create({
        company: company._id,
        title: 'Intern',
        jobType: 'internship',
        compensation: { ctcLpa: 6, stipend: 2, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[1]],
          batches: [2023],
          minCgpa: 6.5,
          maxBacklogs: 3,
          min10th: 60,
          min12th: 65,
        },
        tier: 4,
        vacancies: 20,
        registrationDeadline: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
        status: 'completed',
        departmentScope: DEPARTMENTS[1],
        season: '2023-24',
      })

      // Create rounds
      await Round.create({
        drive: drive1._id,
        roundNumber: 1,
        name: 'Round 1',
        dateTime: new Date(),
        mode: 'online',
      })
      await Round.create({
        drive: drive2._id,
        roundNumber: 1,
        name: 'Round 1',
        dateTime: new Date(),
        mode: 'online',
      })
      await Round.create({
        drive: drive3._id,
        roundNumber: 1,
        name: 'Round 1',
        dateTime: new Date(),
        mode: 'online',
      })
    })

    it('returns available seasons for TPO', async () => {
      const res = await request(app)
        .get('/stats/seasons')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.seasons).toBeDefined()
      expect(res.body.seasons).toContain('2024-25')
      expect(res.body.seasons).toContain('2023-24')
      expect(res.body.seasons.length).toBe(2)
    })

    it('returns available seasons for coordinator (all seasons)', async () => {
      const res = await request(app)
        .get('/stats/seasons')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.seasons).toContain('2024-25')
      expect(res.body.seasons).toContain('2023-24')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get('/stats/seasons')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/stats/seasons')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /stats/compare', () => {
    beforeEach(async () => {
      // Create students for 2024-25
      const { profile: p1 } = await createStudentProfile({ placementStatus: 'placed' })
      const { profile: p2 } = await createStudentProfile({ placementStatus: 'placed' })
      const { profile: p3 } = await createStudentProfile({ placementStatus: 'not_placed' })
      const { profile: p4 } = await createStudentProfile({ placementStatus: 'not_placed' })

      // Create students for 2023-24 (different batch)
      const { profile: p5 } = await createStudentProfile({
        placementStatus: 'placed',
        batch: 2023,
        rollNumber: '20EC001',
        branch: DEPARTMENTS[1],
      })
      const { profile: p6 } = await createStudentProfile({
        placementStatus: 'not_placed',
        batch: 2023,
        rollNumber: '20EC002',
        branch: DEPARTMENTS[1],
      })

      // Create drives for 2024-25
      const drive2024 = await Drive.create({
        company: company._id,
        title: 'Software Engineer 2024',
        jobType: 'full-time',
        compensation: { ctcLpa: 12, stipend: 0, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 7,
          maxBacklogs: 2,
          min10th: 60,
          min12th: 65,
        },
        tier: 3,
        vacancies: 10,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'results_declared',
        departmentScope: DEPARTMENTS[0],
        season: '2024-25',
      })

      const round2024 = await Round.create({
        drive: drive2024._id,
        roundNumber: 1,
        name: 'Final Round',
        dateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        mode: 'offline',
        venue: 'Room 101',
      })

      // Create drives for 2023-24 (use future date to pass validation, but label with season)
      const drive2023 = await Drive.create({
        company: company._id,
        title: 'Software Engineer 2023',
        jobType: 'full-time',
        compensation: { ctcLpa: 10, stipend: 0, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[1]],
          batches: [2023],
          minCgpa: 6.5,
          maxBacklogs: 2,
          min10th: 60,
          min12th: 65,
        },
        tier: 3,
        vacancies: 10,
        registrationDeadline: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000),
        status: 'results_declared',
        departmentScope: DEPARTMENTS[1],
        season: '2023-24',
      })

      const round2023 = await Round.create({
        drive: drive2023._id,
        roundNumber: 1,
        name: 'Final Round',
        dateTime: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        mode: 'offline',
        venue: 'Room 201',
      })

      // Create applications for 2024-25 season
      await createApplication(p1, drive2024._id, 'offer_accepted', [
        { round: round2024._id, status: 'cleared' },
      ])
      await createApplication(p2, drive2024._id, 'offer_accepted', [
        { round: round2024._id, status: 'cleared' },
      ])
      await createApplication(p3, drive2024._id, 'rejected', [
        { round: round2024._id, status: 'not_cleared' },
      ])
      await createApplication(p4, drive2024._id, 'applied', [
        { round: round2024._id, status: 'pending' },
      ])

      // Create applications for 2023-24 season
      await createApplication(p5, drive2023._id, 'offer_accepted', [
        { round: round2023._id, status: 'cleared' },
      ])
      await createApplication(p6, drive2023._id, 'applied', [
        { round: round2023._id, status: 'pending' },
      ])
    })

    it('returns comparison for TPO across multiple seasons', async () => {
      const res = await request(app)
        .get('/stats/compare?years=2024-25,2023-24')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.seasons).toBeDefined()
      expect(res.body.seasons.length).toBe(2)
      expect(res.body.trends).toBeDefined()
      expect(res.body.trends.length).toBe(2)

      // Check trend data structure
      const trend2024 = res.body.trends.find((t) => t.season === '2024-25')
      const trend2023 = res.body.trends.find((t) => t.season === '2023-24')

      expect(trend2024).toBeDefined()
      expect(trend2024.placementPercentage).toBeGreaterThan(0)
      expect(trend2024.placedStudents).toBe(2)
      expect(trend2024.totalStudents).toBe(4)

      expect(trend2023).toBeDefined()
      expect(trend2023.placementPercentage).toBeGreaterThan(0)
      expect(trend2023.placedStudents).toBe(1)
      expect(trend2023.totalStudents).toBe(2)

      // Trends should be sorted ascending
      expect(res.body.trends[0].season).toBe('2023-24')
      expect(res.body.trends[1].season).toBe('2024-25')
    })

    it('returns comparison for single season', async () => {
      const res = await request(app)
        .get('/stats/compare?years=2024-25')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.seasons.length).toBe(1)
      expect(res.body.seasons[0].season).toBe('2024-25')
    })

    it('handles season with zero data gracefully', async () => {
      // Season 2022-23 has no drives/students
      const res = await request(app)
        .get('/stats/compare?years=2024-25,2022-23')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.seasons.length).toBe(2)

      const emptySeason = res.body.seasons.find((s) => s.season === '2022-23')
      expect(emptySeason).toBeDefined()
      expect(emptySeason.overview.totalStudents).toBe(0)
      expect(emptySeason.overview.placedStudents).toBe(0)
      expect(emptySeason.overview.placementPercentage).toBe(0)
      expect(emptySeason.overview.totalDrives).toBe(0)
    })

    it('rejects coordinator access (TPO only)', async () => {
      const res = await request(app)
        .get('/stats/compare?years=2024-25,2023-24')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get('/stats/compare?years=2024-25,2023-24')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/stats/compare?years=2024-25,2023-24')
      expect(res.status).toBe(401)
    })

    it('rejects invalid years format', async () => {
      const res = await request(app)
        .get('/stats/compare?years=2024')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects missing years parameter', async () => {
      const res = await request(app)
        .get('/stats/compare')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })
})
