// Seed script to create a User directly. Used to verify the User model works
// end-to-end: password is hashed on save, never stored or returned in plaintext.
// Run with: node src/scripts/seed-user.js
import { loadEnv } from '../config/env.js'
import { connectDB } from '../db/connect.js'
import User from '../models/User.model.js'

async function run() {
  let env
  try {
    env = loadEnv()
  } catch (err) {
    console.error(`[fatal] ${err.message}`)
    process.exit(1)
  }

  try {
    await connectDB(env.MONGODB_URI)
    console.log('[db] connected to MongoDB')
  } catch (err) {
    console.error('[fatal] could not connect to MongoDB:', err.message)
    process.exit(1)
  }

  const testEmail = 'seed-test@example.com'
  const testPassword = 'StrongPass123!'

  // Clean up any existing test user
  await User.deleteOne({ email: testEmail })

  // Create a new user with plaintext password (via virtual)
  const user = new User({
    email: testEmail,
    password: testPassword, // Virtual setter triggers pre-save hash
    role: 'student',
    active: true,
  })

  await user.save()
  console.log('[seed] User created:', user.email)
  console.log('[seed] User object (toJSON):', user.toJSON())
  console.log('[seed] passwordHash present on document:', 'passwordHash' in user.toObject())

  // Verify password comparison works
  const match = await user.comparePassword(testPassword)
  console.log('[seed] Password compare (correct):', match)

  const mismatch = await user.comparePassword('WrongPass')
  console.log('[seed] Password compare (incorrect):', mismatch)

  // Verify passwordHash is NOT in the JSON output
  const json = user.toJSON()
  console.log('[seed] passwordHash in toJSON output:', 'passwordHash' in json)

  // Fetch from DB to verify stored hash exists but isn't returned by default
  const fetched = await User.findById(user._id).select('+passwordHash')
  console.log('[seed] Fetched user has passwordHash:', !!fetched.passwordHash)
  console.log(
    '[seed] Fetched passwordHash is bcrypt hash:',
    fetched.passwordHash.startsWith('$2b$')
  )

  await User.deleteOne({ email: testEmail })
  console.log('[seed] Test user cleaned up')

  await mongoose.connection.close()
  console.log('[seed] Done')
}

import mongoose from 'mongoose'
run().catch((err) => {
  console.error('[seed] Fatal error:', err)
  process.exit(1)
})
