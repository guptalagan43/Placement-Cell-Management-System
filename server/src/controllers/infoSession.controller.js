// InfoSession controller: handles info session CRUD routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as infoSessionSvc from '../services/infoSession.service.js'

// Validation schemas
const createInfoSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).trim(),
    dateTime: z.string().datetime({ offset: true }),
    mode: z.enum(['online', 'offline']),
    venue: z.string().max(500).optional(),
    meetingLink: z.string().max(500).optional(),
    mandatory: z.boolean().optional(),
    description: z.string().max(2000).optional(),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const updateInfoSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).trim().optional(),
    dateTime: z.string().datetime({ offset: true }).optional(),
    mode: z.enum(['online', 'offline']).optional(),
    venue: z.string().max(500).optional(),
    meetingLink: z.string().max(500).optional(),
    mandatory: z.boolean().optional(),
    description: z.string().max(2000).optional(),
  }),
  params: z.object({
    infoSessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid info session ID'),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('dateTime'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    infoSessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid info session ID'),
  }),
})

const driveIdParamSchema = z.object({
  params: z.object({
    driveId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID'),
  }),
})

// POST /drives/:driveId/info-sessions — create info session (coordinator/TPO)
export const createInfoSession = [
  asyncHandler(async (req, res) => {
    const { body, params } = createInfoSessionSchema.parse({ body: req.body, params: req.params })
    const infoSession = await infoSessionSvc.createInfoSession(params.driveId, body, req.user)
    res.status(201).json({ success: true, infoSession })
  }),
]

// GET /drives/:driveId/info-sessions — list info sessions for a drive (coordinator/TPO)
export const getInfoSessions = [
  asyncHandler(async (req, res) => {
    const { query, params } = listQuerySchema.parse({ query: req.query, params: req.params })
    const result = await infoSessionSvc.getInfoSessions(params.driveId, query, req.user)
    res.json({ success: true, ...result })
  }),
]

// GET /drives/:driveId/info-sessions/student — list info sessions for students (published+ drives only)
export const getInfoSessionsForStudent = [
  asyncHandler(async (req, res) => {
    const { params } = driveIdParamSchema.parse({ params: req.params })
    const infoSessions = await infoSessionSvc.getInfoSessionsForStudent(params.driveId)
    res.json({ success: true, infoSessions })
  }),
]

// GET /info-sessions/:infoSessionId — get single info session (coordinator/TPO)
export const getInfoSessionById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const infoSession = await infoSessionSvc.getInfoSessionById(params.infoSessionId, req.user)
    res.json({ success: true, infoSession })
  }),
]

// PUT /info-sessions/:infoSessionId — update info session (coordinator/TPO)
export const updateInfoSession = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateInfoSessionSchema.parse({ body: req.body, params: req.params })
    const infoSession = await infoSessionSvc.updateInfoSession(params.infoSessionId, body, req.user)
    res.json({ success: true, infoSession })
  }),
]

// DELETE /info-sessions/:infoSessionId — delete info session (coordinator/TPO)
export const deleteInfoSession = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    await infoSessionSvc.deleteInfoSession(params.infoSessionId, req.user)
    res.json({ success: true, message: 'Info session deleted successfully' })
  }),
]

export default {
  createInfoSession,
  getInfoSessions,
  getInfoSessionsForStudent,
  getInfoSessionById,
  updateInfoSession,
  deleteInfoSession,
}
