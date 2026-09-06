// Password hashing utilities. Centralizes bcrypt so the cost factor and the
// algorithm live in one place, and password handling stays consistent
// everywhere it is needed. Enforces the core of NFR-SEC-01 / rules.md §7.1:
// passwords are only ever stored as one-way hashes, never in plaintext.
import bcrypt from 'bcrypt'

// bcrypt work factor. 12 is a sensible 2020s default — strong against brute
// force while keeping login latency acceptable.
export const SALT_ROUNDS = 12

// Hash a plaintext password. Returns a self-describing bcrypt hash (which
// embeds the salt and cost factor), suitable for direct storage.
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}

// Verify a plaintext candidate against a stored bcrypt hash. Resolves to a
// boolean; does not throw on a normal mismatch.
export async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash)
}
