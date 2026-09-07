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

describe('POST /students/bulk-import', () => {
  let coordinatorToken
  let coordinatorUser

  beforeEach(async () => {
    coordinatorUser = new User({
      email: 'coord-import@example.com',
      password: 'CoordPass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
      active: true,
    })
    await coordinatorUser.save()
    coordinatorToken = generateAccessToken(coordinatorUser)
  })

  const createCsvBuffer = (rows) => {
    const headers = 'rollNumber,name,email,branch,batch,section\n'
    const data = rows
      .map((r) => `${r.rollNumber},${r.name},${r.email},${r.branch},${r.batch},${r.section || ''}`)
      .join('\n')
    return Buffer.from(headers + data)
  }

  it('rejects request without file', async () => {
    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('NO_FILE')
  })

  it('rejects non-CSV file (multer rejects before controller)', async () => {
    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', Buffer.from('not a csv'), 'test.txt')

    // Multer's fileFilter rejects with 400 via error handler
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('imports valid CSV with multiple students', async () => {
    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
      {
        rollNumber: 'IT2021002',
        name: 'Bob Singh',
        email: 'bob@student.skit.ac.in',
        branch: 'Information Technology',
        batch: 2021,
        section: 'B',
      },
      {
        rollNumber: 'EC2021003',
        name: 'Carol Gupta',
        email: 'carol@student.skit.ac.in',
        branch: 'Electronics & Communication Engineering',
        batch: 2021,
        section: 'A',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.summary.total).toBe(3)
    expect(res.body.summary.succeeded).toBe(3)
    expect(res.body.summary.failed).toBe(0)
    expect(res.body.results).toHaveLength(3)

    // Verify users and profiles created
    const expectedBranches = {
      CS2021001: 'Computer Science & Engineering',
      IT2021002: 'Information Technology',
      EC2021003: 'Electronics & Communication Engineering',
    }
    for (const result of res.body.results) {
      expect(result.status).toBe('success')
      const user = await User.findOne({ email: result.email })
      expect(user).toBeTruthy()
      expect(user.role).toBe('student')
      expect(user.mustResetPassword).toBe(true)

      const profile = await StudentProfile.findOne({ rollNumber: result.rollNumber })
      expect(profile).toBeTruthy()
      expect(profile.branch).toBe(expectedBranches[result.rollNumber])
      expect(profile.batch).toBe(2021)
      expect(profile.user.toString()).toBe(user._id.toString())
    }
  }, 15000)

  it('handles mixed valid and invalid rows with per-row error report', async () => {
    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
      {
        rollNumber: 'CS2021002',
        name: 'Bob Singh',
        email: 'invalid-email',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      }, // invalid email
      {
        rollNumber: 'CS2021003',
        name: 'Carol Gupta',
        email: 'carol@student.skit.ac.in',
        branch: 'Invalid Branch',
        batch: 2021,
        section: 'A',
      }, // invalid branch
      {
        rollNumber: 'IT2021004',
        name: 'David Roy',
        email: 'david@student.skit.ac.in',
        branch: 'Information Technology',
        batch: 2021,
        section: 'B',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.summary.total).toBe(4)
    expect(res.body.summary.succeeded).toBe(2)
    expect(res.body.summary.failed).toBe(2)

    // Check error details
    const errors = res.body.results.filter((r) => r.status === 'error')
    expect(errors).toHaveLength(2)
    expect(errors[0].message).toContain('Invalid email format')
    expect(errors[1].message).toContain('Invalid branch')
  })

  it('handles duplicate roll numbers (reported as row error, not 500)', async () => {
    // Pre-create a profile with this roll number
    const existingUser = new User({
      email: 'existing@student.skit.ac.in',
      password: 'Pass123!',
      role: 'student',
      active: true,
    })
    await existingUser.save()

    const existingProfile = new StudentProfile({
      user: existingUser._id,
      rollNumber: 'CS2021001',
      branch: 'Computer Science & Engineering',
      batch: 2021,
    })
    await existingProfile.save()

    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    // Returns 200 with summary showing failure (per-row error reporting)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.summary.total).toBe(1)
    expect(res.body.summary.succeeded).toBe(0)
    expect(res.body.summary.failed).toBe(1)
    expect(res.body.results[0].message).toContain('Roll number already exists')
  })

  it('handles duplicate emails (reported as row error, not 500)', async () => {
    const existingUser = new User({
      email: 'alice@student.skit.ac.in',
      password: 'Pass123!',
      role: 'student',
      active: true,
    })
    await existingUser.save()

    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)
    expect(res.body.summary.succeeded).toBe(0)
    expect(res.body.summary.failed).toBe(1)
    expect(res.body.results[0].message).toContain('Email already exists')
  })

  it('handles empty CSV (returns 200 with empty results per acceptance criteria)', async () => {
    const csvBuffer = Buffer.from('rollNumber,name,email,branch,batch,section\n')

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'empty.csv')

    // Empty CSV returns 200 with empty results per acceptance criteria
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.summary.total).toBe(0)
    expect(res.body.summary.succeeded).toBe(0)
    expect(res.body.summary.failed).toBe(0)
    expect(res.body.results).toHaveLength(0)
  })

  it('handles CSV with only headers (returns 200 with empty results)', async () => {
    const csvBuffer = Buffer.from('rollNumber,name,email,branch,batch,section\n')

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'headers-only.csv')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.summary.total).toBe(0)
    expect(res.body.summary.succeeded).toBe(0)
    expect(res.body.summary.failed).toBe(0)
  })

  it('allows TPO role', async () => {
    const tpoUser = new User({
      email: 'tpo-import@example.com',
      password: 'TpoPass123!',
      role: 'tpo',
      active: true,
    })
    await tpoUser.save()
    const tpoToken = generateAccessToken(tpoUser)

    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${tpoToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)
    expect(res.body.summary.succeeded).toBe(1)
  })

  it('sets mustResetPassword=true for created users', async () => {
    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)
    const user = await User.findOne({ email: 'alice@student.skit.ac.in' })
    expect(user.mustResetPassword).toBe(true)
  })

  it('creates StudentProfile with correct branch and batch', async () => {
    const csvBuffer = createCsvBuffer([
      {
        rollNumber: 'CS2021001',
        name: 'Alice Kumar',
        email: 'alice@student.skit.ac.in',
        branch: 'Computer Science & Engineering',
        batch: 2021,
        section: 'A',
      },
      {
        rollNumber: 'ME2021002',
        name: 'Bob Singh',
        email: 'bob@student.skit.ac.in',
        branch: 'Mechanical Engineering',
        batch: 2022,
        section: 'B',
      },
    ])

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students.csv')

    expect(res.status).toBe(200)

    const profile1 = await StudentProfile.findOne({ rollNumber: 'CS2021001' })
    expect(profile1.branch).toBe('Computer Science & Engineering')
    expect(profile1.batch).toBe(2021)
    expect(profile1.section).toBe('A')

    const profile2 = await StudentProfile.findOne({ rollNumber: 'ME2021002' })
    expect(profile2.branch).toBe('Mechanical Engineering')
    expect(profile2.batch).toBe(2022)
    expect(profile2.section).toBe('B')
  })

  it('handles 50 rows (acceptance criteria)', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      rollNumber: `CS2021${String(i + 1).padStart(3, '0')}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@student.skit.ac.in`,
      branch: 'Computer Science & Engineering',
      batch: 2021,
      section: 'A',
    }))

    const csvBuffer = createCsvBuffer(rows)

    const res = await request(app)
      .post('/students/bulk-import')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .attach('file', csvBuffer, 'students-50.csv')

    expect(res.status).toBe(200)
    expect(res.body.summary.total).toBe(50)
    expect(res.body.summary.succeeded).toBe(50)
    expect(res.body.summary.failed).toBe(0)
  }, 60000)
})
