// Express application factory. Builds and configures the app WITHOUT connecting
// to the database or binding a port, so it can be imported directly in tests
// (see server.js for the runtime bootstrap that wires in config, DB, and listen).
import express from 'express'
import healthRoutes from './routes/health.routes.js'
import { notFound } from './middleware/not-found.js'
import { errorHandler } from './middleware/error-handler.js'

export function createApp() {
  const app = express()

  app.use(express.json())

  // Liveness/health endpoint (no auth, no business logic).
  app.use('/health', healthRoutes)

  // Unmatched routes -> consistent 404 error contract.
  app.use(notFound)

  // Single centralized error handler; must be registered last (rules.md §6).
  app.use(errorHandler)

  return app
}

export default createApp
