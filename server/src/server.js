// Runtime bootstrap: load + validate environment, connect to MongoDB (fail-fast),
// then start the HTTP server. Kept separate from app.js so the Express app stays
// importable in tests without a live database or an open port.
import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { connectDB } from './db/connect.js'

// Load a local .env when present (development). In production the platform
// injects real environment variables; a missing file is expected, not an error.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}

async function start() {
  let env
  try {
    env = loadEnv()
  } catch (err) {
    console.error(`[fatal] ${err.message}`)
    process.exit(1)
    return
  }

  try {
    await connectDB(env.MONGODB_URI)
    console.log('[db] connected to MongoDB')
  } catch (err) {
    console.error('[fatal] could not connect to MongoDB:', err.message)
    process.exit(1)
    return
  }

  const app = createApp()
  app.listen(env.PORT, () => {
    console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`)
  })
}

start()
