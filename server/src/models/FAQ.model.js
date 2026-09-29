// FAQ model. Searchable help-center Q&A collection (DR-13).
// Traces to FR-FAQ-01, srs.md §6.9.
import mongoose from 'mongoose'

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'General',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 10
        },
        message: 'Maximum 10 tags allowed',
      },
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Text index for search
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' })
faqSchema.index({ category: 1 })
faqSchema.index({ isPublished: 1 })

export const FAQ = mongoose.model('FAQ', faqSchema)
export default FAQ
