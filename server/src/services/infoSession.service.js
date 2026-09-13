// InfoSession service: CRUD operations for info sessions with department scoping enforcement.
// Handles create, read, update, delete with RBAC enforcement and department scoping.
// Traces to FR-SCH-02.
import mongoose from 'mongoose'
import InfoSession from '../models/InfoSession.model.js'
import Drive from '../models/Drive.model.js'
import { ApiError } from '../utils/api-error.js'
import { ROLES } from '../constants/roles.js'

// Valid modes for an info session
const VALID_MODES = ['online', 'offline']

// Create a new info session for a drive (coordinator/TPO)
export async function createInfoSession(driveId, data, user) {
  // Verify drive exists and user has access
  await getDriveAndValidateAccess(driveId, user)

  const { title, dateTime, mode, venue, meetingLink, mandatory, description } = data

  // Validate mode
  if (!VALID_MODES.includes(mode)) {
    throw new ApiError(400, 'Invalid mode. Must be "online" or "offline"', 'VALIDATION_ERROR')
  }

  // Validate venue/meetingLink based on mode
  if (mode === 'offline' && !venue.trim()) {
    throw new ApiError(400, 'Venue is required for offline info sessions', 'VALIDATION_ERROR')
  }
  if (mode === 'online' && !meetingLink.trim()) {
    throw new ApiError(400, 'Meeting link is required for online info sessions', 'VALIDATION_ERROR')
  }

  try {
    const infoSession = await InfoSession.create({
      drive: driveId,
      title,
      dateTime: new Date(dateTime),
      mode,
      venue: venue || '',
      meetingLink: meetingLink || '',
      mandatory: Boolean(mandatory),
      description: description || '',
    })
    return infoSession.toObject({ virtuals: true })
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(
        400,
        'Info session creation failed due to duplicate constraint',
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

// Get all info sessions for a drive with pagination and sorting (coordinator/TPO)
export async function getInfoSessions(driveId, queryParams, user) {
  // Verify drive exists and user has access
  await getDriveAndValidateAccess(driveId, user)

  const { page = 1, limit = 20, sortBy = 'dateTime', sortOrder = 'asc' } = queryParams

  const filter = { drive: driveId }

  // Sorting - default to dateTime ascending
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [infoSessions, total] = await Promise.all([
    InfoSession.find(filter).sort(sort).skip(skip).limit(limitNum).lean({ virtuals: true }),
    InfoSession.countDocuments(filter),
  ])

  return {
    infoSessions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single info session by ID (coordinator/TPO with department scoping)
export async function getInfoSessionById(infoSessionId, user) {
  const infoSession = await InfoSession.findById(infoSessionId).lean({ virtuals: true })
  if (!infoSession) {
    throw new ApiError(404, 'Info session not found', 'INFO_SESSION_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(infoSession.drive, user)

  return infoSession
}

// Update info session by ID (coordinator/TPO with department scoping)
export async function updateInfoSession(infoSessionId, updateData, user) {
  const infoSession = await InfoSession.findById(infoSessionId).lean()
  if (!infoSession) {
    throw new ApiError(404, 'Info session not found', 'INFO_SESSION_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(infoSession.drive, user)

  const { title, dateTime, mode, venue, meetingLink, mandatory, description } = updateData

  const updateFields = {}

  if (title !== undefined) {
    updateFields.title = title
  }
  if (dateTime !== undefined) {
    updateFields.dateTime = new Date(dateTime)
  }
  if (mode !== undefined) {
    if (!VALID_MODES.includes(mode)) {
      throw new ApiError(400, 'Invalid mode. Must be "online" or "offline"', 'VALIDATION_ERROR')
    }
    updateFields.mode = mode
  }
  if (venue !== undefined) {
    updateFields.venue = venue
  }
  if (meetingLink !== undefined) {
    updateFields.meetingLink = meetingLink
  }
  if (mandatory !== undefined) {
    updateFields.mandatory = Boolean(mandatory)
  }
  if (description !== undefined) {
    updateFields.description = description
  }

  // Validate venue/meetingLink if mode is being changed or if we have the current mode
  const effectiveMode = mode || infoSession.mode
  if (effectiveMode === 'offline' && (!updateFields.venue || !updateFields.venue.trim())) {
    const currentVenue = updateFields.venue ?? infoSession.venue
    if (!currentVenue.trim()) {
      throw new ApiError(400, 'Venue is required for offline info sessions', 'VALIDATION_ERROR')
    }
  }
  if (
    effectiveMode === 'online' &&
    (!updateFields.meetingLink || !updateFields.meetingLink.trim())
  ) {
    const currentLink = updateFields.meetingLink ?? infoSession.meetingLink
    if (!currentLink.trim()) {
      throw new ApiError(
        400,
        'Meeting link is required for online info sessions',
        'VALIDATION_ERROR'
      )
    }
  }

  try {
    const updatedInfoSession = await InfoSession.findByIdAndUpdate(
      infoSessionId,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).lean({ virtuals: true })

    if (!updatedInfoSession) {
      throw new ApiError(404, 'Info session not found', 'INFO_SESSION_NOT_FOUND')
    }
    return updatedInfoSession
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(
        400,
        'Info session update failed due to duplicate constraint',
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

// Delete info session by ID (coordinator/TPO with department scoping)
export async function deleteInfoSession(infoSessionId, user) {
  const infoSession = await InfoSession.findById(infoSessionId).lean()
  if (!infoSession) {
    throw new ApiError(404, 'Info session not found', 'INFO_SESSION_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(infoSession.drive, user)

  const deleted = await InfoSession.findByIdAndDelete(infoSessionId).lean()
  if (!deleted) {
    throw new ApiError(404, 'Info session not found', 'INFO_SESSION_NOT_FOUND')
  }

  return { deleted: true }
}

// Get info sessions for a drive (student-facing - published+ drives only)
export async function getInfoSessionsForStudent(driveId) {
  // Verify drive exists and is published+
  const drive = await Drive.findOne({
    _id: driveId,
    status: {
      $in: [
        'published',
        'registration_open',
        'registration_closed',
        'in_progress',
        'completed',
        'results_declared',
      ],
    },
  }).lean()

  if (!drive) {
    throw new ApiError(404, 'Drive not found', 'DRIVE_NOT_FOUND')
  }

  const infoSessions = await InfoSession.find({ drive: driveId })
    .sort({ dateTime: 1 })
    .lean({ virtuals: true })

  return infoSessions
}

// Helper: verify drive exists and user has access based on department scoping
async function getDriveAndValidateAccess(driveId, user) {
  const filter = { _id: driveId }

  // Apply department scoping for coordinators
  if (user.role === ROLES.COORDINATOR) {
    filter.departmentScope = user.department
  }
  // TPO has access to all drives (no departmentScope filter)

  const drive = await Drive.findOne(filter).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }

  return drive
}

export default {
  createInfoSession,
  getInfoSessions,
  getInfoSessionById,
  updateInfoSession,
  deleteInfoSession,
  getInfoSessionsForStudent,
}
