// Round approaching reminder job.
// Finds upcoming rounds (within configured advance window) and notifies
// shortlisted/cleared applicants for those rounds.
// Traces to FR-NOT-01, FR-SCH-03, NFR-REL-01.
import Round from '../models/Round.model.js'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Notification from '../models/Notification.model.js'
import { createNotifications } from '../services/notification.service.js'
import { loadEnv } from '../config/env.js'

const REMINDER_TYPE = 'deadline_approaching'
const RELEVANT_STATUSES = ['shortlisted', 'cleared']

function getJobConfig() {
  return loadEnv()
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

async function getApplicationsForRound(roundId) {
  const applications = await Application.find({
    'roundStatuses.round': roundId,
    'roundStatuses.status': { $in: RELEVANT_STATUSES },
  })
    .populate('student', 'user')
    .populate('drive', 'title company')
    .lean()

  return applications
}

async function getExistingRoundNotifications(roundId, studentIds) {
  const roundIdStr = roundId.toString()

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

  // Find existing notifications for these users with this round link
  const notifications = await Notification.find({
    user: { $in: userIds },
    type: REMINDER_TYPE,
    link: { $regex: roundIdStr },
  }).lean()

  // Convert back to student IDs
  const notifiedStudentIds = notifications
    .map((n) => userIdToStudentId.get(n.user.toString()))
    .filter((id) => id !== undefined)

  return new Set(notifiedStudentIds)
}

export async function runRoundApproachingJob() {
  const { REMINDER_ADVANCE_HOURS } = getJobConfig()
  const { now, windowEnd } = getWindowBounds(REMINDER_ADVANCE_HOURS)

  console.log(
    `[RoundApproachingJob] Checking rounds between ${now.toISOString()} and ${windowEnd.toISOString()}`
  )

  const rounds = await Round.find({
    dateTime: { $gte: now, $lte: windowEnd },
  })
    .populate({
      path: 'drive',
      select: 'title company',
      populate: { path: 'company', select: 'name' },
    })
    .lean()

  if (!rounds.length) {
    console.log('[RoundApproachingJob] No upcoming rounds found')
    return { roundsChecked: 0, notificationsSent: 0, skipped: 0 }
  }

  let totalNotificationsSent = 0
  let totalSkipped = 0

  for (const round of rounds) {
    const applications = await getApplicationsForRound(round._id)
    if (!applications.length) continue

    const studentIds = applications.map((a) => a.student._id)
    const alreadyNotifiedIds = await getExistingRoundNotifications(round._id, studentIds)
    const toNotify = applications.filter((a) => !alreadyNotifiedIds.has(a.student._id.toString()))

    if (!toNotify.length) {
      totalSkipped += applications.length
      continue
    }

    const drive = round.drive
    const hoursRemaining = Math.ceil((round.dateTime - now) / (1000 * 60 * 60))

    const notifications = toNotify.map((app) => ({
      user: app.student.user,
      type: REMINDER_TYPE,
      message: `Upcoming round "${round.name}" for "${drive.title}" at ${drive.company?.name ?? 'Company'} in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}. Scheduled: ${formatDateForMessage(round.dateTime)} (${round.mode}${round.venue ? `, ${round.venue}` : ''}${round.meetingLink ? `, ${round.meetingLink}` : ''})`,
      link: `/applications/my?round=${round._id}`,
    }))

    if (notifications.length) {
      const result = await createNotifications(notifications)
      totalNotificationsSent += result.insertedCount
    }
  }

  return {
    roundsChecked: rounds.length,
    notificationsSent: totalNotificationsSent,
    skipped: totalSkipped,
  }
}

export default { runRoundApproachingJob }
