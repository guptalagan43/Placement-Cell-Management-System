// Environment configuration loader + validator. Parsing is a pure function
// (parseEnv) so it is unit-testable without touching process.env; loadEnv()
// applies it to the real environment at bootstrap. Only the variables the
// backend skeleton needs are declared here; later phases extend the schema.
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string({ error: 'MONGODB_URI is required' }).min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
})

// Validate an arbitrary source object and return the typed config, or throw a
// single clear error describing every invalid/missing variable.
export function parseEnv(source) {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  return result.data
}

export function loadEnv() {
  return parseEnv(process.env)
}

export default loadEnv
