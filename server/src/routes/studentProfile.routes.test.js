import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import User from '../models/User.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
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
  await StudentProfile.deleteMany({})
})

describe('StudentProfile API', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken
  let tpoUser, tpoToken
  let studentProfile

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-profile@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-profile@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)

    tpoUser = new User({
      email: 'tpo-profile@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    tpoToken = generateAccessToken(tpoUser)

    // Create a student profile
    studentProfile = new StudentProfile({
      user: studentUser._id,
      rollNumber: 'CS2021001',
      branch: 'Computer Science & Engineering',
      batch: 2021,
      section: 'A',
      cgpaOverall: 8.5,
      skills: ['JavaScript', 'React'],
    })
    await studentProfile.save()
  })

  describe('GET /students/me/profile (student self-profile)', () => {
    it('returns student own profile', async () => {
      const res = await request(app)
        .get('/students/me/profile')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.profile).toBeDefined()
      expect(res.body.profile.rollNumber).toBe('CS2021001')
      expect(res.body.profile.branch).toBe('Computer Science & Engineering')
      expect(res.body.profile.cgpaOverall).toBe(8.5)
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/students/me/profile')
      expect(res.status).toBe(401)
    })

    it('rejects coordinator access (requires student role)', async () => {
      const res = await request(app)
        .get('/students/me/profile')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('returns 404 for student without profile', async () => {
      const newStudent = new User({
        email: 'noprofile@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await newStudent.save()
      const token = generateAccessToken(newStudent)

      const res = await request(app)
        .get('/students/me/profile')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
      expect(res.body.code).toBe('PROFILE_NOT_FOUND')
    })
  })

  describe('PUT /students/me/profile (student updates own profile)', () => {
    it('updates allowed fields (cgpaOverall, skills)', async () => {
      const res = await request(app)
        .put('/students/me/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cgpaOverall: 9.0, skills: ['JavaScript', 'React', 'Node.js'] })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.profile.cgpaOverall).toBe(9.0)
      expect(res.body.profile.skills).toEqual(['JavaScript', 'React', 'Node.js'])

      // Verify in DB
      const profile = await StudentProfile.findOne({ user: studentUser._id }).lean()
      expect(profile.cgpaOverall).toBe(9.0)
    })

    it('ignores disallowed fields (rollNumber, branch)', async () => {
      const res = await request(app)
        .put('/students/me/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rollNumber: 'HACKED', branch: 'Hacked Branch', cgpaOverall: 7.0 })

      expect(res.status).toBe(200)
      expect(res.body.profile.cgpaOverall).toBe(7.0)
      expect(res.body.profile.rollNumber).toBe('CS2021001')
      expect(res.body.profile.branch).toBe('Computer Science & Engineering')
    })

    it('rejects invalid CGPA (out of range)', async () => {
      const res = await request(app)
        .put('/students/me/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cgpaOverall: 15 })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /students (coordinator/TPO scoped list)', () => {
    let otherStudentProfile

    beforeEach(async () => {
      // Create another student in same department
      const otherStudent = new User({
        email: 'student2@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await otherStudent.save()

      otherStudentProfile = new StudentProfile({
        user: otherStudent._id,
        rollNumber: 'CS2021002',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'B',
        cgpaOverall: 7.8,
      })
      await otherStudentProfile.save()

      // Create student in different department
      const itStudent = new User({
        email: 'student3@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await itStudent.save()

      const itProfile = new StudentProfile({
        user: itStudent._id,
        rollNumber: 'IT2021001',
        branch: 'Information Technology',
        batch: 2021,
        cgpaOverall: 8.0,
      })
      await itProfile.save()
    })

    it('returns scoped list for coordinator', async () => {
      const res = await request(app)
        .get('/students')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.profiles).toBeDefined()
      expect(res.body.profiles.length).toBe(2) // Only CS dept
      expect(res.body.profiles.every((p) => p.branch === 'Computer Science & Engineering')).toBe(
        true
      )
    })

    it('returns all departments for TPO', async () => {
      const res = await request(app).get('/students').set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.length).toBe(3) // All departments
    })

    it('rejects student access', async () => {
      const res = await request(app).get('/students').set('Authorization', `Bearer ${studentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('filters by batch', async () => {
      const res = await request(app)
        .get('/students?batch=2021')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.every((p) => p.batch === 2021)).toBe(true)
    })

    it('filters by placementStatus', async () => {
      // Update one profile to placed
      await StudentProfile.findOneAndUpdate(
        { rollNumber: 'CS2021001' },
        { placementStatus: 'placed' }
      )

      const res = await request(app)
        .get('/students?placementStatus=placed')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.length).toBe(1)
      expect(res.body.profiles[0].placementStatus).toBe('placed')
    })

    it('filters by cgpaMin/cgpaMax', async () => {
      const res = await request(app)
        .get('/students?cgpaMin=8.0')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.every((p) => p.cgpaOverall >= 8.0)).toBe(true)
    })

    it('filters by backlogsMax', async () => {
      // Update one profile with backlogs
      await StudentProfile.findOneAndUpdate({ rollNumber: 'CS2021001' }, { backlogsActive: 2 })
      await StudentProfile.findOneAndUpdate({ rollNumber: 'CS2021002' }, { backlogsActive: 0 })

      const res = await request(app)
        .get('/students?backlogsMax=1')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.every((p) => p.backlogsActive <= 1)).toBe(true)
    })

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/students?page=1&limit=1')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles.length).toBe(1)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(1)
      expect(res.body.pagination.total).toBe(2)
    })

    it('supports sorting', async () => {
      const res = await request(app)
        .get('/students?sortBy=cgpaOverall&sortOrder=asc')
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profiles[0].cgpaOverall).toBeLessThanOrEqual(res.body.profiles[1].cgpaOverall)
    })
  })

  describe('GET /students/:id (coordinator/TPO single profile)', () => {
    it('returns profile within scope', async () => {
      const res = await request(app)
        .get(`/students/${studentProfile._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.profile.rollNumber).toBe('CS2021001')
    })

    it('returns 403 for profile outside coordinator scope', async () => {
      // Create IT student
      const itStudent = new User({
        email: 'itstudent@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await itStudent.save()

      const itProfile = new StudentProfile({
        user: itStudent._id,
        rollNumber: 'IT2021001',
        branch: 'Information Technology',
        batch: 2021,
      })
      await itProfile.save()

      const res = await request(app)
        .get(`/students/${itProfile._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('allows TPO to access any profile', async () => {
      const itStudent = new User({
        email: 'itstudent2@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await itStudent.save()

      const itProfile = new StudentProfile({
        user: itStudent._id,
        rollNumber: 'IT2021002',
        branch: 'Information Technology',
        batch: 2021,
      })
      await itProfile.save()

      const res = await request(app)
        .get(`/students/${itProfile._id}`)
        .set('Authorization', `Bearer ${tpoToken}`)

      expect(res.status).toBe(200)
      expect(res.body.profile.rollNumber).toBe('IT2021002')
    })
  })

  describe('PUT /students/:id (coordinator/TPO update profile)', () => {
    it('updates allowed admin fields (placementStatus, isBlacklisted)', async () => {
      const res = await request(app)
        .put(`/students/${studentProfile._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ placementStatus: 'placed', isBlacklisted: true, blacklistReason: 'Disciplinary' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.profile.placementStatus).toBe('placed')
      expect(res.body.profile.isBlacklisted).toBe(true)
      expect(res.body.profile.blacklistReason).toBe('Disciplinary')
    })

    it('ignores disallowed fields (rollNumber, user, branch)', async () => {
      const res = await request(app)
        .put(`/students/${studentProfile._id}`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ rollNumber: 'HACKED', branch: 'Hacked', placementStatus: 'placed' })

      expect(res.status).toBe(200)
      expect(res.body.profile.placementStatus).toBe('placed')
      expect(res.body.profile.rollNumber).toBe('CS2021001')
      expect(res.body.profile.branch).toBe('Computer Science & Engineering')
    })

    it('rejects student access', async () => {
      const res = await request(app)
        .put(`/students/${studentProfile._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ placementStatus: 'placed' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects invalid profile ID format', async () => {
      const res = await request(app)
        .put('/students/invalid-id')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ placementStatus: 'placed' })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })
})
