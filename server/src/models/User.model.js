// User model. The foundational identity record for all three actor classes
// (Student, Coordinator, TPO) per srs.md §5 and DR-01. Enforces NFR-SEC-01
// and rules.md §7.1: passwords are only ever stored as bcrypt hashes and are
// excluded from all serialized output.
import mongoose from 'mongoose'
import { ROLES, ROLE_VALUES } from '../constants/roles.js'
import { DEPARTMENTS } from '../constants/departments.js'
import { hashPassword, comparePassword } from '../utils/password.js'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Exclude from query results by default
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      required: true,
    },
    department: {
      type: String,
      enum: DEPARTMENTS,
      required: function () {
        return this.role === ROLES.COORDINATOR
      },
      default: undefined,
    },
    active: {
      type: Boolean,
      default: true,
    },
    mustResetPassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Pre-validate hook: hash the password before validation runs, so the
// required `passwordHash` field is satisfied. We check for the presence of
// `_plainPassword` (set by the virtual setter) as the signal to hash.
userSchema.pre('validate', async function () {
  if (this._plainPassword) {
    this.passwordHash = await hashPassword(this._plainPassword)
  }
})

// Instance method to verify a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = async function (plaintext) {
  return comparePassword(plaintext, this.passwordHash)
}

// Virtual for setting plaintext password; never persisted, only triggers the hook.
userSchema.virtual('password').set(function (plaintext) {
  this._plainPassword = plaintext
})

// Ensure passwordHash is never included in JSON output (toJSON covers res.json()).
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret._plainPassword
    // Normalize undefined department to null for consistent API output
    if (ret.department === undefined) {
      ret.department = null
    }
    return ret
  },
})

// Ensure passwordHash is never included in toObject output either.
userSchema.set('toObject', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret._plainPassword
    if (ret.department === undefined) {
      ret.department = null
    }
    return ret
  },
})

export const User = mongoose.model('User', userSchema)
export default User
