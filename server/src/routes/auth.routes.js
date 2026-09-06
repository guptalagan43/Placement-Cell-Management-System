// Auth routes: login, refresh, logout (later).
import { Router } from 'express'
import { login, validateLogin } from '../controllers/auth.controller.js'

const router = Router()

// POST /auth/login — validate input, then handle login.
router.post('/login', validateLogin, login)

// Placeholder for future: POST /auth/refresh, POST /auth/logout

export default router
