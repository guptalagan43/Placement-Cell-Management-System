import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite config also carries the Vitest (jsdom) test setup for the client.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.js',
    // Use worker_threads instead of the default child-process 'forks' pool: the
    // forks worker fails to start when the project path contains spaces on
    // Windows (e.g. "MERN Lab Project"). Threads are unaffected and work in CI.
    pool: 'threads',
  },
})
