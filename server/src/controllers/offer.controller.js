// Offer controller: handles offer routes with validation.
import { z } from 'zod'
import { asyncHandler } from '../utils/async-handler.js'
import * as offerSvc from '../services/offer.service.js'

// Validation schemas
const issueOfferSchema = z.object({
  body: z.object({
    document: z.object({
      cloudinaryPublicId: z.string().min(1, 'Cloudinary public ID is required'),
      cloudinarySecureUrl: z.string().url('Invalid Cloudinary URL'),
      originalFilename: z.string().min(1, 'Original filename is required'),
      fileSize: z.number().int().positive(),
      mimeType: z.string(),
    }),
    responseDeadline: z.string().datetime('Response deadline must be a valid ISO datetime'),
  }),
  params: z.object({
    applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID'),
  }),
})

const offerIdParamSchema = z.object({
  params: z.object({
    offerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID'),
  }),
})

const applicationIdParamSchema = z.object({
  params: z.object({
    applicationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID'),
  }),
})

const respondOfferSchema = z.object({
  body: z.object({
    response: z.enum(['accept', 'decline']),
  }),
  params: z.object({
    offerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID'),
  }),
})

// POST /offers/:applicationId — issue offer (coordinator/TPO)
export const issueOffer = [
  asyncHandler(async (req, res) => {
    const { body, params } = issueOfferSchema.parse({ body: req.body, params: req.params })
    const offer = await offerSvc.issueOffer(
      params.applicationId,
      body.document,
      body.responseDeadline,
      req.user._id,
      req.user
    )
    res.status(201).json({ success: true, offer })
  }),
]

// GET /offers/application/:applicationId — get offer for an application
export const getOfferByApplication = [
  asyncHandler(async (req, res) => {
    const { params } = applicationIdParamSchema.parse({ params: req.params })
    const offer = await offerSvc.getOfferByApplicationId(params.applicationId, req.user)
    res.json({ success: true, offer })
  }),
]

// GET /offers/:offerId — get offer by ID
export const getOfferById = [
  asyncHandler(async (req, res) => {
    const { params } = offerIdParamSchema.parse({ params: req.params })
    const offer = await offerSvc.getOfferById(params.offerId, req.user)
    res.json({ success: true, offer })
  }),
]

// PATCH /offers/:offerId/respond — respond to offer (student)
export const respondToOffer = [
  asyncHandler(async (req, res) => {
    const { body, params } = respondOfferSchema.parse({ body: req.body, params: req.params })
    const offer = await offerSvc.respondToOffer(params.offerId, body.response, req.user)
    res.json({ success: true, offer })
  }),
]

export default {
  issueOffer,
  getOfferByApplication,
  getOfferById,
  respondToOffer,
}