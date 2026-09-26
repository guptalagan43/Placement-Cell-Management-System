// Announcement model: posted notices for students (DR-09).
// Traces to FR-ANN-01.
import mongoose from 'mongoose'
import { DEPARTMENTS } from '../constants/departments.js'

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    category: {
      type: String,
      enum: ['general', 'drive_specific', 'urgent'],
      required: true,
      default: 'general',
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      default: null,
    },
    departmentScope: {
      type: String,
      enum: DEPARTMENTS,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
announcementSchema.index({ isPinned: -1, createdAt: -1 })
announcementSchema.index({ category: 1 })
announcementSchema.index({ departmentScope: 1 })
announcementSchema.index({ expiresAt: 1 })

export const Announcement = mongoose.model('Announcement', announcementSchema)
export default Announcement
