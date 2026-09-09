// Company routes: CRUD for company master list.
// Coordinator/TPO can write; all authenticated users can read active companies.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireCoordinatorOrTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import {
  createCompany,
  getCompanies,
  getActiveCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller.js'

const router = Router()

// All authenticated users can read active companies (for drive creation dropdowns)
router.get('/active', authenticate, requireAnyRole, getActiveCompanies)

// Coordinator/TPO write operations
router.post('/', authenticate, requireCoordinatorOrTPO, createCompany)
router.get('/', authenticate, requireCoordinatorOrTPO, getCompanies)
router.get('/:id', authenticate, requireCoordinatorOrTPO, getCompanyById)
router.put('/:id', authenticate, requireCoordinatorOrTPO, updateCompany)
router.delete('/:id', authenticate, requireCoordinatorOrTPO, deleteCompany)

export default router
