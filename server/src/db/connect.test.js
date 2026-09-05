import { describe, it, expect, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { connectDB } from './connect.js'

describe('connectDB (fail-fast)', () => {
  afterAll(async () => {
    // Ensure no lingering connection state leaks between test files.
    await mongoose.disconnect()
  })

  it('rejects with an error when given a malformed connection URI', async () => {
    await expect(connectDB('not-a-valid-uri')).rejects.toThrow()
  })
})
