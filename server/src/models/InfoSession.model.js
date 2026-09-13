// InfoSession model. A non-evaluative Drive event (Pre-Placement Talk) (DR-06).
// Traces to FR-SCH-02, srs.md §6.4.
import mongoose from 'mongoose'

const infoSessionSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ['online', 'offline'],
    },
    venue: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    meetingLink: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Compound index for ordering info sessions by drive + dateTime
infoSessionSchema.index({ drive: 1, dateTime: 1 })

// Ensure virtuals are included in toJSON/toObject
infoSessionSchema.set('toJSON', { virtuals: true })
infoSessionSchema.set('toObject', { virtuals: true })

export const InfoSession = mongoose.model('InfoSession', infoSessionSchema)
export default InfoSession
