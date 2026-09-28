// Registration deadline approaching reminder job.
// Finds published+ drives with registration deadlines within the configured
// advance window and notifies eligible students who haven't applied yet.
// Traces to FR-NOT-01, NFR-REL-01.
import Drive from '../models/Drive.model.js'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Notification from '../models/Notification.model.js'
import SeasonConfig from '../models/SeasonConfig.model.js'
import { createNotifications } from '../services/notification.service.js'
import { loadEnv } from '../config/env.js'
import { checkEligibility, applyBusinessRules } from '../services/eligibility.service.js'

const REMINDER_TYPE = 'deadline_approaching'

function getJobConfig() {
  return loadEnv()
}

function getActiveSeasonConfig() {
  return SeasonConfig.findOne({ isActive: true }).lean()
}

function getWindowBounds(advanceHours) {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + advanceHours * 60 * 60 * 1000)
  return { now, windowEnd }
}

function formatDateForMessage(date) {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

async function getEligibleStudentsForDrive(drive, seasonConfig) {
  const students = await StudentProfile.find({
    branch: { $in: drive.eligibilityCriteria.branches },
    batch: { $in: drive.eligibilityCriteria.batches },
    placementStatus: 'not_placed',
    isBlacklisted: false,
  }).lean()

  const eligibleStudents = []
  for (const student of students) {
    const rawEligibility = checkEligibility(student, drive)
    const eligibility = applyBusinessRules(rawEligibility, student, drive, seasonConfig)
    if (eligibility.eligible) {
      eligibleStudents.push(student)
    }
  }
  return eligibleStudents
}

async function getAppliedStudentIds(driveId) {
  const applications = await Application.find({ drive: driveId }).select('student').lean()
  return new Set(applications.map((a) => a.student.toString()))
}

async function getExistingNotifications(driveId, studentIds) {
  const driveIdStr = driveId.toString()

  // Get user IDs for these students
  const studentProfiles = await StudentProfile.find({
    _id: { $in: studentIds },
  })
    .select('user')
    .lean()

  const userIdToStudentId = new Map()
  studentProfiles.forEach((sp) => {
    userIdToStudentId.set(sp.user.toString(), sp._id.toString())
  })

  const userIds = [...userIdToStudentId.keys()]

  // Find existing notifications for these users with this drive link
  const notifications = await Notification.find({
    user: { $in: userIds },
    type: REMINDER_TYPE,
    link: { $regex: driveIdStr },
  }).lean()

  // Convert back to student IDs
  const notifiedStudentIds = notifications
    .map((n) => userIdToStudentId.get(n.user.toString()))
    .filter((id) => id !== undefined)

  return new Set(notifiedStudentIds)
}

export async function runRegistrationDeadlineJob() {
  const { REMINDER_ADVANCE_HOURS } = getJobConfig()
  const { now, windowEnd } = getWindowBounds(REMINDER_ADVANCE_HOURS)

  console.log(
    `[RegistrationDeadlineJob] Checking drives with deadline between ${now.toISOString()} and ${windowEnd.toISOString()}`
  )

  const drives = await Drive.find({
    status: { $in: ['published', 'registration_open'] },
    registrationDeadline: { $gte: now, $lte: windowEnd },
  })
    .populate('company', 'name')
    .lean()

  if (!drives.length) {
    console.log('[RegistrationDeadlineJob] No drives with approaching deadlines found')
    return { drivesChecked: 0, notificationsSent: 0, skipped: 0 }
  }

  const seasonConfig = await getActiveSeasonConfig()
  let totalNotificationsSent = 0
  let totalSkipped = 0

  for (const drive of drives) {
    const eligibleStudents = await getEligibleStudentsForDrive(drive, seasonConfig)
    if (!eligibleStudents.length) continue

    const appliedStudentIds = await getAppliedStudentIds(drive._id)
    const unappliedStudents = eligibleStudents.filter(
      (s) => !appliedStudentIds.has(s._id.toString())
    )

    if (!unappliedStudents.length) continue

    const studentIds = unappliedStudents.map((s) => s._id)
    const alreadyNotifiedIds = await getExistingNotifications(drive._id, studentIds)
    const toNotify = unappliedStudents.filter((s) => !alreadyNotifiedIds.has(s._id.toString()))

    if (!toNotify.length) {
      totalSkipped += unappliedStudents.length
      continue
    }

    const userIds = await StudentProfile.find({
      _id: { $in: toNotify.map((s) => s._id) },
    })
      .select('user')
      .lean()

    const userIdMap = new Map(userIds.map((u) => [u._id.toString(), u.user.toString()]))

    const notifications = toNotify
      .map((student) => {
        const userId = userIdMap.get(student._id.toString())
        const daysRemaining = Math.ceil((drive.registrationDeadline - now) / (1000 * 60 * 60 * 24))
        return {
          user: userId,
          type: REMINDER_TYPE,
          message: `Registration deadline for "${drive.title}" at ${drive.company?.name ?? 'Company'} is approaching (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining). Deadline: ${formatDateForMessage(drive.registrationDeadline)}`,
          link: `/drives/${drive._id}`,
        }
      })
      .filter((n) => n.user)

    if (notifications.length) {
      const result = await createNotifications(notifications)
      totalNotificationsSent += result.insertedCount
    }
  }

  return {
    drivesChecked: drives.length,
    notificationsSent: totalNotificationsSent,
    skipped: totalSkipped,
  }
}

export default { runRegistrationDeadlineJob }
