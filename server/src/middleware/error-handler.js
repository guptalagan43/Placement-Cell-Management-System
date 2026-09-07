// Single centralized error handler (rules.md §6). Emits the consistent error
// contract { success:false, message, code } and never leaks stack traces to the
// client; full detail is logged server-side only. `_next` is required so Express
// recognizes this as a 4-arg error handler (it identifies them by arity).
import { ApiError } from '../utils/api-error.js'
import { ZodError } from 'zod'
import mongoose from 'mongoose'

export function errorHandler(err, req, res, _next) {
  // Handle multer errors (file upload validation)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    })
  }

  // Handle multer fileFilter errors (custom errors thrown by fileFilter)
  if (err.message && err.message.includes('Only CSV files are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_TYPE',
    })
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.flatten().fieldErrors
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      code: 'VALIDATION_ERROR',
      details,
    })
  }

  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const details = {}
    for (const [field, error] of Object.entries(err.errors)) {
      details[field] = error.message
    }
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    })
  }

  // Handle Mongoose cast errors (e.g., invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_ID',
    })
  }

  const isApiError = err instanceof ApiError
  const statusCode = isApiError ? err.statusCode : 500
  const code = isApiError ? err.code : 'INTERNAL_ERROR'
  const message = isApiError ? err.message : 'Something went wrong. Please try again later.'

  // Log full detail server-side for unexpected (non-operational) failures.
  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err)
  }

  res.status(statusCode).json({ success: false, message, code })
}

// Lazy import multer to avoid circular dependency
let multer
try {
  multer = require('multer')
} catch {
  multer = { MulterError: class MulterError extends Error {} }
}

export default errorHandler
