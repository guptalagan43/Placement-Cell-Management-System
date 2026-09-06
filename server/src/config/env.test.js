import { describe, it, expect } from 'vitest'
import { parseEnv } from './env.js'

const VALID_BASE = {
  MONGODB_URI: 'mongodb://localhost:27017/pcms',
  JWT_ACCESS_SECRET: 'test-access-secret-key-32-chars-min',
  JWT_REFRESH_SECRET: 'test-refresh-secret-key-32-chars-min',
}

describe('parseEnv', () => {
  it('throws a clear error when MONGODB_URI is missing', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/)
  })

  it('throws a clear error when JWT secrets are missing', () => {
    expect(() => parseEnv({ MONGODB_URI: 'mongodb://localhost:27017/pcms' })).toThrow(
      /JWT_ACCESS_SECRET/
    )
  })

  it('applies defaults for NODE_ENV and PORT', () => {
    const env = parseEnv(VALID_BASE)
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(5000)
  })

  it('coerces PORT from a string to a number', () => {
    const env = parseEnv({ ...VALID_BASE, PORT: '4100' })
    expect(env.PORT).toBe(4100)
  })

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => parseEnv({ ...VALID_BASE, NODE_ENV: 'staging' })).toThrow()
  })

  it('rejects JWT secrets shorter than 32 chars', () => {
    expect(() => parseEnv({ ...VALID_BASE, JWT_ACCESS_SECRET: 'short' })).toThrow(/32 chars/)
  })
})
