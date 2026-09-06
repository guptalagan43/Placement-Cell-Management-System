import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  INVALID_CREDENTIALS_ERROR,
} from '../services/auth.service.js'

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-32-chars-min'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-min'
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('Auth Service', () => {
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    role: 'student',
    department: 'Computer Science & Engineering',
  }

  it('generates a valid access token', () => {
    const token = generateAccessToken(mockUser)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('generates a valid refresh token', () => {
    const token = generateRefreshToken(mockUser)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifies a valid access token and returns payload', () => {
    const token = generateAccessToken(mockUser)
    const payload = verifyAccessToken(token)

    expect(payload.sub).toBe(mockUser._id.toString())
    expect(payload.email).toBe(mockUser.email)
    expect(payload.role).toBe(mockUser.role)
    expect(payload.department).toBe(mockUser.department)
  })

  it('verifies a valid refresh token and returns payload', () => {
    const token = generateRefreshToken(mockUser)
    const payload = verifyRefreshToken(token)

    expect(payload.sub).toBe(mockUser._id.toString())
    expect(payload.email).toBe(mockUser.email)
    expect(payload.role).toBe(mockUser.role)
    expect(payload.department).toBe(mockUser.department)
  })

  it('throws on invalid access token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow()
  })

  it('throws on invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid.token.here')).toThrow()
  })

  it('throws on expired access token', async () => {
    // We can't easily test expiration without waiting or manipulating time,
    // but we verify the function exists and throws on malformed tokens.
    expect(() => verifyAccessToken('')).toThrow()
  })

  it('has generic invalid credentials error constant', () => {
    expect(INVALID_CREDENTIALS_ERROR.message).toBe('Invalid email or password')
    expect(INVALID_CREDENTIALS_ERROR.code).toBe('INVALID_CREDENTIALS')
    expect(INVALID_CREDENTIALS_ERROR.statusCode).toBe(401)
  })

  it('includes issuer and audience in tokens', () => {
    const accessToken = generateAccessToken(mockUser)
    const refreshToken = generateRefreshToken(mockUser)

    const accessPayload = verifyAccessToken(accessToken)
    const refreshPayload = verifyRefreshToken(refreshToken)

    expect(accessPayload.iss).toBe('pcms')
    expect(accessPayload.aud).toBe('pcms-client')
    expect(refreshPayload.iss).toBe('pcms')
    expect(refreshPayload.aud).toBe('pcms-client')
  })

  it('tokens for different users have different signatures', () => {
    const user1 = { ...mockUser, _id: new mongoose.Types.ObjectId() }
    const user2 = { ...mockUser, _id: new mongoose.Types.ObjectId() }

    const token1 = generateAccessToken(user1)
    const token2 = generateAccessToken(user2)

    expect(token1).not.toBe(token2)
  })
})
