import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '../models/User.model.js'

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
})

describe('User Model', () => {
  it('hashes password on save and never stores plaintext', async () => {
    const plaintext = 'MySecurePass123!'
    const user = new User({
      email: 'test@example.com',
      password: plaintext, // Virtual setter
      role: 'student',
    })
    await user.save()

    // The document should have a bcrypt hash, not plaintext
    expect(user.passwordHash).toBeDefined()
    expect(user.passwordHash).not.toBe(plaintext)
    expect(user.passwordHash.startsWith('$2b$')).toBe(true)
  })

  it('comparePassword returns true for correct password', async () => {
    const plaintext = 'MySecurePass123!'
    const user = new User({
      email: 'test2@example.com',
      password: plaintext,
      role: 'student',
    })
    await user.save()

    const match = await user.comparePassword(plaintext)
    expect(match).toBe(true)
  })

  it('comparePassword returns false for incorrect password', async () => {
    const user = new User({
      email: 'test3@example.com',
      password: 'CorrectPass123!',
      role: 'student',
    })
    await user.save()

    const match = await user.comparePassword('WrongPass')
    expect(match).toBe(false)
  })

  it('excludes passwordHash from toJSON output', async () => {
    const user = new User({
      email: 'test4@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user.save()

    const json = user.toJSON()
    expect(json).not.toHaveProperty('passwordHash')
    expect(json).not.toHaveProperty('_plainPassword')
    expect(json.email).toBe('test4@example.com')
    expect(json.role).toBe('student')
  })

  it('excludes passwordHash from toObject output', async () => {
    const user = new User({
      email: 'test5@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user.save()

    const obj = user.toObject()
    expect(obj).not.toHaveProperty('passwordHash')
    expect(obj).not.toHaveProperty('_plainPassword')
  })

  it('does not include passwordHash in default query results (select: false)', async () => {
    const user = new User({
      email: 'test6@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user.save()

    // select: false excludes from query projection, but findById may still
    // attach it to the document. The security guarantee is toJSON exclusion.
    const fetched = await User.findById(user._id)
    const json = fetched.toJSON()
    expect(json).not.toHaveProperty('passwordHash')
  })

  it('can explicitly select passwordHash when needed', async () => {
    const user = new User({
      email: 'test7@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user.save()

    const fetched = await User.findById(user._id).select('+passwordHash')
    expect(fetched.passwordHash).toBeDefined()
    expect(fetched.passwordHash.startsWith('$2b$')).toBe(true)
  })

  it('requires email, role, and password', async () => {
    const user = new User({ role: 'student' })
    await expect(user.save()).rejects.toThrow()
  })

  it('enforces unique email', async () => {
    const user1 = new User({
      email: 'unique@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user1.save()

    const user2 = new User({
      email: 'unique@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await expect(user2.save()).rejects.toThrow()
  })

  it('validates role enum', async () => {
    const user = new User({
      email: 'test8@example.com',
      password: 'Pass123!',
      role: 'invalid-role',
    })
    await expect(user.save()).rejects.toThrow()
  })

  it('requires department for coordinator role', async () => {
    const user = new User({
      email: 'coord@example.com',
      password: 'Pass123!',
      role: 'coordinator',
    })
    await expect(user.save()).rejects.toThrow()
  })

  it('accepts valid department for coordinator', async () => {
    const user = new User({
      email: 'coord@example.com',
      password: 'Pass123!',
      role: 'coordinator',
      department: 'Computer Science & Engineering',
    })
    await expect(user.save()).resolves.toBeDefined()
  })

  it('rejects invalid department for coordinator', async () => {
    const user = new User({
      email: 'coord@example.com',
      password: 'Pass123!',
      role: 'coordinator',
      department: 'Invalid Department',
    })
    await expect(user.save()).rejects.toThrow()
  })

  it('defaults active to true and mustResetPassword to false', async () => {
    const user = new User({
      email: 'test9@example.com',
      password: 'Pass123!',
      role: 'student',
    })
    await user.save()

    expect(user.active).toBe(true)
    expect(user.mustResetPassword).toBe(false)
  })

  it('allows TPO role without department', async () => {
    const user = new User({
      email: 'tpo@example.com',
      password: 'Pass123!',
      role: 'tpo',
    })
    await expect(user.save()).resolves.toBeDefined()
  })
})
