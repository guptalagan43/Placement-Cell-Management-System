// Round service: CRUD operations for rounds with department scoping enforcement.
// Handles create, read, update, delete with RBAC enforcement and department scoping.
// Traces to FR-SCH-01.
import mongoose from 'mongoose'
import Round from '../models/Round.model.js'
import Drive from '../models/Drive.model.js'
import { ApiError } from '../utils/api-error.js'
import { ROLES } from '../constants/roles.js'

// Valid modes for a round
const VALID_MODES = ['online', 'offline']

// Create a new round for a drive (coordinator/TPO)
export async function createRound(driveId, data, user) {
  // Verify drive exists and user has access
  await getDriveAndValidateAccess(driveId, user)

  const { roundNumber, name, dateTime, mode, venue, meetingLink, instructions } = data

  // Validate mode
  if (!VALID_MODES.includes(mode)) {
    throw new ApiError(400, 'Invalid mode. Must be "online" or "offline"', 'VALIDATION_ERROR')
  }

  // Validate venue/meetingLink based on mode
  if (mode === 'offline' && !venue.trim()) {
    throw new ApiError(400, 'Venue is required for offline rounds', 'VALIDATION_ERROR')
  }
  if (mode === 'online' && !meetingLink.trim()) {
    throw new ApiError(400, 'Meeting link is required for online rounds', 'VALIDATION_ERROR')
  }

  try {
    const round = await Round.create({
      drive: driveId,
      roundNumber,
      name,
      dateTime: new Date(dateTime),
      mode,
      venue: venue || '',
      meetingLink: meetingLink || '',
      instructions: instructions || '',
    })
    return round.toObject({ virtuals: true })
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(
        400,
        'A round with this round number already exists for this drive',
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

// Get all rounds for a drive with pagination and sorting (coordinator/TPO)
export async function getRounds(driveId, queryParams, user) {
  // Verify drive exists and user has access
  await getDriveAndValidateAccess(driveId, user)

  const { page = 1, limit = 20, sortBy = 'roundNumber', sortOrder = 'asc' } = queryParams

  const filter = { drive: driveId }

  // Sorting - default to roundNumber ascending
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [rounds, total] = await Promise.all([
    Round.find(filter).sort(sort).skip(skip).limit(limitNum).lean({ virtuals: true }),
    Round.countDocuments(filter),
  ])

  return {
    rounds,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get single round by ID (coordinator/TPO with department scoping)
export async function getRoundById(roundId, user) {
  const round = await Round.findById(roundId).lean({ virtuals: true })
  if (!round) {
    throw new ApiError(404, 'Round not found', 'ROUND_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(round.drive, user)

  return round
}

// Update round by ID (coordinator/TPO with department scoping)
export async function updateRound(roundId, updateData, user) {
  const round = await Round.findById(roundId).lean()
  if (!round) {
    throw new ApiError(404, 'Round not found', 'ROUND_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(round.drive, user)

  const { roundNumber, name, dateTime, mode, venue, meetingLink, instructions } = updateData

  const updateFields = {}

  if (roundNumber !== undefined) {
    updateFields.roundNumber = roundNumber
  }
  if (name !== undefined) {
    updateFields.name = name
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
  if (instructions !== undefined) {
    updateFields.instructions = instructions
  }

  // Validate venue/meetingLink if mode is being changed or if we have the current mode
  const effectiveMode = mode || round.mode
  if (effectiveMode === 'offline' && (!updateFields.venue || !updateFields.venue.trim())) {
    const currentVenue = updateFields.venue ?? round.venue
    if (!currentVenue.trim()) {
      throw new ApiError(400, 'Venue is required for offline rounds', 'VALIDATION_ERROR')
    }
  }
  if (
    effectiveMode === 'online' &&
    (!updateFields.meetingLink || !updateFields.meetingLink.trim())
  ) {
    const currentLink = updateFields.meetingLink ?? round.meetingLink
    if (!currentLink.trim()) {
      throw new ApiError(400, 'Meeting link is required for online rounds', 'VALIDATION_ERROR')
    }
  }

  try {
    const updatedRound = await Round.findByIdAndUpdate(
      roundId,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).lean({ virtuals: true })

    if (!updatedRound) {
      throw new ApiError(404, 'Round not found', 'ROUND_NOT_FOUND')
    }
    return updatedRound
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new ApiError(
        400,
        'A round with this round number already exists for this drive',
        'VALIDATION_ERROR'
      )
    }
    throw err
  }
}

// Delete round by ID (coordinator/TPO with department scoping)
export async function deleteRound(roundId, user) {
  const round = await Round.findById(roundId).lean()
  if (!round) {
    throw new ApiError(404, 'Round not found', 'ROUND_NOT_FOUND')
  }

  // Verify user has access to the parent drive
  await getDriveAndValidateAccess(round.drive, user)

  const deleted = await Round.findByIdAndDelete(roundId).lean()
  if (!deleted) {
    throw new ApiError(404, 'Round not found', 'ROUND_NOT_FOUND')
  }

  return { deleted: true }
}

// Get rounds for a drive (student-facing - published+ drives only)
export async function getRoundsForStudent(driveId) {
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

  const rounds = await Round.find({ drive: driveId })
    .sort({ roundNumber: 1 })
    .lean({ virtuals: true })

  return rounds
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
  createRound,
  getRounds,
  getRoundById,
  updateRound,
  deleteRound,
  getRoundsForStudent,
}
