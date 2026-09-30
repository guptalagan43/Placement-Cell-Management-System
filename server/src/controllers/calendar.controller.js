// Calendar controller: Handles student calendar routes with validation.
// Traces to FR-SCH-03, FR-SCH-04.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import StudentProfile from '../models/StudentProfile.model.js'
import * as calendarSvc from '../services/calendar.service.js'

// Validation schema for calendar query params
const calendarQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
})

// GET /students/me/calendar - Get aggregated calendar for authenticated student
export const getMyCalendar = [
  asyncHandler(async (req, res) => {
    const { query } = calendarQuerySchema.parse({ query: req.query })

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.user._id }).lean()
    if (!studentProfile) {
      throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
    }

    let events
    if (query.startDate && query.endDate) {
      events = await calendarSvc.getStudentCalendarInRange(
        studentProfile._id.toString(),
        new Date(query.startDate),
        new Date(query.endDate)
      )
    } else {
      events = await calendarSvc.getStudentCalendar(studentProfile._id.toString())
    }

    res.json({ success: true, events })
  }),
]

export default {
  getMyCalendar,
}
