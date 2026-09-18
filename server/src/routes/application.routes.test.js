// Application routes integration tests
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
import AuditLog from '../models/AuditLog.model.js'
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

describe('Application API', () => {
  let studentUser, studentToken, studentProfile
  let studentUser2, studentToken2, studentProfile2
  let coordinatorUser, coordinatorToken
  let coordinatorUser2, coordinatorToken2
  let tpoUser, tpoToken
  let company
  let drive
  let round1, round2

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-app@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

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

    studentUser2 = new User({
      email: 'student2-app@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser2.save()
    studentToken2 = generateAccessToken(studentUser2)

    studentProfile2 = await StudentProfile.create({
      user: studentUser2._id,
      rollNumber: '21CS002',
      branch: DEPARTMENTS[0],
      batch: 2024,
      section: 'A',
      cgpaOverall: 6.5,
      backlogsActive: 1,
      tenthPercent: 80,
      twelfthPercent: 82,
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

    coordinatorUser = new User({
      email: 'coord-app@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0],
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    coordinatorUser2 = new User({
      email: 'coord2-app@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1],
      active: true,
    })
    await coordinatorUser2.save()
    coordinatorToken2 = generateAccessToken(coordinatorUser2)

    tpoUser = new User({
      email: 'tpo-app@example.com',
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

  describe('POST /applications (create application)', () => {
    it('creates application for eligible student', async () => {
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.application.student.toString()).toBe(studentProfile._id.toString())
      expect(res.body.application.drive.toString()).toBe(drive._id.toString())
      expect(res.body.application.overallStatus).toBe('applied')
      expect(res.body.application.roundStatuses.length).toBe(2)
      expect(res.body.application.roundStatuses[0].status).toBe('pending')
    })

    it('rejects ineligible student (low CGPA)', async () => {
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken2}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('NOT_ELIGIBLE')
      expect(res.body.details.reasons).toContain('CGPA_BELOW_MINIMUM')
    })

    it('rejects duplicate application', async () => {
      // First application
      await request(app).post('/applications').set('Authorization', `Bearer ${studentToken}`).send({
        driveId: drive._id.toString(),
        resumeLabel: 'Default Resume',
      })

      // Second application for same drive
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(409)
      expect(res.body.code).toBe('ALREADY_APPLIED')
    })

    it('rejects application when drive not in registration_open', async () => {
      // Change drive status to published
      await Drive.findByIdAndUpdate(drive._id, { status: 'published' })

      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('APPLICATION_NOT_OPEN')
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/applications').send({
        driveId: drive._id.toString(),
        resumeLabel: 'Default Resume',
      })

      expect(res.status).toBe(401)
    })

    it('rejects non-existent drive', async () => {
      const fakeDriveId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          driveId: fakeDriveId.toString(),
          resumeLabel: 'Default Resume',
        })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects non-existent resume label', async () => {
      const res = await request(app)
        .post('/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          driveId: drive._id.toString(),
          resumeLabel: 'Non-existent Resume',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('RESUME_NOT_FOUND')
    })
  })

  describe('GET /applications/my (student own applications)', () => {
    let application

    beforeEach(async () => {
      application = await Application.create({
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

    it('returns student applications', async () => {
      const res = await request(app)
        .get('/applications/my')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.applications.length).toBe(1)
      expect(res.body.applications[0]._id.toString()).toBe(application._id.toString())
      expect(res.body.applications[0].drive).toHaveProperty('title')
    })

    it('filters by status', async () => {
      const res = await request(app)
        .get('/applications/my?status=applied')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.applications.length).toBe(1)
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/applications/my?page=1&limit=1')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.applications.length).toBe(1)
      expect(res.body.pagination.page).toBe(1)
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .get('/applications/my')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /applications/:applicationId (get application)', () => {
    let application

    beforeEach(async () => {
      application = await Application.create({
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
        roundStatuses: [{ round: round1._id, status: 'pending' }],
        overallStatus: 'applied',
      })
    })

    it('returns application for student owner', async () => {
      const res = await request(app)
        .get(`/applications/${application._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application._id.toString()).toBe(application._id.toString())
    })

    it('returns application for TPO', async () => {
      const res = await request(app)
        .get(`/applications/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
    })

    it('returns 403 for other student', async () => {
      const res = await request(app)
        .get(`/applications/${application._id}`)
        .set('Authorization', `Bearer ${studentToken2}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/applications/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })
  })

  describe('GET /applications/student/:applicationId (student application with eligibility)', () => {
    let application

    beforeEach(async () => {
      application = await Application.create({
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
        roundStatuses: [{ round: round1._id, status: 'pending' }],
        overallStatus: 'applied',
      })
    })

    it('returns application with drive details for student owner', async () => {
      const res = await request(app)
        .get(`/applications/student/${application._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application.drive).toHaveProperty('title')
      expect(res.body.application.drive).toHaveProperty('eligibilityCriteria')
    })

    it('returns 404 for other student (not owner)', async () => {
      const res = await request(app)
        .get(`/applications/student/${application._id}`)
        .set('Authorization', `Bearer ${studentToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/applications/student/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .get(`/applications/student/${application._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /applications/:applicationId/withdraw (withdraw application)', () => {
    let application

    beforeEach(async () => {
      application = await Application.create({
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
        roundStatuses: [{ round: round1._id, status: 'pending' }],
        overallStatus: 'applied',
      })
    })

    it('withdraws application before deadline', async () => {
      const res = await request(app)
        .post(`/applications/${application._id}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application.overallStatus).toBe('withdrawn')
      expect(res.body.application.withdrawnAt).toBeDefined()
    })

    it('rejects withdrawal after registration deadline', async () => {
      await Drive.findByIdAndUpdate(drive._id, { status: 'registration_closed' })

      const res = await request(app)
        .post(`/applications/${application._id}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('WITHDRAWAL_NOT_ALLOWED')
    })

    it('rejects withdrawal for non-owner', async () => {
      const res = await request(app)
        .post(`/applications/${application._id}/withdraw`)
        .set('Authorization', `Bearer ${studentToken2}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects withdrawal for already selected application', async () => {
      await Application.findByIdAndUpdate(application._id, { overallStatus: 'selected' })

      const res = await request(app)
        .post(`/applications/${application._id}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('INVALID_STATUS')
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post(`/applications/${fakeId}/withdraw`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })
  })

  describe('Coordinator/TPO: GET /drives/:driveId/applications', () => {
    let _application1, _application2

    beforeEach(async () => {
      _application1 = await Application.create({
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

      _application2 = await Application.create({
        student: studentProfile2._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Default Resume',
          cloudinaryPublicId: 'resume2',
          cloudinarySecureUrl: 'https://cloudinary.com/resume2.pdf',
          originalFilename: 'resume2.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [
          { round: round1._id, status: 'shortlisted' },
          { round: round2._id, status: 'pending' },
        ],
        overallStatus: 'shortlisted',
      })
    })

    it('returns applications for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.applications.length).toBe(2)
      expect(res.body.applications[0].student).toHaveProperty('rollNumber')
    })

    it('returns applications for TPO', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.applications.length).toBe(2)
    })

    it('rejects coordinator from different department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('filters by status', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications?status=shortlisted`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.applications.length).toBe(1)
      expect(res.body.applications[0].overallStatus).toBe('shortlisted')
    })

    it('filters by round', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}/applications?round=${round1._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.applications.length).toBe(2)
    })
  })

  describe('Coordinator/TPO: PUT /applications/:applicationId/round-status', () => {
    let application

    beforeEach(async () => {
      application = await Application.create({
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

    it('updates round status as coordinator', async () => {
      const res = await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'shortlisted',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application.roundStatuses[0].status).toBe('shortlisted')
      expect(res.body.application.overallStatus).toBe('shortlisted')
    })

    it('updates overall status to selected when all rounds cleared', async () => {
      await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'cleared',
        })

      const res = await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round2._id.toString(),
          status: 'cleared',
        })

      expect(res.status).toBe(200)
      expect(res.body.application.overallStatus).toBe('selected')
    })

    it('updates overall status to rejected when any round not_cleared', async () => {
      const res = await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'not_cleared',
        })

      expect(res.status).toBe(200)
      expect(res.body.application.overallStatus).toBe('rejected')
    })

    it('rejects invalid status', async () => {
      const res = await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'invalid_status',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/applications/${application._id}/round-status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'shortlisted',
        })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .put(`/applications/${fakeId}/round-status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          status: 'shortlisted',
        })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })
  })

  describe('Coordinator/TPO: POST /drives/:driveId/applications/bulk-update', () => {
    beforeEach(async () => {
      await Application.create([
        {
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
          roundStatuses: [{ round: round1._id, status: 'pending' }],
          overallStatus: 'applied',
        },
        {
          student: studentProfile2._id,
          drive: drive._id,
          resumeSnapshot: {
            label: 'Default Resume',
            cloudinaryPublicId: 'resume2',
            cloudinarySecureUrl: 'https://cloudinary.com/resume2.pdf',
            originalFilename: 'resume2.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
          },
          roundStatuses: [{ round: round1._id, status: 'pending' }],
          overallStatus: 'applied',
        },
      ])
    })

    it('bulk updates round statuses via roll numbers', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/applications/bulk-update`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          updates: [
            { rollNumber: '21CS001', status: 'shortlisted' },
            { rollNumber: '21CS002', status: 'shortlisted' },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.updated).toBe(2)
      expect(res.body.errors).toHaveLength(0)
    })

    it('reports errors for non-existent roll numbers', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/applications/bulk-update`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          updates: [
            { rollNumber: '21CS001', status: 'shortlisted' },
            { rollNumber: '999999', status: 'shortlisted' },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(1)
      expect(res.body.errors.length).toBe(1)
      expect(res.body.errors[0].rollNumber).toBe('999999')
    })

    it('reports errors for students without application', async () => {
      // Create a student without application
      const studentUser3 = new User({
        email: 'student3-app@example.com',
        password: 'StudentPass123!',
        role: 'student',
        active: true,
        mustResetPassword: false,
      })
      await studentUser3.save()

      await StudentProfile.create({
        user: studentUser3._id,
        rollNumber: '21CS003',
        branch: DEPARTMENTS[0],
        batch: 2024,
        section: 'A',
        cgpaOverall: 8.0,
        backlogsActive: 0,
        tenthPercent: 85,
        twelfthPercent: 87,
        resumes: [],
        placementStatus: 'not_placed',
        isBlacklisted: false,
      })

      const res = await request(app)
        .post(`/drives/${drive._id}/applications/bulk-update`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          roundId: round1._id.toString(),
          updates: [{ rollNumber: '21CS003', status: 'shortlisted' }],
        })

      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(0)
      expect(res.body.errors.length).toBe(1)
      expect(res.body.errors[0].error).toBe('Application not found')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post(`/drives/${drive._id}/applications/bulk-update`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          roundId: round1._id.toString(),
          updates: [{ rollNumber: '21CS001', status: 'shortlisted' }],
        })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('TPO: POST /applications/:applicationId/eligibility-override', () => {
    let ineligibleApplication
    let eligibleApplication

    beforeEach(async () => {
      // Create an application for an ineligible student (student2 has low CGPA)
      ineligibleApplication = await Application.create({
        student: studentProfile2._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Default Resume',
          cloudinaryPublicId: 'resume2',
          cloudinarySecureUrl: 'https://cloudinary.com/resume2.pdf',
          originalFilename: 'resume2.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [
          { round: round1._id, status: 'pending' },
          { round: round2._id, status: 'pending' },
        ],
        overallStatus: 'applied',
        eligibilityOverride: { overridden: false },
      })

      // Create an application for an eligible student
      eligibleApplication = await Application.create({
        student: studentProfile._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Default Resume',
          cloudinaryPublicId: 'resume1',
          cloudinarySecureUrl: 'https://cloudinary.com/resume1.pdf',
          originalFilename: 'resume1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [
          { round: round1._id, status: 'pending' },
          { round: round2._id, status: 'pending' },
        ],
        overallStatus: 'applied',
        eligibilityOverride: { overridden: false },
      })
    })

    it('allows TPO to override eligibility with a reason', async () => {
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: 'Exceptional case: student has relevant industry experience',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application.eligibilityOverride.overridden).toBe(true)
      expect(res.body.application.eligibilityOverride.reason).toBe(
        'Exceptional case: student has relevant industry experience'
      )
      expect(res.body.application.eligibilityOverride.overriddenBy.toString()).toBe(
        tpoUser._id.toString()
      )
      expect(res.body.application.eligibilityOverride.overriddenAt).toBeDefined()
    })

    it('creates exactly one AuditLog entry on override', async () => {
      await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: 'Exceptional case: student has relevant industry experience',
        })

      const auditLogs = await AuditLog.find({ 'target.entityId': ineligibleApplication._id }).lean()
      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].action).toBe('eligibility_override')
      expect(auditLogs[0].actor.toString()).toBe(tpoUser._id.toString())
      expect(auditLogs[0].target.entityType).toBe('Application')
      expect(auditLogs[0].target.entityId.toString()).toBe(ineligibleApplication._id.toString())
      expect(auditLogs[0].reason).toBe('Exceptional case: student has relevant industry experience')
      expect(auditLogs[0].metadata.drive.toString()).toBe(drive._id.toString())
      expect(auditLogs[0].metadata.student.toString()).toBe(studentProfile2._id.toString())
    })

    it('rejects override without a reason', async () => {
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: '',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects override with reason exceeding max length', async () => {
      const longReason = 'a'.repeat(2001)
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: longReason,
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects coordinator access (TPO only)', async () => {
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          reason: 'Exceptional case',
        })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Exceptional case',
        })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .send({
          reason: 'Exceptional case',
        })

      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post(`/applications/${fakeId}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: 'Exceptional case',
        })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })

    it('does not create AuditLog entry when validation fails', async () => {
      await request(app)
        .post(`/applications/${ineligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: '',
        })

      const auditLogs = await AuditLog.find({ 'target.entityId': ineligibleApplication._id }).lean()
      expect(auditLogs.length).toBe(0)
    })

    it('can override eligibility for already eligible student (admin discretion)', async () => {
      const res = await request(app)
        .post(`/applications/${eligibleApplication._id}/eligibility-override`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          reason: 'Administrative override for special consideration',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.application.eligibilityOverride.overridden).toBe(true)
    })
  })
})
