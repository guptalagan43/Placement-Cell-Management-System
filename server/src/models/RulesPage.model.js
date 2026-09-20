// RulesPage model: versioned placement policy content (DR-11).
// Traces to FR-RUL-01, FR-AUD-01.
import mongoose from 'mongoose'

const rulesPageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const RulesPage = mongoose.model('RulesPage', rulesPageSchema)
export default RulesPage
