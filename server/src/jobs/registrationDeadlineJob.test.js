// Registration deadline job tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set required env vars before importing modules that use config
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
process.env.REMINDER_ADVANCE_HOURS = '24'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import User from '../models/User.model.js'
import Application from '../models/Application.model.js'
import Notification from '../models/Notification.model.js'
import SeasonConfig from '../models/SeasonConfig.model.js'
import { runRegistrationDeadlineJob } from './registrationDeadlineJob.js'

let mongoServer

describe('Registration Deadline Job', () => {
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

  it('should return zero counts when no drives have approaching deadlines', async () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    await Drive.create({
      company: company._id,
      title: 'Future Drive',
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

    const result = await runRegistrationDeadlineJob()

    expect(result.drivesChecked).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })

  it('should send notifications for drives with deadlines within advance window', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const _student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.drivesChecked).toBe(1)
    expect(result.notificationsSent).toBe(1)

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('deadline_approaching')
    expect(notifications[0].message).toContain('Upcoming Drive')
  })

  it('should not notify students who already applied', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const _student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
    })

    await Application.create({
      student: _student._id,
      drive: _drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.notificationsSent).toBe(0)
  })

  it('should be idempotent - running twice does not send duplicate notifications', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const _student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result1 = await runRegistrationDeadlineJob()
    const result2 = await runRegistrationDeadlineJob()

    expect(result1.notificationsSent).toBe(1)
    expect(result2.notificationsSent).toBe(0)

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications).toHaveLength(1)
  })

  it('should not notify for draft drives', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    await Drive.create({
      company: company._id,
      title: 'Draft Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'draft',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const _student = await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.drivesChecked).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })

  it('should not notify ineligible students', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
      jobType: 'full-time',
      compensation: { ctcLpa: 10 },
      eligibilityCriteria: {
        branches: ['Computer Science & Engineering'],
        batches: [2026],
        minCgpa: 8,
        maxBacklogs: 0,
        min10th: 60,
        min12th: 60,
      },
      tier: 1,
      vacancies: 5,
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 7,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.notificationsSent).toBe(0)
  })

  it('should not notify blacklisted students', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
      isBlacklisted: true,
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.notificationsSent).toBe(0)
  })

  it('should not notify placed students (one-offer rule)', async () => {
    const now = new Date('2026-01-15T10:00:00Z')
    vi.setSystemTime(now)

    const company = await Company.create({
      name: 'Test Corp',
      sector: 'IT',
      hrContact: { name: 'HR Contact', email: 'hr@testcorp.com' },
    })
    const _drive = await Drive.create({
      company: company._id,
      title: 'Upcoming Drive',
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
      registrationDeadline: new Date('2026-01-16T10:00:00Z'),
      status: 'published',
    })

    const user = await User.create({
      email: 'student@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    await StudentProfile.create({
      user: user._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
      cgpaOverall: 8,
      backlogsActive: 0,
      tenthDetails: { percentage: 90 },
      twelfthDetails: { percentage: 90 },
      placementStatus: 'placed',
      currentTier: 2,
    })

    await SeasonConfig.create({
      season: '2025-26',
      tierConfig: { lowerIsBetter: true, maxTier: 10 },
      oneOfferRule: { enabled: true, allowTierUpgrade: true },
      isActive: true,
    })

    const result = await runRegistrationDeadlineJob()

    expect(result.notificationsSent).toBe(0)
  })
})
