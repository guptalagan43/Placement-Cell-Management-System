// Student import routes
import { Router } from 'express'
import multer from 'multer'
import { bulkImport } from '../controllers/studentImport.controller.js'

const router = Router()

// Configure multer for CSV file upload (memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'), false)
    }
  },
})

// POST /students/bulk-import — upload CSV, returns per-row results
router.post('/bulk-import', upload.single('file'), bulkImport)

export default router
