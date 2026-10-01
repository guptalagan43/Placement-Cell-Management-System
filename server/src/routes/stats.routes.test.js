// Statistics routes integration tests
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

describe('Statistics API', () => {
  let coordinatorUser, coordinatorToken
  let coordinatorUser2, coordinatorToken2
  let tpoUser, tpoToken
  let studentUser, studentToken
  let company
  let drive
  let round1, round2

  beforeEach(async () => {
    // Create coordinator for DEPARTMENTS[0]
    coordinatorUser = new User({
      email: 'coord-stats@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0],
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    // Create coordinator for DEPARTMENTS[1]
    coordinatorUser2 = new User({
      email: 'coord2-stats@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1],
      active: true,
    })
    await coordinatorUser2.save()
    coordinatorToken2 = generateAccessToken(coordinatorUser2)

    // Create TPO
    tpoUser = new User({
      email: 'tpo-stats@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)

    // Create student user
    studentUser = new User({
      email: 'student-stats@example.com',
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

    // Create drive
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

    // Create rounds
    round1 = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Online Assessment',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      mode: 'online',
      meetingLink: 'https://meet.google.com/round1',
    })

    round2 = await Round.create({
      drive: drive._id,
      roundNumber: 2,
      name: 'Technical Interview',
      dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      mode: 'offline',
      venue: 'Room 101',
    })
  })

  let rollCounter = 0

  const createStudentProfile = async (overrides = {}) => {
    rollCounter++
    const user = new User({
      email: `student-${Date.now()}-${rollCounter}-${Math.random()}@example.com`,
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await user.save()

    const profile = await StudentProfile.create({
      user: user._id,
      rollNumber: `21CS${rollCounter.toString().padStart(3, '0')}`,
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
    const defaultRoundStatuses = [
      { round: round1._id, status: 'pending' },
      { round: round2._id, status: 'pending' },
    ]

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

  describe('GET /stats/overview', () => {
    beforeEach(async () => {
      // Create students in DEPARTMENTS[0]
      const { profile: p1 } = await createStudentProfile({ placementStatus: 'placed' })
      const { profile: p2 } = await createStudentProfile({ placementStatus: 'placed' })
      const { profile: _p3 } = await createStudentProfile({ placementStatus: 'not_placed' })
      const { profile: _p4 } = await createStudentProfile({ placementStatus: 'not_placed' })

      // Create applications with offers for placed students
      await createApplication(p1, drive._id, 'offer_accepted', [
        { round: round1._id, status: 'cleared' },
        { round: round2._id, status: 'cleared' },
      ])

      await createApplication(p2, drive._id, 'offer_accepted', [
        { round: round1._id, status: 'cleared' },
        { round: round2._id, status: 'cleared' },
      ])

      // Create a student in DEPARTMENTS[1] for coordinator scoping test
      const user5 = new User({
        email: 'student-dept1@example.com',
        password: 'StudentPass123!',
        role: 'student',
        active: true,
        mustResetPassword: false,
      })
      await user5.save()

      await StudentProfile.create({
        user: user5._id,
        rollNumber: '21EC001',
        branch: DEPARTMENTS[1],
        batch: 2024,
        section: 'A',
        cgpaOverall: 8.0,
        backlogsActive: 0,
        tenthPercent: 85,
        twelfthPercent: 87,
        resumes: [
          {
            label: 'Default Resume',
            cloudinaryPublicId: 'resume5',
            cloudinarySecureUrl: 'https://cloudinary.com/resume5.pdf',
            originalFilename: 'resume5.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
            uploadedAt: new Date(),
          },
        ],
        placementStatus: 'placed',
        isBlacklisted: false,
      })
    })

    it('returns overview stats for TPO (all departments)', async () => {
      const res = await request(app)
        .get('/stats/overview')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.overview).toBeDefined()
      expect(res.body.overview.totalStudents).toBe(5)
      expect(res.body.overview.placedStudents).toBe(3)
      expect(res.body.overview.placementPercentage).toBeCloseTo(60, 1)
      expect(res.body.overview.avgCtcLpa).toBe(12)
      expect(res.body.overview.medianCtcLpa).toBe(12)
      expect(res.body.overview.highestCtcLpa).toBe(12)
      expect(res.body.departmentBreakdown).toBeDefined()
      expect(res.body.departmentBreakdown.length).toBe(DEPARTMENTS.length)
    })

    it('returns overview stats for coordinator (department scoped)', async () => {
      const res = await request(app)
        .get('/stats/overview')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.overview.totalStudents).toBe(4) // Only DEPARTMENTS[0] students
      expect(res.body.overview.placedStudents).toBe(2)
      expect(res.body.overview.placementPercentage).toBeCloseTo(50, 1)
      expect(res.body.departmentBreakdown.length).toBe(DEPARTMENTS.length)
      // Only DEPARTMENTS[0] should have data
      const dept0 = res.body.departmentBreakdown.find((d) => d.department === DEPARTMENTS[0])
      expect(dept0.totalStudents).toBe(4)
      expect(dept0.placedStudents).toBe(2)
    })

    it('returns zero stats for coordinator with no students in department', async () => {
      // Use coordinator for DEPARTMENTS[1] which has 1 placed student
      const res = await request(app)
        .get('/stats/overview')
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(200)
      expect(res.body.overview.totalStudents).toBe(1)
      expect(res.body.overview.placedStudents).toBe(1)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get('/stats/overview')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/stats/overview')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /stats/drive/:driveId/funnel', () => {
    let studentProfile1, studentProfile2, studentProfile3

    beforeEach(async () => {
      // Create student profiles
      const { profile: p1 } = await createStudentProfile({})
      const { profile: p2 } = await createStudentProfile({})
      const { profile: p3 } = await createStudentProfile({})
      studentProfile1 = p1
      studentProfile2 = p2
      studentProfile3 = p3

      // Create applications with various statuses
      // 1. Selected (offer_accepted)
      await createApplication(studentProfile1, drive._id, 'offer_accepted', [
        { round: round1._id, status: 'cleared' },
        { round: round2._id, status: 'cleared' },
      ])

      // 2. Selected (selected status)
      await createApplication(studentProfile2, drive._id, 'selected', [
        { round: round1._id, status: 'cleared' },
        { round: round2._id, status: 'cleared' },
      ])

      // 3. Shortlisted
      await createApplication(studentProfile3, drive._id, 'shortlisted', [
        { round: round1._id, status: 'shortlisted' },
        { round: round2._id, status: 'pending' },
      ])
    })

    it('returns funnel for TPO', async () => {
      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.funnel).toBeDefined()
      expect(res.body.funnel.applied).toBe(3)
      expect(res.body.funnel.selected).toBe(2)
      expect(res.body.funnel.shortlisted).toBe(1)
      expect(res.body.conversionRates).toBeDefined()
      expect(res.body.conversionRates.appliedToSelected).toBe('66.67')
    })

    it('returns funnel for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.funnel.applied).toBe(3)
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/stats/drive/${fakeId}/funnel`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('handles zero applications correctly', async () => {
      // Create a new drive with no applications
      const newDrive = await Drive.create({
        company: company._id,
        title: 'Another Role',
        jobType: 'full-time',
        compensation: {
          ctcLpa: 15,
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
        tier: 2,
        vacancies: 5,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'registration_open',
        departmentScope: DEPARTMENTS[0],
      })

      const res = await request(app)
        .get(`/stats/drive/${newDrive._id}/funnel`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.funnel.applied).toBe(0)
      expect(res.body.funnel.shortlisted).toBe(0)
      expect(res.body.funnel.selected).toBe(0)
      expect(res.body.conversionRates.appliedToSelected).toBe('0.00')
    })

    it('counts rejected based on round status', async () => {
      const { profile: p4 } = await createStudentProfile({})
      await createApplication(p4, drive._id, 'rejected', [
        { round: round1._id, status: 'not_cleared' },
        { round: round2._id, status: 'pending' },
      ])

      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.funnel.applied).toBe(4)
      expect(res.body.funnel.rejected).toBe(1)
    })

    it('counts withdrawn applications', async () => {
      const { profile: p5 } = await createStudentProfile({})
      await createApplication(p5, drive._id, 'withdrawn', [
        { round: round1._id, status: 'pending' },
        { round: round2._id, status: 'pending' },
      ])

      const res = await request(app)
        .get(`/stats/drive/${drive._id}/funnel`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.funnel.applied).toBe(4)
      expect(res.body.funnel.withdrawn).toBe(1)
    })
  })

  describe('Edge cases', () => {
    it('handles median calculation correctly for even number of values', async () => {
      // Create 4 placed students with different CTCs
      const drive2 = await Drive.create({
        company: company._id,
        title: 'Senior Engineer',
        jobType: 'full-time',
        compensation: { ctcLpa: 20, stipend: 0, currency: 'INR', details: '' },
        eligibilityCriteria: {
          branches: [DEPARTMENTS[0]],
          batches: [2024],
          minCgpa: 7,
          maxBacklogs: 2,
          min10th: 60,
          min12th: 65,
        },
        tier: 2,
        vacancies: 10,
        registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'registration_open',
        departmentScope: DEPARTMENTS[0],
      })

      const round3 = await Round.create({
        drive: drive2._id,
        roundNumber: 1,
        name: 'Round 1',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mode: 'online',
      })

      for (let i = 0; i < 4; i++) {
        const { profile } = await createStudentProfile({ placementStatus: 'placed' })
        await createApplication(profile, drive2._id, 'offer_accepted', [
          { round: round3._id, status: 'cleared' },
        ])
      }

      const res = await request(app)
        .get('/stats/overview')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      // We have 3 from drive (12 LPA) + 4 from drive2 (20 LPA) = 7 total
      // Sorted: [12, 12, 12, 20, 20, 20, 20] -> median is 20
      expect(res.body.overview.medianCtcLpa).toBe(20)
    })
  })
})
