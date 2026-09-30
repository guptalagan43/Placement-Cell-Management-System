// Calendar service: Aggregates Rounds + InfoSessions for a student's applications with conflict detection.
// Traces to FR-SCH-03, FR-SCH-04.
import Application from '../models/Application.model.js'
import Round from '../models/Round.model.js'
import InfoSession from '../models/InfoSession.model.js'

// Duration of a round/info session in minutes (default 90 minutes if not specified)
const DEFAULT_EVENT_DURATION_MINUTES = 90

/**
 * Checks if two time ranges overlap
 * @param {Date} start1 - Start of first event
 * @param {Date} end1 - End of first event
 * @param {Date} start2 - Start of second event
 * @param {Date} end2 - End of second event
 * @returns {boolean} True if events overlap
 */
function isOverlapping(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1
}

/**
 * Calculates end time for an event based on default duration
 * @param {Date} startTime - Start time of the event
 * @param {number} [durationMinutes] - Optional duration in minutes
 * @returns {Date} End time
 */
function calculateEndTime(startTime, durationMinutes = DEFAULT_EVENT_DURATION_MINUTES) {
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000)
}

/**
 * Normalizes a round or info session into a calendar event
 * @param {Object} event - Round or InfoSession document
 * @param {string} type - 'round' or 'info_session'
 * @param {Object} drive - Drive document
 * @returns {Object} Normalized calendar event
 */
function normalizeEvent(event, type, drive) {
  const startTime = new Date(event.dateTime)
  const endTime = calculateEndTime(startTime)

  return {
    id: event._id.toString(),
    type,
    driveId: drive._id.toString(),
    driveTitle: drive.title,
    company: drive.company?.name ?? 'Unknown Company',
    title: type === 'round' ? `Round ${event.roundNumber}: ${event.name}` : `PPT: ${event.title}`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    mode: event.mode,
    venue: event.venue ?? '',
    meetingLink: event.meetingLink ?? '',
    instructions: event.instructions ?? '',
    mandatory: event.mandatory ?? false,
    roundNumber: type === 'round' ? event.roundNumber : null,
    status: type === 'round' ? 'scheduled' : 'scheduled',
    isConflict: false, // Will be set by conflict detection
  }
}

/**
 * Detects conflicts among a list of calendar events
 * @param {Array} events - Array of normalized calendar events
 * @returns {Array} Events with isConflict flag set
 */
function detectConflicts(events) {
  // Sort by start time
  const sortedEvents = [...events].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  // Compare each pair of events for overlap
  for (let i = 0; i < sortedEvents.length; i++) {
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const event1 = sortedEvents[i]
      const event2 = sortedEvents[j]

      const start1 = new Date(event1.startTime)
      const end1 = new Date(event1.endTime)
      const start2 = new Date(event2.startTime)
      const end2 = new Date(event2.endTime)

      // If event1 ends before event2 starts, no more conflicts for event1 (since sorted)
      if (end1 <= start2) {
        break
      }

      // Check for overlap
      if (isOverlapping(start1, end1, start2, end2)) {
        event1.isConflict = true
        event2.isConflict = true
      }
    }
  }

  // Return events in original order but with conflict flags
  const eventMap = new Map(sortedEvents.map((e) => [e.id, e.isConflict]))
  return events.map((e) => ({ ...e, isConflict: eventMap.get(e.id) ?? false }))
}

/**
 * Gets aggregated calendar for a student
 * @param {string} studentId - StudentProfile ObjectId
 * @returns {Promise<Array>} Array of calendar events with conflict flags
 */
export async function getStudentCalendar(studentId) {
  // Find all applications for this student (excluding withdrawn)
  const applications = await Application.find({
    student: studentId,
    overallStatus: { $ne: 'withdrawn' },
  })
    .populate({
      path: 'drive',
      select: 'title company status',
      populate: { path: 'company', select: 'name' },
    })
    .lean()

  if (!applications.length) {
    return []
  }

  // Collect all drive IDs
  const driveIds = [...new Set(applications.map((app) => app.drive._id.toString()))]

  // Fetch all rounds for these drives
  const rounds = await Round.find({ drive: { $in: driveIds } })
    .populate({
      path: 'drive',
      select: 'title company',
      populate: { path: 'company', select: 'name' },
    })
    .lean()

  // Fetch all info sessions for these drives
  const infoSessions = await InfoSession.find({ drive: { $in: driveIds } })
    .populate({
      path: 'drive',
      select: 'title company',
      populate: { path: 'company', select: 'name' },
    })
    .lean()

  // Normalize all events
  const roundEvents = rounds.map((round) => normalizeEvent(round, 'round', round.drive))
  const infoSessionEvents = infoSessions.map((session) =>
    normalizeEvent(session, 'info_session', session.drive)
  )

  const allEvents = [...roundEvents, ...infoSessionEvents]

  // Detect conflicts
  const eventsWithConflicts = detectConflicts(allEvents)

  // Sort by start time
  return eventsWithConflicts.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
}

/**
 * Gets calendar events for a specific date range
 * @param {string} studentId - StudentProfile ObjectId
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Promise<Array>} Filtered calendar events
 */
export async function getStudentCalendarInRange(studentId, startDate, endDate) {
  const allEvents = await getStudentCalendar(studentId)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return allEvents.filter((event) => {
    const eventStart = new Date(event.startTime)
    return eventStart >= start && eventStart <= end
  })
}

export default {
  getStudentCalendar,
  getStudentCalendarInRange,
  detectConflicts,
  normalizeEvent,
}
