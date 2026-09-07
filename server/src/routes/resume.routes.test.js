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
  // Cloudinary not configured in tests - endpoints will return 503
  process.env.CLOUDINARY_CLOUD_NAME = ''
  process.env.CLOUDINARY_API_KEY = ''
  process.env.CLOUDINARY_API_SECRET = ''
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

describe('Resume Routes', () => {
  let studentUser, studentToken
  let coordinatorUser, coordinatorToken

  beforeEach(async () => {
    studentUser = new User({
      email: 'student-resume@example.com',
      password: 'StudentPass123!',
      role: 'student',
      active: true,
      mustResetPassword: false,
    })
    await studentUser.save()
    studentToken = generateAccessToken(studentUser)

    coordinatorUser = new User({
      email: 'coord-resume@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)
  })

  describe('GET /students/me/resumes/upload-params', () => {
    it('returns 503 when Cloudinary not configured', async () => {
      const res = await request(app)
        .get('/students/me/resumes/upload-params')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(503)
      expect(res.body.success).toBe(false)
      expect(res.body.code).toBe('UPLOAD_SERVICE_UNAVAILABLE')
    })
  })

  describe('GET /students/me/resumes/default', () => {
    it('returns null when no resumes exist', async () => {
      const res = await request(app)
        .get('/students/me/resumes/default')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.resume).toBeNull()
    })

    it('returns default resume when set', async () => {
      // Create a profile with a default resume
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'My Resume',
            cloudinaryPublicId: 'test-id-1',
            cloudinarySecureUrl: 'https://cloudinary.com/test.pdf',
            originalFilename: 'resume.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
          },
        ],
      })
      await profile.save()

      const res = await request(app)
        .get('/students/me/resumes/default')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.resume).toBeDefined()
      expect(res.body.resume.isDefault).toBe(true)
    })
  })

  describe('GET /students/me/resumes', () => {
    it('returns empty array when no resumes', async () => {
      const res = await request(app)
        .get('/students/me/resumes')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.resumes).toEqual([])
    })

    it('returns all resumes for student', async () => {
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'Resume 1',
            cloudinaryPublicId: 'test-id-1',
            cloudinarySecureUrl: 'https://cloudinary.com/test1.pdf',
            originalFilename: 'resume1.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
          },
          {
            label: 'Resume 2',
            cloudinaryPublicId: 'test-id-2',
            cloudinarySecureUrl: 'https://cloudinary.com/test2.pdf',
            originalFilename: 'resume2.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
            isDefault: false,
          },
        ],
      })
      await profile.save()

      const res = await request(app)
        .get('/students/me/resumes')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.resumes).toHaveLength(2)
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .get('/students/me/resumes')
        .set('Authorization', `Bearer ${coordinatorToken}`)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('FORBIDDEN')
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/students/me/resumes')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /students/me/resumes', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/students/me/resumes').send({
        label: 'My Resume',
        cloudinaryPublicId: 'test-id',
        cloudinarySecureUrl: 'https://cloudinary.com/test.pdf',
        originalFilename: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      })

      expect(res.status).toBe(401)
    })

    it('rejects coordinator access', async () => {
      const res = await request(app)
        .post('/students/me/resumes')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          label: 'My Resume',
          cloudinaryPublicId: 'test-id',
          cloudinarySecureUrl: 'https://cloudinary.com/test.pdf',
          originalFilename: 'resume.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        })

      expect(res.status).toBe(403)
    })

    it('validates required fields', async () => {
      // Create student profile first
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
      })
      await profile.save()

      const res = await request(app)
        .post('/students/me/resumes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          label: '',
          cloudinaryPublicId: '',
          cloudinarySecureUrl: 'invalid-url',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid Cloudinary URL', async () => {
      // Create student profile first
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
      })
      await profile.save()

      const res = await request(app)
        .post('/students/me/resumes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          label: 'Test Resume',
          cloudinaryPublicId: 'test-id',
          cloudinarySecureUrl: 'not-a-url',
          originalFilename: 'resume.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /students/me/resumes/:resumeId/default', () => {
    it('sets resume as default', async () => {
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'Resume 1',
            cloudinaryPublicId: 'test-id-1',
            cloudinarySecureUrl: 'https://cloudinary.com/test1.pdf',
            originalFilename: 'resume1.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
          },
          {
            label: 'Resume 2',
            cloudinaryPublicId: 'test-id-2',
            cloudinarySecureUrl: 'https://cloudinary.com/test2.pdf',
            originalFilename: 'resume2.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
            isDefault: false,
          },
        ],
      })
      await profile.save()

      const resumeId = profile.resumes[1]._id.toString()

      const res = await request(app)
        .put(`/students/me/resumes/${resumeId}/default`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify the default was switched
      const updatedProfile = await StudentProfile.findOne({ user: studentUser._id }).lean()
      expect(updatedProfile.resumes[0].isDefault).toBe(false)
      expect(updatedProfile.resumes[1].isDefault).toBe(true)
    })

    it('rejects invalid resume ID format', async () => {
      // Create student profile first
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
      })
      await profile.save()

      const res = await request(app)
        .put('/students/me/resumes/invalid-id/default')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects access to other student resume', async () => {
      const otherStudent = new User({
        email: 'other@example.com',
        password: 'Pass123!',
        role: 'student',
        active: true,
      })
      await otherStudent.save()

      const otherProfile = new StudentProfile({
        user: otherStudent._id,
        rollNumber: 'CS2021002',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'Other Resume',
            cloudinaryPublicId: 'test-id-3',
            cloudinarySecureUrl: 'https://cloudinary.com/test3.pdf',
            originalFilename: 'resume3.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: false,
          },
        ],
      })
      await otherProfile.save()

      const resumeId = otherProfile.resumes[0]._id.toString()

      const res = await request(app)
        .put(`/students/me/resumes/${resumeId}/default`)
        .set('Authorization', `Bearer ${studentToken}`)

      // Should return 404 since resume not found for this student
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /students/me/resumes/:resumeId', () => {
    it('deletes a resume', async () => {
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'Resume 1',
            cloudinaryPublicId: 'test-id-1',
            cloudinarySecureUrl: 'https://cloudinary.com/test1.pdf',
            originalFilename: 'resume1.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
          },
          {
            label: 'Resume 2',
            cloudinaryPublicId: 'test-id-2',
            cloudinarySecureUrl: 'https://cloudinary.com/test2.pdf',
            originalFilename: 'resume2.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
            isDefault: false,
          },
        ],
      })
      await profile.save()

      const resumeId = profile.resumes[1]._id.toString()

      const res = await request(app)
        .delete(`/students/me/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify resume was deleted
      const updatedProfile = await StudentProfile.findOne({ user: studentUser._id }).lean()
      expect(updatedProfile.resumes).toHaveLength(1)
      expect(updatedProfile.resumes[0]._id.toString()).toBe(profile.resumes[0]._id.toString())
    })

    it('makes another resume default when deleting default', async () => {
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        resumes: [
          {
            label: 'Resume 1',
            cloudinaryPublicId: 'test-id-1',
            cloudinarySecureUrl: 'https://cloudinary.com/test1.pdf',
            originalFilename: 'resume1.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            isDefault: true,
          },
          {
            label: 'Resume 2',
            cloudinaryPublicId: 'test-id-2',
            cloudinarySecureUrl: 'https://cloudinary.com/test2.pdf',
            originalFilename: 'resume2.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
            isDefault: false,
          },
        ],
      })
      await profile.save()

      const resumeId = profile.resumes[0]._id.toString() // This is the default one

      const res = await request(app)
        .delete(`/students/me/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(200)

      // The remaining resume should now be default
      const updatedProfile = await StudentProfile.findOne({ user: studentUser._id }).lean()
      expect(updatedProfile.resumes[0].isDefault).toBe(true)
    })

    it('rejects invalid resume ID format', async () => {
      // Create student profile first
      const profile = new StudentProfile({
        user: studentUser._id,
        rollNumber: 'CS2021001',
        branch: 'Computer Science & Engineering',
        batch: 2021,
      })
      await profile.save()

      const res = await request(app)
        .delete('/students/me/resumes/invalid-id')
        .set('Authorization', `Bearer ${studentToken}`)

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })
  })
})
