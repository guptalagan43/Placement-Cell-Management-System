// Seed script: creates test users for all three roles
// Run with: node seed.mjs
import { readFileSync } from 'fs'
import mongoose from 'mongoose'

// Load .env manually
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#') || !line.includes('=')) continue
  const i = line.indexOf('=')
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')
}

await mongoose.connect(process.env.MONGODB_URI)
console.log('Connected to MongoDB:', process.env.MONGODB_URI)

const User = (await import('./src/models/User.model.js')).default

// Clear existing users
await User.deleteMany({})
console.log('Cleared existing users\n')

// ── Admin / TPO ──────────────────────────────────────────────────────────────
const admin = new User({
  email: 'admin@skit.ac.in',
  role: 'tpo',
  active: true,
  mustResetPassword: false,
})
admin.password = 'Admin@1234'
await admin.save()
console.log('✅ TPO/Admin  :', admin.email, '| password: Admin@1234')

// ── Coordinator ──────────────────────────────────────────────────────────────
const coord = new User({
  email: 'coordinator@skit.ac.in',
  role: 'coordinator',
  department: 'Computer Science & Engineering',
  active: true,
  mustResetPassword: false,
})
coord.password = 'Coord@1234'
await coord.save()
console.log('✅ Coordinator:', coord.email, '| password: Coord@1234')

// ── Student — NEEDS ACTIVATION ───────────────────────────────────────────────
const student = new User({
  email: 'b241218@skit.ac.in',
  role: 'student',
  active: true,
  mustResetPassword: true,    // ← triggers the activation flow
})
student.password = 'placeholder-will-be-overwritten-on-activation'
await student.save()
console.log('✅ Student     :', student.email, '| mustResetPassword: true → go to /activate')

await mongoose.disconnect()

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Test accounts ready. How to test each flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 🔐 SIGN IN (tpo/coordinator — already active):
    URL  : http://localhost:5173/login
    Email: admin@skit.ac.in  |  Password: Admin@1234
    → OTP will be sent to lagangupta042006@gmail.com
    → Or watch server terminal for [DEV] OTP log

 🆕 ACTIVATE ACCOUNT (student — first time):
    URL  : http://localhost:5173/activate
    Email: b241218@skit.ac.in
    → Temp password sent to lagangupta042006@gmail.com
    → Or watch server terminal for [DEV] temp password log

 🔑 FORGOT PASSWORD:
    URL  : http://localhost:5173/forgot-password
    Email: admin@skit.ac.in
    → OTP sent + visible in server terminal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
