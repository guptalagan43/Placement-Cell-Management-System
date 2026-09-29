// Contact routes: CRUD for contacts directory.
// TPO can write; all authenticated users can read.
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { requireTPO, requireAnyRole } from '../middleware/rbac.middleware.js'
import {
  createContact,
  getContacts,
  getContactDepartments,
  getContactRoles,
  getContactById,
  updateContact,
  deleteContact,
} from '../controllers/contact.controller.js'

const router = Router()

// All authenticated users can read contacts
router.get('/', authenticate, requireAnyRole, getContacts)
router.get('/departments', authenticate, requireAnyRole, getContactDepartments)
router.get('/roles', authenticate, requireAnyRole, getContactRoles)
router.get('/:id', authenticate, requireAnyRole, getContactById)

// TPO write operations
router.post('/', authenticate, requireTPO, createContact)
router.put('/:id', authenticate, requireTPO, updateContact)
router.delete('/:id', authenticate, requireTPO, deleteContact)

export default router
