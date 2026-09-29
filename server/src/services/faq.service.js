// FAQ service: CRUD operations for FAQ collection.
// Traces to FR-FAQ-01, FR-SEA-01.
import FAQ from '../models/FAQ.model.js'
import { ApiError } from '../utils/api-error.js'

// Fields allowed for create/update by TPO
const ALLOWED_FIELDS = ['question', 'answer', 'category', 'tags', 'isPublished']

// Create a new FAQ (TPO only)
export async function createFAQ(data) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      filtered[key] = data[key]
    }
  }

  const faq = await FAQ.create(filtered)
  return faq.toObject()
}

// Get all FAQs with pagination, filtering, sorting, search
export async function getFAQs(queryParams) {
  const {
    search,
    category,
    isPublished,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams

  const filter = {}

  if (search) {
    filter.$text = { $search: search }
  }
  if (category) filter.category = category
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true'

  // Sorting
  const sort = {}
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1

  // Pagination
  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(100, Math.max(1, Number(limit)))
  const skip = (pageNum - 1) * limitNum

  const [faqs, total] = await Promise.all([
    FAQ.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
    FAQ.countDocuments(filter),
  ])

  return {
    faqs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  }
}

// Get published FAQs for students (simplified - no pagination)
export async function getPublishedFAQs() {
  const faqs = await FAQ.find({ isPublished: true })
    .select('question answer category tags')
    .sort({ category: 1, createdAt: 1 })
    .lean()
  return faqs
}

// Get unique categories from FAQs (for filter dropdown)
export async function getFAQCategories() {
  const categories = await FAQ.distinct('category', { isPublished: true })
  return categories.sort()
}

// Get single FAQ by ID
export async function getFAQById(faqId) {
  const faq = await FAQ.findById(faqId).lean()
  if (!faq) {
    throw new ApiError(404, 'FAQ not found', 'FAQ_NOT_FOUND')
  }
  return faq
}

// Update FAQ by ID (TPO only)
export async function updateFAQ(faqId, updateData) {
  const filtered = {}
  for (const key of ALLOWED_FIELDS) {
    if (updateData[key] !== undefined) {
      filtered[key] = updateData[key]
    }
  }

  const faq = await FAQ.findByIdAndUpdate(
    faqId,
    { $set: filtered },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  if (!faq) {
    throw new ApiError(404, 'FAQ not found', 'FAQ_NOT_FOUND')
  }
  return faq
}

// Delete FAQ by ID (TPO only)
export async function deleteFAQ(faqId) {
  const faq = await FAQ.findByIdAndDelete(faqId).lean()
  if (!faq) {
    throw new ApiError(404, 'FAQ not found', 'FAQ_NOT_FOUND')
  }
  return { deleted: true }
}

export default {
  createFAQ,
  getFAQs,
  getPublishedFAQs,
  getFAQCategories,
  getFAQById,
  updateFAQ,
  deleteFAQ,
}
