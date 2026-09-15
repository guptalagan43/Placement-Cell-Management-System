// Operational error carrying an HTTP status and a stable, machine-readable code,
// so the centralized error handler can emit the { success, message, code }
// contract defined in rules.md §6.
export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
  }
}

export default ApiError
