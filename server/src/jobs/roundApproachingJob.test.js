// Round approaching job tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set required env vars before importing modules that use config
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
process.env.REMINDER_ADVANCE_HOURS = '24'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Round from '../models/Round.model.js'
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import User from '../models/User.model.js'
import Application from '../models/Application.model.js'
import Notification from '../models/Notification.model.js'
import { runRoundApproachingJob } from './roundApproachingJob.js'

let mongoServer

describe('Round Approaching Job', () => {
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  it('should return zero counts when no rounds are upcoming', async () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'published',
    })
    await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Future Round',
      dateTime: new Date('2026-02-01T10:00:00Z'),
      mode: 'online',
    })

    const result = await runRoundApproachingJob()

    expect(result.roundsChecked).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })

  it('should notify shortlisted applicants for upcoming rounds', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'registration_closed',
    })
    const round = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Technical Interview',
      dateTime: new Date('2026-01-16T10:00:00Z'),
      mode: 'online',
      meetingLink: 'https://meet.example.com',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    await Application.create({
      student: student._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      roundStatuses: [{ round: round._id, status: 'shortlisted' }],
    })

    const result = await runRoundApproachingJob()

    expect(result.roundsChecked).toBe(1)
    expect(result.notificationsSent).toBe(1)

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('deadline_approaching')
    expect(notifications[0].message).toContain('Technical Interview')
    expect(notifications[0].message).toContain('Test Corp')
  })

  it('should notify cleared applicants for upcoming rounds', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'registration_closed',
    })
    const round = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'HR Interview',
      dateTime: new Date('2026-01-16T10:00:00Z'),
      mode: 'offline',
      venue: 'Conference Room A',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    await Application.create({
      student: student._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      roundStatuses: [{ round: round._id, status: 'cleared' }],
    })

    const result = await runRoundApproachingJob()

    expect(result.notificationsSent).toBe(1)

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications[0].message).toContain('HR Interview')
    expect(notifications[0].message).toContain('Conference Room A')
  })

  it('should be idempotent - running twice does not send duplicate notifications', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'registration_closed',
    })
    const round = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Technical Interview',
      dateTime: new Date('2026-01-16T10:00:00Z'),
      mode: 'online',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    await Application.create({
      student: student._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      roundStatuses: [{ round: round._id, status: 'shortlisted' }],
    })

    const result1 = await runRoundApproachingJob()
    const result2 = await runRoundApproachingJob()

    expect(result1.notificationsSent).toBe(1)
    expect(result2.notificationsSent).toBe(0)

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications).toHaveLength(1)
  })

  it('should not notify applicants with pending/absent/not_cleared status', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'registration_closed',
    })
    const round = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Technical Interview',
      dateTime: new Date('2026-01-16T10:00:00Z'),
      mode: 'online',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    await Application.create({
      student: student._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      roundStatuses: [{ round: round._id, status: 'pending' }],
    })

    const result = await runRoundApproachingJob()

    expect(result.notificationsSent).toBe(0)
  })

  it('should not notify for rounds in the past', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const drive = await Drive.create({
      company: company._id,
      title: 'Test Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 7,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'registration_closed',
    })
    const round = await Round.create({
      drive: drive._id,
      roundNumber: 1,
      name: 'Past Round',
      dateTime: new Date('2026-01-10T10:00:00Z'),
      mode: 'online',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    await Application.create({
      student: student._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      roundStatuses: [{ round: round._id, status: 'shortlisted' }],
    })

    const result = await runRoundApproachingJob()

    expect(result.roundsChecked).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })
})
