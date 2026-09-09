// Company routes integration tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import Company from '../models/Company.model.js'
import { generateAccessToken } from '../services/auth.service.js'

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
})

describe('Company API', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let tpoUser, tpoToken

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-company@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-company@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    tpoUser = new User({
      email: 'tpo-company@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)
  })

  describe('POST /companies (create company)', () => {
    const validCompany = {
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
    }

    it('creates company as coordinator', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validCompany)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.company.name).toBe('Test Company Pvt Ltd')
      expect(res.body.company.sector).toBe('IT Services')
      expect(res.body.company.hrContact.email).toBe('hr@testcompany.com')
      expect(res.body.company.isActive).toBe(true)
    })

    it('creates company as TPO', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${tpoToken}`)
        .send(validCompany)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validCompany)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/companies').send(validCompany)
      expect(res.status).toBe(401)
    })

    it('rejects duplicate company name', async () => {
      await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validCompany)

      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send(validCompany)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid hrContact email', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validCompany, hrContact: { ...validCompany.hrContact, email: 'invalid-email' } })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Only Name' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid website URL', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ ...validCompany, website: 'not-a-url' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /companies (list companies)', () => {
    beforeEach(async () => {
      await Company.create([
        {
          name: 'Company Alpha',
          sector: 'IT Services',
          about: 'Alpha company',
          hrContact: { name: 'HR Alpha', email: 'hr@alpha.com' },
          website: 'https://alpha.com',
          isActive: true,
        },
        {
          name: 'Company Beta',
          sector: 'Manufacturing',
          about: 'Beta company',
          hrContact: { name: 'HR Beta', email: 'hr@beta.com' },
          website: 'https://beta.com',
          isActive: true,
        },
        {
          name: 'Company Gamma',
          sector: 'IT Services',
          about: 'Gamma company',
          hrContact: { name: 'HR Gamma', email: 'hr@gamma.com' },
          website: 'https://gamma.com',
          isActive: false,
        },
      ])
    })

    it('returns paginated list for coordinator', async () => {
      const res = await request(app)
        .get('/companies')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.companies).toBeDefined()
      expect(res.body.companies.length).toBe(3)
      expect(res.body.pagination.total).toBe(3)
    })

    it('returns paginated list for TPO', async () => {
      const res = await request(app).get('/companies').set('Authorization', `Bearer ${tpoToken}`)
      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(3)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get('/companies')
        .set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('filters by search (name)', async () => {
      const res = await request(app)
        .get('/companies?search=Alpha')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
      expect(res.body.companies[0].name).toBe('Company Alpha')
    })

    it('filters by search (sector)', async () => {
      const res = await request(app)
        .get('/companies?search=manufacturing')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
      expect(res.body.companies[0].sector).toBe('Manufacturing')
    })

    it('filters by sector', async () => {
      const res = await request(app)
        .get('/companies?sector=IT%20Services')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(2)
      expect(res.body.companies.every((c) => c.sector === 'IT Services')).toBe(true)
    })

    it('filters by isActive', async () => {
      const res = await request(app)
        .get('/companies?isActive=true')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(2)
      expect(res.body.companies.every((c) => c.isActive === true)).toBe(true)
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/companies?page=1&limit=2')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(2)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(2)
      expect(res.body.pagination.total).toBe(3)
      expect(res.body.pagination.totalPages).toBe(2)
    })

    it('supports sorting', async () => {
      const res = await request(app)
        .get('/companies?sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies[0].name).toBe('Company Alpha')
      expect(res.body.companies[1].name).toBe('Company Beta')
      expect(res.body.companies[2].name).toBe('Company Gamma')
    })
  })

  describe('GET /companies/active (student active companies list)', () => {
    beforeEach(async () => {
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
        .get('/companies/active')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.companies.length).toBe(1)
      expect(res.body.companies[0].name).toBe('Active Company')
      expect(res.body.companies[0]).toHaveProperty('name')
      expect(res.body.companies[0]).toHaveProperty('sector')
    })

    it('allows coordinator to access active list', async () => {
      const res = await request(app)
        .get('/companies/active')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
    })

    it('allows TPO to access active list', async () => {
      const res = await request(app)
        .get('/companies/active')
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.companies.length).toBe(1)
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/companies/active')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /companies/:id (get single company)', () => {
    let company

    beforeEach(async () => {
      company = await Company.create({
        name: 'Single Company',
        sector: 'IT',
        hrContact: { name: 'HR', email: 'hr@single.com' },
        isActive: true,
      })
    })

    it('returns company for coordinator', async () => {
      const res = await request(app)
        .get(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.company.name).toBe('Single Company')
    })

    it('returns company for TPO', async () => {
      const res = await request(app)
        .get(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .get(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent company', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .get(`/companies/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('COMPANY_NOT_FOUND')
    })

    it('rejects invalid ID format', async () => {
      const res = await request(app)
        .get('/companies/invalid-id')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /companies/:id (update company)', () => {
    let company

    beforeEach(async () => {
      company = await Company.create({
        name: 'Original Name',
        sector: 'Original Sector',
        hrContact: { name: 'Original HR', email: 'hr@original.com' },
        isActive: true,
      })
    })

    it('updates company as coordinator', async () => {
      const res = await request(app)
        .put(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Updated Name', sector: 'Updated Sector' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.company.name).toBe('Updated Name')
      expect(res.body.company.sector).toBe('Updated Sector')
    })

    it('updates company as TPO', async () => {
      const res = await request(app)
        .put(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)
        .send({ name: 'TPO Updated' })

      expect(res.status).toBe(200)
      expect(res.body.company.name).toBe('TPO Updated')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Student Update' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent company', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .put(`/companies/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Updated' })

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('COMPANY_NOT_FOUND')
    })

    it('rejects duplicate name on update', async () => {
      await Company.create({
        name: 'Another Company',
        sector: 'IT',
        hrContact: { name: 'HR', email: 'hr@another.com' },
        isActive: true,
      })

      const res = await request(app)
        .put(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Another Company' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('ignores disallowed fields (createdAt, updatedAt)', async () => {
      const res = await request(app)
        .put(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ name: 'Updated', createdAt: '2020-01-01', updatedAt: '2020-01-01' })

      expect(res.status).toBe(200)
      expect(res.body.company.name).toBe('Updated')
      expect(new Date(res.body.company.createdAt).getTime()).not.toBe(
        new Date('2020-01-01').getTime()
      )
    })
  })

  describe('DELETE /companies/:id (delete company)', () => {
    let company

    beforeEach(async () => {
      company = await Company.create({
        name: 'To Delete',
        sector: 'IT',
        hrContact: { name: 'HR', email: 'hr@delete.com' },
        isActive: true,
      })
    })

    it('deletes company as coordinator', async () => {
      const res = await request(app)
        .delete(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Company deleted successfully')

      const deleted = await Company.findById(company._id)
      expect(deleted).toBeNull()
    })

    it('deletes company as TPO', async () => {
      const res = await request(app)
        .delete(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .delete(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent company', async () => {
      const fakeId = new mongoose.Types.ObjectId()
      const res = await request(app)
        .delete(`/companies/${fakeId}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(404)
      expect(res.body.code).toBe('COMPANY_NOT_FOUND')
    })
  })
})
