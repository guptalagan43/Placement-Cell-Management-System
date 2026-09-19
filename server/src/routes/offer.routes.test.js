// Offer routes integration tests
// Traces to FR-OFR-01, FR-OFR-02.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import OfferLetter from '../models/OfferLetter.model.js'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import User from '../models/User.model.js'
import Drive from '../models/Drive.model.js'
import Round from '../models/Round.model.js'
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
let studentUser
let studentProfile
let company
let drive
let round
let application

const createTestUser = async (role, department = null, email = null) => {
  const user = await User.create({
    email: email || `${role}@test.com`,
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
  // Clear collections
  await OfferLetter.deleteMany({})
  await Application.deleteMany({})
  await StudentProfile.deleteMany({})
  await User.deleteMany({})
  await Drive.deleteMany({})
  await Round.deleteMany({})
  await Company.deleteMany({})

  // Create test users
  tpoUser = await createTestUser(ROLES.TPO)
  _coordinatorUser = await createTestUser(ROLES.COORDINATOR, 'Computer Science & Engineering')
  studentUser = await createTestUser(ROLES.STUDENT)

  // Get tokens
  tpoToken = await loginAndGetToken('tpo@test.com')
  coordinatorToken = await loginAndGetToken('coordinator@test.com')
  studentToken = await loginAndGetToken('student@test.com')

  // Create student profile
  studentProfile = await StudentProfile.create({
    user: studentUser._id,
    rollNumber: '21CS001',
    name: 'Test Student',
    branch: 'Computer Science & Engineering',
    batch: 2024,
    cgpaOverall: 8.5,
    backlogsActive: 0,
    placementStatus: 'placed',
    currentTier: 3,
  })

  // Create company
  company = await Company.create({
    name: 'Test Corp',
    sector: 'IT',
    about: 'A test company',
    hrContact: { name: 'HR Manager', email: 'hr@testcorp.com', phone: '1234567890' },
    website: 'https://testcorp.com',
    isActive: true,
  })

  // Create drive
  drive = await Drive.create({
    title: 'Software Engineer',
    company: company._id,
    jobType: 'full-time',
    compensation: {
      ctcLpa: 10,
      stipend: 0,
      currency: 'INR',
    },
    eligibilityCriteria: {
      branches: ['Computer Science & Engineering'],
      batches: [2024],
      minCgpa: 7.0,
      maxBacklogs: 0,
      min10th: 60,
      min12th: 60,
    },
    tier: 3,
    vacancies: 10,
    registrationDeadline: new Date(Date.now() + 86400000),
    status: 'registration_open',
    departmentScope: 'Computer Science & Engineering',
  })

  // Create round
  round = await Round.create({
    drive: drive._id,
    roundNumber: 1,
    name: 'Technical Interview',
    dateTime: new Date(Date.now() + 172800000),
    mode: 'offline',
    venue: 'Room 101',
  })

  // Create application with selected status
  application = await Application.create({
    student: studentProfile._id,
    drive: drive._id,
    resumeSnapshot: {
      label: 'Resume 1',
      cloudinaryPublicId: 'test/public_id',
      cloudinarySecureUrl: 'https://cloudinary.com/test.pdf',
      originalFilename: 'resume.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    },
    roundStatuses: [
      { round: round._id, status: 'cleared' },
    ],
    overallStatus: 'selected',
  })
})

describe('Offer routes', () => {
  const validDocumentData = {
    cloudinaryPublicId: 'offer/doc1',
    cloudinarySecureUrl: 'https://cloudinary.com/offer.pdf',
    originalFilename: 'offer_letter.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
  }

  const futureDate = new Date(Date.now() + 7 * 86400000).toISOString()

  describe('POST /offers/:applicationId — issue offer', () => {
    it('allows TPO to issue offer for selected application', async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.offer).toBeDefined()
      expect(res.body.offer.application).toBe(application._id.toString())
      expect(res.body.offer.status).toBe('pending')
      expect(res.body.offer.document.cloudinaryPublicId).toBe(validDocumentData.cloudinaryPublicId)
    })

    it('allows coordinator to issue offer for selected application in their department', async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.offer.application).toBe(application._id.toString())
    })

    it('rejects offer for application not in selected status', async () => {
      // Create another application with 'applied' status using a different student
      const otherStudent = await createTestUser(ROLES.STUDENT, null, 'appliedstudent@test.com')
      const otherStudentProfile = await StudentProfile.create({
        user: otherStudent._id,
        rollNumber: '21CS003',
        name: 'Other Student',
        branch: 'Computer Science & Engineering',
        batch: 2024,
        cgpaOverall: 8.0,
        backlogsActive: 0,
        placementStatus: 'not_placed',
        currentTier: null,
      })

      const appliedApplication = await Application.create({
        student: otherStudentProfile._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Resume 1',
          cloudinaryPublicId: 'test/public_id2',
          cloudinarySecureUrl: 'https://cloudinary.com/test2.pdf',
          originalFilename: 'resume2.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [{ round: round._id, status: 'pending' }],
        overallStatus: 'applied',
      })

      const res = await request(app)
        .post(`/offers/${appliedApplication._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('INVALID_APPLICATION_STATUS')
    })

    it('rejects duplicate offer for same application', async () => {
      // First create an offer
      await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(201)

      // Try to create another
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: { ...validDocumentData, cloudinaryPublicId: 'offer/doc2' },
          responseDeadline: futureDate,
        })
        .expect(409)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('OFFER_ALREADY_EXISTS')
    })

    it('rejects offer with past deadline', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: pastDate,
        })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects student from issuing offer', async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(401)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('UNAUTHORIZED')
    })

    it('rejects coordinator from other department', async () => {
      // Create coordinator in different department with unique email
      const _otherCoordinator = await createTestUser(ROLES.COORDINATOR, 'Electronics & Communication Engineering', 'othercoordinator@test.com')
      const otherToken = await loginAndGetToken('othercoordinator@test.com')

      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /offers/application/:applicationId — get offer for application', () => {
    let offerId

    beforeEach(async () => {
      // Create an offer
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
      offerId = res.body.offer._id
    })

    it('allows student to view their own offer', async () => {
      const res = await request(app)
        .get(`/offers/application/${application._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer._id).toBe(offerId)
      expect(res.body.offer.status).toBe('pending')
    })

    it('allows TPO to view offer', async () => {
      const res = await request(app)
        .get(`/offers/application/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer._id).toBe(offerId)
    })

    it('allows coordinator to view offer in their department', async () => {
      const res = await request(app)
        .get(`/offers/application/${application._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer._id).toBe(offerId)
    })

    it('rejects coordinator from other department', async () => {
      const _otherCoordinator = await createTestUser(ROLES.COORDINATOR, 'Electronics & Communication Engineering', 'othercoordinator2@test.com')
      const otherToken = await loginAndGetToken('othercoordinator2@test.com')

      const res = await request(app)
        .get(`/offers/application/${application._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/offers/application/${fakeId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('APPLICATION_NOT_FOUND')
    })

    it('returns 404 for application without offer', async () => {
      // Create another student
      const otherStudent = await createTestUser(ROLES.STUDENT, null, 'anotherstudent@test.com')
      const otherStudentProfile = await StudentProfile.create({
        user: otherStudent._id,
        rollNumber: '21CS004',
        name: 'Another Student',
        branch: 'Computer Science & Engineering',
        batch: 2024,
        cgpaOverall: 7.5,
        backlogsActive: 0,
        placementStatus: 'placed',
        currentTier: 3,
      })

      const newApplication = await Application.create({
        student: otherStudentProfile._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Resume 1',
          cloudinaryPublicId: 'test/public_id3',
          cloudinarySecureUrl: 'https://cloudinary.com/test3.pdf',
          originalFilename: 'resume3.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [{ round: round._id, status: 'cleared' }],
        overallStatus: 'selected',
      })

      const res = await request(app)
        .get(`/offers/application/${newApplication._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('OFFER_NOT_FOUND')
    })
  })

  describe('GET /offers/:offerId — get offer by ID', () => {
    let offerId

    beforeEach(async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
      offerId = res.body.offer._id
    })

    it('allows student to view their own offer by ID', async () => {
      const res = await request(app)
        .get(`/offers/${offerId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer._id).toBe(offerId)
    })

    it('allows TPO to view offer by ID', async () => {
      const res = await request(app)
        .get(`/offers/${offerId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })

    it('returns 404 for non-existent offer', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/offers/${fakeId}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .expect(404)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('OFFER_NOT_FOUND')
    })
  })

  describe('PATCH /offers/:offerId/respond — respond to offer', () => {
    let offerId

    beforeEach(async () => {
      const res = await request(app)
        .post(`/offers/${application._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: validDocumentData,
          responseDeadline: futureDate,
        })
      offerId = res.body.offer._id
    })

    it('allows student to accept offer', async () => {
      const res = await request(app)
        .patch(`/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ response: 'accept' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer.status).toBe('accepted')
      expect(res.body.offer.respondedAt).toBeDefined()
    })

    it('allows student to decline offer', async () => {
      const res = await request(app)
        .patch(`/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ response: 'decline' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.offer.status).toBe('declined')
      expect(res.body.offer.respondedAt).toBeDefined()
    })

    it('rejects response after deadline', async () => {
      // Create a new application for this test (since beforeEach already created an offer for the main application)
      const expiredStudent = await createTestUser(ROLES.STUDENT, null, 'expiredstudent@test.com')
      const expiredStudentProfile = await StudentProfile.create({
        user: expiredStudent._id,
        rollNumber: '21CS005',
        name: 'Expired Student',
        branch: 'Computer Science & Engineering',
        batch: 2024,
        cgpaOverall: 7.8,
        backlogsActive: 0,
        placementStatus: 'placed',
        currentTier: 3,
      })

      const expiredApplication = await Application.create({
        student: expiredStudentProfile._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Resume 1',
          cloudinaryPublicId: 'test/public_id5',
          cloudinarySecureUrl: 'https://cloudinary.com/test5.pdf',
          originalFilename: 'resume5.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [{ round: round._id, status: 'cleared' }],
        overallStatus: 'selected',
      })

      // Create offer with past deadline directly in DB (bypass API validation)
      const pastDate = new Date(Date.now() - 86400000)
      const offer = await OfferLetter.create({
        application: expiredApplication._id,
        document: { ...validDocumentData, cloudinaryPublicId: 'offer/doc3' },
        responseDeadline: pastDate,
        issuedBy: tpoUser._id,
      })

      const expiredStudentToken = await loginAndGetToken('expiredstudent@test.com')

      const res = await request(app)
        .patch(`/offers/${offer._id}/respond`)
        .set('Authorization', `Bearer ${expiredStudentToken}`)
        .send({ response: 'accept' })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('DEADLINE_PASSED')
    })

    it('rejects response to already responded offer', async () => {
      // First accept
      await request(app)
        .patch(`/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ response: 'accept' })
        .expect(200)

      // Try to respond again
      const res = await request(app)
        .patch(`/offers/${offerId}/respond`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ response: 'decline' })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('INVALID_OFFER_STATUS')
    })

    it('rejects student responding to another student offer', async () => {
      // Create another student with unique email
      const otherStudent = await createTestUser(ROLES.STUDENT, null, 'otherstudent@test.com')
      const otherStudentProfile = await StudentProfile.create({
        user: otherStudent._id,
        rollNumber: '21CS002',
        name: 'Other Student',
        branch: 'Computer Science & Engineering',
        batch: 2024,
        cgpaOverall: 8.0,
        backlogsActive: 0,
        placementStatus: 'placed',
        currentTier: 3,
      })

      const otherApplication = await Application.create({
        student: otherStudentProfile._id,
        drive: drive._id,
        resumeSnapshot: {
          label: 'Resume 1',
          cloudinaryPublicId: 'test/public_id4',
          cloudinarySecureUrl: 'https://cloudinary.com/test4.pdf',
          originalFilename: 'resume4.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        roundStatuses: [{ round: round._id, status: 'cleared' }],
        overallStatus: 'selected',
      })

      const otherOfferRes = await request(app)
        .post(`/offers/${otherApplication._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({
          document: { ...validDocumentData, cloudinaryPublicId: 'offer/doc5' },
          responseDeadline: futureDate,
        })
      const otherOfferId = otherOfferRes.body.offer._id

      const _otherToken = await loginAndGetToken('otherstudent@test.com')

      // Try to respond with the main student's token (not the offer owner)
      const res = await request(app)
        .patch(`/offers/${otherOfferId}/respond`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ response: 'accept' })
        .expect(403)

      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('FORBIDDEN')
    })
  })
})