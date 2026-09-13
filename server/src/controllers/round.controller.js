// Round controller: handles round CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as roundSvc from '../services/round.service.js'

// Validation schemas
const createRoundSchema = z.object({
  body: z.object({
    roundNumber: z.number().int().min(1).max(20),
    name: z.string().min(1).max(100).trim(),
    dateTime: z.string().datetime({ offset: true }),
    mode: z.enum(['online', 'offline']),
    venue: z.string().max(500).optional(),
    meetingLink: z.string().max(500).optional(),
    instructions: z.string().max(2000).optional(),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const updateRoundSchema = z.object({
  body: z.object({
    roundNumber: z.number().int().min(1).max(20).optional(),
    name: z.string().min(1).max(100).trim().optional(),
    dateTime: z.string().datetime({ offset: true }).optional(),
    mode: z.enum(['online', 'offline']).optional(),
    venue: z.string().max(500).optional(),
    meetingLink: z.string().max(500).optional(),
    instructions: z.string().max(2000).optional(),
  }),
  params: z.object({
    roundId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid round ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('roundNumber'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    roundId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid round ID'),
  }),
})

const driveIdParamSchema = z.object({
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

// POST /drives/:driveId/rounds — create round (coordinator/TPO)
export const createRound = [
  asyncHandler(async (req, res) => {
    const { body, params } = createRoundSchema.parse({ body: req.body, params: req.params })
    const round = await roundSvc.createRound(params.driveId, body, req.user)
    res.status(201).json({ success: true, round })
  }),
]

// GET /drives/:driveId/rounds — list rounds for a drive (coordinator/TPO)
export const getRounds = [
  asyncHandler(async (req, res) => {
    const { query, params } = listQuerySchema.parse({ query: req.query, params: req.params })
    const result = await roundSvc.getRounds(params.driveId, query, req.user)
    res.json({ success: true, ...result })
  }),
]

// GET /drives/:driveId/rounds/student — list rounds for students (published+ drives only)
export const getRoundsForStudent = [
  asyncHandler(async (req, res) => {
    const { params } = driveIdParamSchema.parse({ params: req.params })
    const rounds = await roundSvc.getRoundsForStudent(params.driveId)
    res.json({ success: true, rounds })
  }),
]

// GET /rounds/:roundId — get single round (coordinator/TPO)
export const getRoundById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const round = await roundSvc.getRoundById(params.roundId, req.user)
    res.json({ success: true, round })
  }),
]

// PUT /rounds/:roundId — update round (coordinator/TPO)
export const updateRound = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateRoundSchema.parse({ body: req.body, params: req.params })
    const round = await roundSvc.updateRound(params.roundId, body, req.user)
    res.json({ success: true, round })
  }),
]

// DELETE /rounds/:roundId — delete round (coordinator/TPO)
export const deleteRound = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await roundSvc.deleteRound(params.roundId, req.user)
    res.json({ success: true, message: 'Round deleted successfully' })
  }),
]

export default {
  createRound,
  getRounds,
  getRoundsForStudent,
  getRoundById,
  updateRound,
  deleteRound,
}
