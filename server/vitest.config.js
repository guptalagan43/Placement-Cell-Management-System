import { defineConfig } from 'vitest/config'

// Server test config. No jsdom needed (pure Node environment).
// singleFork: true is critical — all test files use mongoose's global connection
// with their own MongoMemoryServer. Running files in parallel across workers causes
// mongoose state to bleed between files (duplicate key errors). Sequential execution
// in a single worker eliminates that race entirely.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
