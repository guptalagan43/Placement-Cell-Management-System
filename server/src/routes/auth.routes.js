// Auth routes: login (2-step OTP), forgot-password (OTP), reset, activation.
import { Router } from 'express'
import {
  login, validateLogin,
  verifyLoginOtp, validateVerifyLoginOtp,
  forgotPassword, validateForgotPassword,
  verifyForgotOtp, validateVerifyForgotOtp,
  resetPassword, validateResetPassword,
  requestActivation, validateRequestActivation,
  activate, validateActivate,
} from '../controllers/auth.controller.js'

const router = Router()

// Step 1: verify credentials → send OTP to college email
router.post('/login', validateLogin, login)

// Step 2: verify OTP → issue token pair
router.post('/verify-login-otp', validateVerifyLoginOtp, verifyLoginOtp)

// Forgot password — Step 1: send OTP
router.post('/forgot-password', validateForgotPassword, forgotPassword)

// Forgot password — Step 2: verify OTP → get reset token
router.post('/verify-forgot-otp', validateVerifyForgotOtp, verifyForgotOtp)

// Forgot password — Step 3: reset token + new password
router.post('/reset-password', validateResetPassword, resetPassword)

// New account — Step 1: request temp password (sent to college email)
router.post('/request-activation', validateRequestActivation, requestActivation)

// New account — Step 2: temp password + new password → activate
router.post('/activate', validateActivate, activate)

export default router
