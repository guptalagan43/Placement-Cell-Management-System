import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite config also carries the Vitest (jsdom) test setup for the client.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.js',
    // jsdom v30 uses webidl.util.markAsUncloneable which is unavailable inside
    // worker_threads; use forks (child processes) instead. This is vitest's
    // default pool and works on Linux CI. On Windows with spaces in the path,
    // run tests via WSL or a path without spaces if the forks pool errors.
    pool: 'forks',
  },
})
