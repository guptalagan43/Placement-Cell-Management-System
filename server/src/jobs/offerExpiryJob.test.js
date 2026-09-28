// Offer expiry job tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set required env vars before importing modules that use config
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import OfferLetter from '../models/OfferLetter.model.js'
import Application from '../models/Application.model.js'
import Drive from '../models/Drive.model.js'
import Company from '../models/Company.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import User from '../models/User.model.js'
import Notification from '../models/Notification.model.js'
import { runOfferExpiryJob } from './offerExpiryJob.js'

let mongoServer

describe('Offer Expiry Job', () => {
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

  it('should return zero counts when no offers are expired', async () => {
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
      status: 'completed',
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
    const application = await Application.create({
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
    })

    await OfferLetter.create({
      application: application._id,
      document: {
        cloudinaryPublicId: 'doc1',
        cloudinarySecureUrl: 'https://example.com/doc1.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-02-01T10:00:00Z'),
      status: 'pending',
      issuedBy: user._id,
    })

    const result = await runOfferExpiryJob()

    expect(result.offersChecked).toBe(0)
    expect(result.offersExpired).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })

  it('should expire pending offers past their deadline', async () => {
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
      status: 'completed',
    })

    const admin = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hash',
      role: 'tpo',
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
    const application = await Application.create({
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
    })

    const offer = await OfferLetter.create({
      application: application._id,
      document: {
        cloudinaryPublicId: 'doc1',
        cloudinarySecureUrl: 'https://example.com/doc1.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-01-14T10:00:00Z'),
      status: 'pending',
      issuedBy: admin._id,
    })

    const result = await runOfferExpiryJob()

    expect(result.offersChecked).toBe(1)
    expect(result.offersExpired).toBe(1)
    expect(result.notificationsSent).toBe(1)

    const expiredOffer = await OfferLetter.findById(offer._id).lean()
    expect(expiredOffer.status).toBe('expired')

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('deadline_approaching')
    expect(notifications[0].message).toContain('expired')
  })

  it('should not expire already accepted/declined/expired offers', async () => {
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
      status: 'completed',
    })

    const admin = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hash',
      role: 'tpo',
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
    const application = await Application.create({
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
    })

    await OfferLetter.create({
      application: application._id,
      document: {
        cloudinaryPublicId: 'doc1',
        cloudinarySecureUrl: 'https://example.com/doc1.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-01-14T10:00:00Z'),
      status: 'accepted',
      issuedBy: admin._id,
    })

    const result = await runOfferExpiryJob()

    expect(result.offersChecked).toBe(0)
    expect(result.offersExpired).toBe(0)
    expect(result.notificationsSent).toBe(0)
  })

  it('should handle multiple expired offers', async () => {
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
      status: 'completed',
    })

    const admin = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hash',
      role: 'tpo',
    })

    // Student 1
    const user1 = await User.create({
      email: 'student1@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student1 = await StudentProfile.create({
      user: user1._id,
      rollNumber: 'STU001',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    const application1 = await Application.create({
      student: student1._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
    })

    // Student 2
    const user2 = await User.create({
      email: 'student2@test.com',
      passwordHash: 'hash',
      role: 'student',
    })
    const student2 = await StudentProfile.create({
      user: user2._id,
      rollNumber: 'STU002',
      branch: 'Computer Science & Engineering',
      batch: 2026,
    })
    const application2 = await Application.create({
      student: student2._id,
      drive: drive._id,
      resumeSnapshot: {
        label: 'Resume 1',
        cloudinaryPublicId: 'id',
        cloudinarySecureUrl: 'url',
        originalFilename: 'resume.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
    })

    await OfferLetter.create({
      application: application1._id,
      document: {
        cloudinaryPublicId: 'doc1',
        cloudinarySecureUrl: 'https://example.com/doc1.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-01-14T10:00:00Z'),
      status: 'pending',
      issuedBy: admin._id,
    })

    await OfferLetter.create({
      application: application2._id,
      document: {
        cloudinaryPublicId: 'doc2',
        cloudinarySecureUrl: 'https://example.com/doc2.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-01-14T10:00:00Z'),
      status: 'pending',
      issuedBy: admin._id,
    })

    const result = await runOfferExpiryJob()

    expect(result.offersChecked).toBe(2)
    expect(result.offersExpired).toBe(2)
    expect(result.notificationsSent).toBe(2)

    const offers = await OfferLetter.find({ status: 'expired' }).lean()
    expect(offers).toHaveLength(2)

    const notifications1 = await Notification.find({ user: user1._id }).lean()
    const notifications2 = await Notification.find({ user: user2._id }).lean()
    expect(notifications1).toHaveLength(1)
    expect(notifications2).toHaveLength(1)
  })

  it('should send notification with offer link', async () => {
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
      status: 'completed',
    })

    const admin = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hash',
      role: 'tpo',
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
    const application = await Application.create({
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
    })

    const offer = await OfferLetter.create({
      application: application._id,
      document: {
        cloudinaryPublicId: 'doc1',
        cloudinarySecureUrl: 'https://example.com/doc1.pdf',
        originalFilename: 'offer.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      },
      responseDeadline: new Date('2026-01-14T10:00:00Z'),
      status: 'pending',
      issuedBy: admin._id,
    })

    await runOfferExpiryJob()

    const notifications = await Notification.find({ user: user._id }).lean()
    expect(notifications[0].link).toBe(`/offers/${offer._id}/respond`)
  })
})
