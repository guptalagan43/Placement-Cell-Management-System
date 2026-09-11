// Drive routes integration tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import Company from '../models/Company.model.js'
import Drive from '../models/Drive.model.js'
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
})

describe('Drive API', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let coordinatorUser2, coordinatorToken2
  let tpoUser, tpoToken
  let company

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-drive@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-drive@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[0], // Computer Science & Engineering
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    coordinatorUser2 = new User({
      email: 'coord2-drive@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: DEPARTMENTS[1], // Information Technology
      active: true,
    })
    await coordinatorUser2.save()
    coordinatorToken2 = generateAccessToken(coordinatorUser2)

    tpoUser = new User({
      email: 'tpo-drive@example.com',
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
  })

  const validDriveData = {
    company: '',
    title: 'Software Engineer',
    jobType: 'full-time',
    compensation: {
      ctcLpa: 12,
      stipend: 0,
      currency: 'INR',
      details: 'Annual CTC',
    },
    eligibilityCriteria: {
      branches: [DEPARTMENTS[0], DEPARTMENTS[1]], // CSE, IT
      batches: [2024, 2025],
      minCgpa: 7.0,
      maxBacklogs: 2,
      min10th: 60,
      min12th: 65,
    },
    tier: 3,
    vacancies: 10,
    registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    status: 'draft',
    departmentScope: DEPARTMENTS[0],
    description: 'We are hiring software engineers',
  }

  describe('POST /drives (create drive)', () => {
    it('creates drive as coordinator with department scope enforced', async () => {
      const data = { ...validDriveData, company: company._id.toString() }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.title).toBe('Software Engineer')
      expect(res.body.drive.tier).toBe(3)
      expect(res.body.drive.vacancies).toBe(10)
      expect(res.body.drive.status).toBe('draft')
      // Department scope should be forced to coordinator's department
      expect(res.body.drive.departmentScope).toBe(DEPARTMENTS[0])
    })

    it('creates drive as TPO with custom department scope', async () => {
      const data = {
        ...validDriveData,
        company: company._id.toString(),
        departmentScope: DEPARTMENTS[1],
      }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send(data)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.departmentScope).toBe(DEPARTMENTS[1])
    })

    it('creates drive as TPO with no department scope (institute-wide)', async () => {
      const data = { ...validDriveData, company: company._id.toString() }
      delete data.departmentScope

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send(data)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.departmentScope).toBeUndefined()
    })

    it('rejects student access', async () => {
      const data = { ...validDriveData, company: company._id.toString() }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(data)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const data = { ...validDriveData, company: company._id.toString() }

      const res = await request(app).post('/drives').send(data)
      expect(res.status).toBe(401)
    })

    it('rejects invalid company ID', async () => {
      const data = { ...validDriveData, company: 'invalid-id' }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects non-existent company', async () => {
      const fakeCompanyId = new mongoose.Types.ObjectId()
      const data = { ...validDriveData, company: fakeCompanyId.toString() }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('COMPANY_NOT_FOUND')
    })

    it('rejects missing eligibility criteria', async () => {
      const data = { ...validDriveData, company: company._id.toString() }
      delete data.eligibilityCriteria

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects empty branches in eligibility criteria', async () => {
      const data = {
        ...validDriveData,
        company: company._id.toString(),
        eligibilityCriteria: { ...validDriveData.eligibilityCriteria, branches: [] },
      }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects empty batches in eligibility criteria', async () => {
      const data = {
        ...validDriveData,
        company: company._id.toString(),
        eligibilityCriteria: { ...validDriveData.eligibilityCriteria, batches: [] },
      }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid tier (out of range)', async () => {
      const data = { ...validDriveData, company: company._id.toString(), tier: 15 }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid status (not draft)', async () => {
      const data = { ...validDriveData, company: company._id.toString(), status: 'published' }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects past registration deadline', async () => {
      const data = {
        ...validDriveData,
        company: company._id.toString(),
        registrationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }

      const res = await request(app)
        .post('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(data)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /drives (list drives)', () => {
    beforeEach(async () => {
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Drive Alpha',
        departmentScope: DEPARTMENTS[0],
        status: 'draft',
      })
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Drive Beta',
        departmentScope: DEPARTMENTS[0],
        status: 'published',
      })
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Drive Gamma',
        departmentScope: DEPARTMENTS[1],
        status: 'published',
      })
    })

    it('returns department-scoped list for coordinator', async () => {
      const res = await request(app)
        .get('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drives.length).toBe(2) // Only DEPARTMENTS[0] drives
      expect(res.body.drives.every((d) => d.departmentScope === DEPARTMENTS[0])).toBe(true)
      expect(res.body.pagination.total).toBe(2)
    })

    it('returns all drives for TPO', async () => {
      const res = await request(app).get('/drives').set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(3)
      expect(res.body.pagination.total).toBe(3)
    })

    it('rejects student access', async () => {
      const res = await request(app).get('/drives').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('filters by status', async () => {
      const res = await request(app)
        .get('/drives?status=published')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.drives[0].status).toBe('published')
    })

    it('filters by jobType', async () => {
      const res = await request(app)
        .get('/drives?jobType=full-time')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by tier', async () => {
      const res = await request(app)
        .get('/drives?tier=3')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by departmentScope (TPO only)', async () => {
      const res = await request(app)
        .get(`/drives?departmentScope=${DEPARTMENTS[1]}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.drives[0].departmentScope).toBe(DEPARTMENTS[1])
    })

    it('supports search by title', async () => {
      const res = await request(app)
        .get('/drives?search=Alpha')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.drives[0].title).toBe('Drive Alpha')
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/drives?page=1&limit=1')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(1)
      expect(res.body.pagination.total).toBe(2)
      expect(res.body.pagination.totalPages).toBe(2)
    })

    it('supports sorting', async () => {
      const res = await request(app)
        .get('/drives?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives[0].title).toBe('Drive Alpha')
      expect(res.body.drives[1].title).toBe('Drive Beta')
    })

    it('includes company populate', async () => {
      const res = await request(app)
        .get('/drives')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives[0].company).toHaveProperty('name')
      expect(res.body.drives[0].company).toHaveProperty('sector')
    })
  })

  describe('GET /drives/student (student drive list)', () => {
    beforeEach(async () => {
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Published Drive',
        status: 'published',
      })
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Registration Open Drive',
        status: 'registration_open',
      })
      await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Draft Drive',
        status: 'draft',
      })
    })

    it('returns only published+ drives for student', async () => {
      const res = await request(app)
        .get('/drives/student')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drives.length).toBe(2)
      expect(res.body.drives.every((d) => d.status !== 'draft')).toBe(true)
    })

    it('allows coordinator to access student list', async () => {
      const res = await request(app)
        .get('/drives/student')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('allows TPO to access student list', async () => {
      const res = await request(app)
        .get('/drives/student')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by jobType', async () => {
      const res = await request(app)
        .get('/drives/student?jobType=full-time')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by tier', async () => {
      const res = await request(app)
        .get('/drives/student?tier=3')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by CTC range', async () => {
      const res = await request(app)
        .get('/drives/student?ctcMin=10&ctcMax=15')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(2)
    })

    it('filters by status', async () => {
      const res = await request(app)
        .get('/drives/student?status=published')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.drives[0].status).toBe('published')
    })

    it('supports search', async () => {
      const res = await request(app)
        .get('/drives/student?search=Published')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.drives[0].title).toBe('Published Drive')
    })

    it('supports pagination and sorting', async () => {
      const res = await request(app)
        .get('/drives/student?page=1&limit=1&sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.drives.length).toBe(1)
      expect(res.body.pagination.total).toBe(2)
    })
  })

  describe('GET /drives/active-companies', () => {
    beforeEach(async () => {
      await Company.deleteMany({})
      await Company.create([
        {
          name: 'Active Company',
          sector: 'IT',
          hrContact: { name: 'HR1', email: 'hr1@active.com' },
          isActive: true,
        },
        {
          name: 'Inactive Company',
          sector: 'IT',
          hrContact: { name: 'HR2', email: 'hr2@inactive.com' },
          isActive: false,
        },
      ])
    })

    it('returns only active companies for student', async () => {
      const res = await request(app)
        .get('/drives/active-companies')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.companies.length).toBe(1)
      expect(res.body.companies[0].name).toBe('Active Company')
    })

    it('allows coordinator to access', async () => {
      const res = await request(app)
        .get('/drives/active-companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
    })

    it('allows TPO to access', async () => {
      const res = await request(app)
        .get('/drives/active-companies')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
    })
  })

  describe('GET /drives/:id (get single drive)', () => {
    let drive

    beforeEach(async () => {
      drive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Single Drive',
        departmentScope: DEPARTMENTS[0],
        status: 'published',
      })
    })

    it('returns drive for coordinator in same department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.title).toBe('Single Drive')
      expect(res.body.drive.company).toHaveProperty('name')
    })

    it('returns drive for TPO', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
    })

    it('returns 404 for coordinator in different department', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/drives/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid ID format', async () => {
      const res = await request(app)
        .get('/drives/invalid-id')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /drives/student/:id (get single drive for student)', () => {
    let publishedDrive, draftDrive

    beforeEach(async () => {
      publishedDrive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Published Drive',
        status: 'published',
      })
      draftDrive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Draft Drive',
        status: 'draft',
      })
    })

    it('returns published drive for student', async () => {
      const res = await request(app)
        .get(`/drives/student/${publishedDrive._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.title).toBe('Published Drive')
    })

    it('returns 404 for draft drive (not published+)', async () => {
      const res = await request(app)
        .get(`/drives/student/${draftDrive._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('allows coordinator to access student endpoint', async () => {
      const res = await request(app)
        .get(`/drives/student/${publishedDrive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
    })
  })

  describe('PUT /drives/:id (update drive)', () => {
    let drive

    beforeEach(async () => {
      drive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Original Title',
        departmentScope: DEPARTMENTS[0],
        status: 'draft',
      })
    })

    it('updates drive as coordinator in same department', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Updated Title', tier: 2 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.title).toBe('Updated Title')
      expect(res.body.drive.tier).toBe(2)
    })

    it('updates drive as TPO', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ title: 'TPO Updated' })

      expect(res.status).toBe(200)
      expect(res.body.drive.title).toBe('TPO Updated')
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send({ title: 'Unauthorized Update' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Update' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .put(`/drives/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ title: 'Updated' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid company ID on update', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ company: 'invalid-id' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('prevents coordinator from changing departmentScope', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ departmentScope: DEPARTMENTS[1] })

      expect(res.status).toBe(200)
      // departmentScope should remain the original (DEPARTMENTS[0])
      expect(res.body.drive.departmentScope).toBe(DEPARTMENTS[0])
    })

    it('allows TPO to change departmentScope', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ departmentScope: DEPARTMENTS[1] })

      expect(res.status).toBe(200)
      expect(res.body.drive.departmentScope).toBe(DEPARTMENTS[1])
    })

    it('allows status transitions', async () => {
      const res = await request(app)
        .put(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'published' })

      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('published')
    })
  })

  describe('DELETE /drives/:id (delete drive)', () => {
    let drive

    beforeEach(async () => {
      drive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'To Delete',
        departmentScope: DEPARTMENTS[0],
        status: 'draft',
      })
    })

    it('deletes drive as coordinator in same department', async () => {
      const res = await request(app)
        .delete(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Drive deleted successfully')

      const deleted = await Drive.findById(drive._id)
      expect(deleted).toBeNull()
    })

    it('deletes drive as TPO', async () => {
      const res = await request(app)
        .delete(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .delete(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .delete(`/drives/${drive._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .delete(`/drives/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })
  })

  describe('PATCH /drives/:id/status (update drive status)', () => {
    let draftDrive

    beforeEach(async () => {
      draftDrive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Status Test Drive',
        departmentScope: DEPARTMENTS[0],
        status: 'draft',
      })
    })

    it('transitions draft -> published as coordinator', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'published' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.status).toBe('published')
    })

    it('transitions draft -> published as TPO', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ status: 'published' })

      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('published')
    })

    it('rejects invalid transition (draft -> completed)', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'completed' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('INVALID_STATUS_TRANSITION')
      expect(res.body.message).toContain('Invalid status transition')
    })

    it('rejects invalid transition (published -> draft - backwards)', async () => {
      // First transition to published
      await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'published' })

      // Then try to go back to draft
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'draft' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('INVALID_STATUS_TRANSITION')
    })

    it('allows full lifecycle transition sequence', async () => {
      // draft -> published
      let res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'published' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('published')

      // published -> registration_open
      res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'registration_open' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('registration_open')

      // registration_open -> registration_closed
      res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'registration_closed' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('registration_closed')

      // registration_closed -> in_progress
      res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'in_progress' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('in_progress')

      // in_progress -> completed
      res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'completed' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('completed')

      // completed -> results_declared
      res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'results_declared' })
      expect(res.status).toBe(200)
      expect(res.body.drive.status).toBe('results_declared')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'published' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)
        .send({ status: 'published' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('rejects invalid status value', async () => {
      const res = await request(app)
        .patch(`/drives/${draftDrive._id}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'invalid_status' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .patch(`/drives/${fakeId}/status`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ status: 'published' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })
  })

  describe('POST /drives/:id/clone (clone drive)', () => {
    let publishedDrive

    beforeEach(async () => {
      publishedDrive = await Drive.create({
        ...validDriveData,
        company: company._id,
        title: 'Original Drive',
        departmentScope: DEPARTMENTS[0],
        status: 'published',
        registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      })
    })

    it('clones drive as coordinator in same department', async () => {
      const res = await request(app)
        .post(`/drives/${publishedDrive._id}/clone`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.drive.title).toBe('Original Drive (Copy)')
      expect(res.body.drive.status).toBe('draft')
      expect(res.body.drive.registrationDeadline).not.toBe(publishedDrive.registrationDeadline)
      expect(res.body.drive.company.toString()).toBe(company._id.toString())
      expect(res.body.drive.tier).toBe(publishedDrive.tier)
      // Convert Mongoose document to plain object for comparison
      expect(res.body.drive.eligibilityCriteria).toEqual(
        publishedDrive.eligibilityCriteria.toObject()
      )
    })

    it('clones drive as TPO', async () => {
      const res = await request(app)
        .post(`/drives/${publishedDrive._id}/clone`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(201)
      expect(res.body.drive.status).toBe('draft')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post(`/drives/${publishedDrive._id}/clone`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects coordinator in different department', async () => {
      const res = await request(app)
        .post(`/drives/${publishedDrive._id}/clone`)
        .set('Authorization', `Bearer ${coordinatorToken2}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('returns 404 for non-existent drive', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .post(`/drives/${fakeId}/clone`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('DRIVE_NOT_FOUND')
    })

    it('cloned drive has new registration deadline (30 days from now)', async () => {
      const res = await request(app)
        .post(`/drives/${publishedDrive._id}/clone`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(201)
      const clonedDeadline = new Date(res.body.drive.registrationDeadline).getTime()
      const expectedMin = Date.now() + 29 * 24 * 60 * 60 * 1000 // ~29 days
      const expectedMax = Date.now() + 31 * 24 * 60 * 60 * 1000 // ~31 days
      expect(clonedDeadline).toBeGreaterThanOrEqual(expectedMin)
      expect(clonedDeadline).toBeLessThanOrEqual(expectedMax)
    })
  })
})
