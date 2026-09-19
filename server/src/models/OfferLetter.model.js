// OfferLetter model. A formal offer against an Application (DR-08).
// Traces to FR-OFR-01, FR-OFR-02, FR-OFR-03, FR-OFR-04.
import mongoose from 'mongoose'

const offerLetterSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    document: {
      cloudinaryPublicId: {
        type: String,
        required: true,
      },
      cloudinarySecureUrl: {
        type: String,
        required: true,
      },
      originalFilename: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
      },
    },
    issuedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    responseDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
    },
    issuedBy: {
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

// Index for finding expired offers
offerLetterSchema.index({ status: 1, responseDeadline: 1 })

// Ensure virtuals are included in toJSON/toObject
offerLetterSchema.set('toJSON', { virtuals: true })
offerLetterSchema.set('toObject', { virtuals: true })

export const OfferLetter = mongoose.model('OfferLetter', offerLetterSchema)
export default OfferLetter