// FAQ routes: CRUD for FAQ collection.
// TPO can write; all authenticated users can read published FAQs.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import {
  createFAQ,
  getFAQs,
  getPublishedFAQs,
  getFAQCategories,
  getFAQById,
  updateFAQ,
  deleteFAQ,
} from '../controllers/faq.controller.js'

const router = Router()

// Student-facing: published FAQs only
router.get('/published', authenticate, requireAnyRole, getPublishedFAQs)
router.get('/categories', authenticate, requireAnyRole, getFAQCategories)

// TPO write operations
router.post('/', authenticate, requireTPO, createFAQ)
router.get('/', authenticate, requireTPO, getFAQs)
router.get('/:id', authenticate, requireTPO, getFAQById)
router.put('/:id', authenticate, requireTPO, updateFAQ)
router.delete('/:id', authenticate, requireTPO, deleteFAQ)

export default router
