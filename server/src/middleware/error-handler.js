// Single centralized error handler (rules.md §6). Emits the consistent error
// contract { success:false, message, code } and never leaks stack traces to the
// client; full detail is logged server-side only. `_next` is required so Express
// recognizes this as a 4-arg error handler (it identifies them by arity).
import { ApiError } from '../utils/api-error.js'

export function errorHandler(err, req, res, _next) {
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

export default errorHandler
