import { describe, it, expect } from 'vitest'
import { parseEnv } from './env.js'

describe('parseEnv', () => {
  it('throws a clear error when MONGODB_URI is missing', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/)
  })

  it('applies defaults for NODE_ENV and PORT', () => {
    const env = parseEnv({ MONGODB_URI: 'mongodb://localhost:27017/pcms' })
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(5000)
  })

  it('coerces PORT from a string to a number', () => {
    const env = parseEnv({ MONGODB_URI: 'mongodb://localhost:27017/pcms', PORT: '4100' })
    expect(env.PORT).toBe(4100)
  })

  it('rejects an unknown NODE_ENV value', () => {
    expect(() =>
      parseEnv({ MONGODB_URI: 'mongodb://localhost:27017/pcms', NODE_ENV: 'staging' })
    ).toThrow()
  })
})
