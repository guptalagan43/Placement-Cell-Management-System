// Converts any unmatched route into a 404 ApiError routed to the error handler,
// keeping the failure response consistent with the rules.md §6 contract.
import { ApiError } from '../utils/api-error.js'

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'))
}

export default notFound
