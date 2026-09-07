// Auth routes: login, forgot password, reset password.
import { Router } from 'express'
import {
  login,
  validateLogin,
  forgotPassword,
  validateForgotPassword,
  resetPassword,
  validateResetPassword,
} from '../controllers/auth.controller.js'

const router = Router()

// POST /auth/login — validate input, then handle login.
router.post('/login', validateLogin, login)

// POST /auth/forgot-password — send reset email (generic response, no enumeration).
router.post('/forgot-password', validateForgotPassword, forgotPassword)

// POST /auth/reset-password — verify token and set new password.
router.post('/reset-password', validateResetPassword, resetPassword)

// Placeholder for future: POST /auth/refresh, POST /auth/logout

export default router
