// AuditLog model: immutable, append-only record of administrative actions (DR-15).
// Traces to FR-AUD-01, NFR-AUD-01.
import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'eligibility_override',
        'round_status_update',
        'bulk_shortlist_upload',
        'drive_status_change',
        'drive_clone',
        'company_create',
        'company_update',
        'company_delete',
        'offer_issue',
        'offer_response',
        'rules_edit',
        'blacklist_flag_change',
        'student_profile_edit',
      ],
      index: true,
    },
    target: {
      entityType: {
        type: String,
        required: true,
        enum: [
          'Application',
          'Drive',
          'Company',
          'Round',
          'InfoSession',
          'Offer',
          'RulesPage',
          'StudentProfile',
          'User',
        ],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We use custom timestamp field
    versionKey: false,
  }
)

// Compound index for common query patterns
auditLogSchema.index({ actor: 1, timestamp: -1 })
auditLogSchema.index({ 'target.entityType': 1, 'target.entityId': 1, timestamp: -1 })
auditLogSchema.index({ action: 1, timestamp: -1 })

// Prevent modification of audit log entries - they are immutable once created
auditLogSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('AuditLog entries are immutable and cannot be modified')
  }
})

auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog entries are immutable and cannot be modified')
})

auditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog entries are immutable and cannot be modified')
})

auditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog entries are immutable and cannot be modified')
})

auditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog entries are immutable and cannot be deleted')
})

auditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog entries are immutable and cannot be deleted')
})

// Ensure virtuals are included in toJSON/toObject
auditLogSchema.set('toJSON', { virtuals: true })
auditLogSchema.set('toObject', { virtuals: true })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
export default AuditLog
