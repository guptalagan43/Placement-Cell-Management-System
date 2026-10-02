import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite config also carries the Vitest (jsdom) test setup for the client.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api requests to the Express backend in development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Strip /api prefix before forwarding (server routes start at /auth, /drives, etc.)
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.js',
    // Use threads pool instead of forks to avoid timeout issues on Windows
    // with paths containing spaces (the repo path has "MERN Lab Project").
    pool: 'threads',
  },
})
