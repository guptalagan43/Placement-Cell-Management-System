// Round model. One evaluative stage of a Drive (DR-05).
// Traces to FR-SCH-01, srs.md §6.4.
import mongoose from 'mongoose'

const roundSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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
    instructions: {
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

// Compound index for ordering rounds by drive + roundNumber
roundSchema.index({ drive: 1, roundNumber: 1 }, { unique: true })

// Ensure virtuals are included in toJSON/toObject
roundSchema.set('toJSON', { virtuals: true })
roundSchema.set('toObject', { virtuals: true })

export const Round = mongoose.model('Round', roundSchema)
export default Round
