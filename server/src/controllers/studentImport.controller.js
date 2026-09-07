// Student bulk import controller. Handles CSV upload, delegates to service,
// returns per-row results. Always returns 200 with per-row report
// (acceptance: malformed rows rejected with per-row error report, not silent partial import).
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import { bulkImportStudents } from '../services/studentImport.service.js'

// POST /students/bulk-import
// Expects multipart/form-data with a 'file' field containing CSV
export const bulkImport = [
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, 'No CSV file uploaded', 'NO_FILE')
    }

    const csvBuffer = req.file.buffer
    const frontendUrl = process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173'

    const { summary, results } = await bulkImportStudents(csvBuffer, frontendUrl)

    // Always return 200 with per-row report (acceptance criteria)
    res.status(200).json({
      success: true,
      message: `Import completed: ${summary.succeeded} succeeded, ${summary.failed} failed`,
      summary,
      results,
    })
  }),
]

export default { bulkImport }
