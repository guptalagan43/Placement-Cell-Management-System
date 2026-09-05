// MongoDB connection helper. Rejects (fail-fast) if the initial connection
// cannot be established, so the bootstrap can surface a clear error and exit
// rather than serving requests against an unreachable database.
import mongoose from 'mongoose'

export async function connectDB(uri, options = {}) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    ...options,
  })
  return mongoose.connection
}

export default connectDB
