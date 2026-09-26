// Announcement controller: handles announcement routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as announcementSvc from '../services/announcement.service.js'

// Validation schemas
const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    body: z.string().min(1, 'Body is required').max(10000, 'Body cannot exceed 10000 characters'),
    category: z.enum(['general', 'drive_specific', 'urgent']).default('general'),
    driveId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID')
      .optional()
      .nullable(),
    departmentScope: z.string().optional().nullable(),
    isPinned: z.boolean().default(false),
    expiresAt: z.string().datetime().optional().nullable(),
  }),
})

const updateAnnouncementSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    body: z
      .string()
      .min(1, 'Body is required')
      .max(10000, 'Body cannot exceed 10000 characters')
      .optional(),
    category: z.enum(['general', 'drive_specific', 'urgent']).optional(),
    driveId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid drive ID')
      .optional()
      .nullable(),
    departmentScope: z.string().optional().nullable(),
    isPinned: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid announcement ID'),
  }),
})

const studentListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    category: z.enum(['general', 'drive_specific', 'urgent']).optional(),
  }),
})

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid announcement ID'),
  }),
})

// GET /announcements — student-facing list
export const getAnnouncements = [
  asyncHandler(async (req, res) => {
    const { query } = studentListQuerySchema.parse({ query: req.query })
    const result = await announcementSvc.getAnnouncementsForStudent(query, req.user)
    res.json({ success: true, ...result })
  }),
]

// GET /announcements/admin — admin/coordinator list (all announcements)
export const getAnnouncementsAdmin = [
  asyncHandler(async (req, res) => {
    const query = req.query
    const departmentScope = req.departmentScope ?? null
    // Convert string params to proper types
    const processedQuery = {
      ...query,
      page: parseInt(query.page, 10) || 1,
      limit: Math.min(parseInt(query.limit, 10) || 20, 100),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      isPinned: query.isPinned === 'true' ? true : query.isPinned === 'false' ? false : undefined,
      includeExpired: query.includeExpired === 'true' ? true : false,
    }
    const result = await announcementSvc.getAnnouncementsAdmin(processedQuery, departmentScope)
    res.json({ success: true, ...result })
  }),
]

// GET /announcements/:id — single announcement
export const getAnnouncementById = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const departmentScope = req.departmentScope ?? null
    const announcement = await announcementSvc.getAnnouncementById(
      params.id,
      req.user,
      departmentScope
    )
    res.json({ success: true, announcement })
  }),
]

// POST /announcements — create announcement (coordinator/TPO)
export const createAnnouncement = [
  asyncHandler(async (req, res) => {
    const { body } = createAnnouncementSchema.parse({ body: req.body })
    const data = {
      title: body.title,
      body: body.body,
      category: body.category,
      drive: body.driveId || null,
      departmentScope: body.departmentScope || null,
      isPinned: body.isPinned,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    }
    const announcement = await announcementSvc.createAnnouncement(data, req.user._id)
    res.status(201).json({ success: true, announcement })
  }),
]

// PUT /announcements/:id — update announcement (coordinator/TPO)
export const updateAnnouncement = [
  asyncHandler(async (req, res) => {
    const { body, params } = updateAnnouncementSchema.parse({ body: req.body, params: req.params })
    const departmentScope = req.departmentScope ?? null

    const data = {}
    if (body.title !== undefined) data.title = body.title
    if (body.body !== undefined) data.body = body.body
    if (body.category !== undefined) data.category = body.category
    if (body.driveId !== undefined) data.drive = body.driveId || null
    if (body.departmentScope !== undefined) data.departmentScope = body.departmentScope || null
    if (body.isPinned !== undefined) data.isPinned = body.isPinned
    if (body.expiresAt !== undefined)
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    const announcement = await announcementSvc.updateAnnouncement(params.id, data, departmentScope)
    res.json({ success: true, announcement })
  }),
]

// DELETE /announcements/:id — delete announcement (coordinator/TPO)
export const deleteAnnouncement = [
  asyncHandler(async (req, res) => {
    const { params } = idParamSchema.parse({ params: req.params })
    const departmentScope = req.departmentScope ?? null
    await announcementSvc.deleteAnnouncement(params.id, departmentScope)
    res.json({ success: true, message: 'Announcement deleted' })
  }),
]

export default {
  getAnnouncements,
  getAnnouncementsAdmin,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
}
