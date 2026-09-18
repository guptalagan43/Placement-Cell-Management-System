import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite config also carries the Vitest (jsdom) test setup for the client.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.js',
    // Use threads pool instead of forks to avoid timeout issues on Windows
    // with paths containing spaces (the repo path has "MERN Lab Project").
    pool: 'threads',
  },
})
