// Health-check route: reports API liveness and current DB connection state.
// Always returns 200 (liveness); the database field is informational so the
// endpoint does not require a live connection to respond.
import express from 'express'
import mongoose from 'mongoose'

const router = express.Router()

// mongoose.connection.readyState -> human-readable label.
const CONNECTION_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting']

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: CONNECTION_STATES[mongoose.connection.readyState] ?? 'unknown',
  })
})

export default router
