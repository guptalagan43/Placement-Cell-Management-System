// Student bulk import service. Parses CSV, validates rows, creates User + StudentProfile,
// sends activation emails. Returns per-row results for reporting.
import { parse } from 'csv-parse/sync'
import User from '../models/User.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import { ROLES } from '../constants/roles.js'
import { DEPARTMENTS } from '../constants/departments.js'

const REQUIRED_FIELDS = ['rollNumber', 'name', 'email', 'branch', 'batch']

// Generate a secure random password for initial account setup
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Validate a single CSV row
function validateRow(row, _rowNum) {
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Invalid email format')
  }

  if (row.branch && !DEPARTMENTS.includes(row.branch.trim())) {
    errors.push(`Invalid branch: ${row.branch}. Must be one of: ${DEPARTMENTS.join(', ')}`)
  }

  if (row.batch) {
    const batchNum = Number(row.batch)
    if (isNaN(batchNum) || batchNum < 2000 || batchNum > 2100) {
      errors.push('Batch must be a valid year between 2000 and 2100')
    }
  }

  if (row.section && typeof row.section !== 'string') {
    errors.push('Section must be a string')
  }

  return { isValid: errors.length === 0, errors }
}

// Check if email sending is configured (not in test environment without SMTP)
function isEmailConfigured() {
  return (
    process.env.NODE_ENV === 'production' ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  )
}

// Process a single valid row: create User and StudentProfile
async function processRow(row, rowNum, frontendBaseUrl) {
  const rollNumber = row.rollNumber.trim().toUpperCase()
  const name = row.name.trim()
  const email = row.email.trim().toLowerCase()
  const branch = row.branch.trim()
  const batch = Number(row.batch)
  const section = row.section ? row.section.trim().toUpperCase() : ''

  // Check for existing user/roll number
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new Error(`Email already exists: ${email}`)
  }

  const existingProfile = await StudentProfile.findOne({ rollNumber })
  if (existingProfile) {
    throw new Error(`Roll number already exists: ${rollNumber}`)
  }

  // Generate temporary password (student will set their own on activation)
  const tempPassword = generateTempPassword()

  // Create User with mustResetPassword = true
  const user = new User({
    email,
    password: tempPassword, // virtual setter hashes it
    role: ROLES.STUDENT,
    active: true,
    mustResetPassword: true,
  })
  await user.save()

  // Create StudentProfile
  const profile = new StudentProfile({
    user: user._id,
    rollNumber,
    branch,
    batch,
    section,
  })
  await profile.save()

  // Send activation email only if configured
  if (isEmailConfigured()) {
    try {
      await sendActivationEmail(email, tempPassword, frontendBaseUrl)
    } catch (emailErr) {
      // Log but don't fail the import - email can be resent later
      console.warn(`[import] Failed to send activation email to ${email}:`, emailErr.message)
    }
  }

  return {
    row: rowNum,
    rollNumber,
    email,
    name,
    status: 'success',
    message:
      'Account created' +
      (isEmailConfigured() ? ', activation email sent' : ' (email not configured)'),
  }
}

// Main import function
export async function bulkImportStudents(csvBuffer, frontendBaseUrl) {
  // Parse CSV
  let records
  try {
    records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })
  } catch (parseErr) {
    const error = new Error(`CSV parse error: ${parseErr.message}`)
    error.cause = parseErr
    throw error
  }

  // Handle empty CSV gracefully - return empty results instead of throwing
  if (!records || records.length === 0) {
    return {
      summary: { total: 0, succeeded: 0, failed: 0 },
      results: [],
    }
  }

  const results = []
  const summary = { total: records.length, succeeded: 0, failed: 0 }

  // Process each row
  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 1
    const row = records[i]

    // Validate row
    const validation = validateRow(row, rowNum)
    if (!validation.isValid) {
      results.push({
        row: rowNum,
        rollNumber: row.rollNumber ?? 'N/A',
        email: row.email ?? 'N/A',
        name: row.name ?? 'N/A',
        status: 'error',
        message: validation.errors.join('; '),
      })
      summary.failed++
      continue
    }

    // Process valid row
    try {
      const result = await processRow(row, rowNum, frontendBaseUrl)
      results.push(result)
      summary.succeeded++
    } catch (err) {
      results.push({
        row: rowNum,
        rollNumber: row.rollNumber ?? 'N/A',
        email: row.email ?? 'N/A',
        name: row.name ?? 'N/A',
        status: 'error',
        message: err.message,
      })
      summary.failed++
    }
  }

  return { summary, results }
}

// Send activation email (reuses auth service pattern)
async function sendActivationEmail(email, tempPassword, frontendBaseUrl) {
  const { getEmailTransporter } = await import('./auth.service.js')
  const transporter = getEmailTransporter()
  const activationUrl = `${frontendBaseUrl}/activate`

  const mailOptions = {
    from: process.env.SMTP_FROM ?? '"PCMS" <noreply@pcms.skit.ac.in>',
    to: email,
    subject: 'Activate your PCMS account',
    html: `
      <p>Your PCMS account has been created by the T&P Cell.</p>
      <p><strong>Temporary password:</strong> ${tempPassword}</p>
      <p>Please activate your account by setting a new password:</p>
      <p><a href="${activationUrl}">${activationUrl}</a></p>
      <p>This temporary password is valid for one-time use only.</p>
    `,
    text: `Your PCMS account has been created.\n\nTemporary password: ${tempPassword}\n\nActivate your account: ${activationUrl}\n\nThis temporary password is valid for one-time use only.`,
  }

  await transporter.sendMail(mailOptions)
}

export default { bulkImportStudents }
