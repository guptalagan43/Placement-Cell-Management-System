// Offer routes: CRUD for offer letters.
// Coordinator/TPO can issue offers; Students can view and respond to their own offers.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import {
  requireStudent,
  requireCoordinatorOrTPO,
  requireAnyRole,
} from '../middleware/rbac.middleware.js'
import { departmentScope } from '../middleware/scope.middleware.js'
import {
  issueOffer,
  getOfferByApplication,
  getOfferById,
  respondToOffer,
  getUploadParams,
} from '../controllers/offer.controller.js'

const router = Router()

// Coordinator/TPO: Get signed upload parameters for offer documents
router.get(
  '/upload-params',
  authenticate,
  requireCoordinatorOrTPO,
  getUploadParams
)

// Coordinator/TPO: Issue an offer against an application
// Must verify the application is in 'selected' status
router.post(
  '/:applicationId',
  authenticate,
  requireCoordinatorOrTPO,
  departmentScope,
  issueOffer
)

// Student: Get offer for their application
router.get(
  '/application/:applicationId',
  authenticate,
  requireAnyRole,
  getOfferByApplication
)

// Student/Coordinator/TPO: Get offer by ID
router.get(
  '/:offerId',
  authenticate,
  requireAnyRole,
  getOfferById
)

// Student: Respond to offer (accept/decline)
router.patch(
  '/:offerId/respond',
  authenticate,
  requireStudent,
  respondToOffer
)

export default router