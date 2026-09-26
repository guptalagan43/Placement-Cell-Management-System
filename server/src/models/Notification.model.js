// Notification model: per-user alert (DR-10).
// Traces to FR-NOT-01, FR-NOT-02.
import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'drive_published',
        'application_confirmed',
        'shortlisted',
        'round_rescheduled',
        'results_declared',
        'offer_issued',
        'deadline_approaching',
        'general',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Compound index for user + read status + createdAt (for efficient queries)
notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
