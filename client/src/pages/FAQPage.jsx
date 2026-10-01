// FAQ Help Center Page: All authenticated users can view published FAQs; TPO can create, edit, delete.
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  HelpCircle,
} from 'lucide-react'
import * as faqApi from '../api/faq.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const faqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required').max(5000),
  category: z.string().max(100).optional(),
  tags: z.string().optional(), // comma-separated input
  isPublished: z.boolean().optional(),
})

const FAQForm = ({ isOpen, onClose, onSubmit, initialData, isLoading, title, categories }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: '',
      tags: '',
      isPublished: true,
      ...initialData,
    },
  })

  const watchedQuestion = watch('question')
  const watchedAnswer = watch('answer')
  const watchedCategory = watch('category')
  const watchedTags = watch('tags')
  const watchedIsPublished = watch('isPublished')

  useEffect(() => {
    if (isOpen) {
      const tagsString = initialData?.tags?.join(', ') ?? ''
      reset({
        question: '',
        answer: '',
        category: '',
        tags: tagsString,
        isPublished: true,
        ...initialData,
      })
    }
  }, [isOpen, initialData, reset])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl shadow-raised w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-ink-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            <Input
              label="Question *"
              {...register('question')}
              error={errors.question?.message}
              placeholder="e.g., How do I apply for a drive?"
              value={watchedQuestion}
              onChange={(e) => setValue('question', e.target.value)}
            />

            <div>
              <label className="font-body text-sm font-medium text-ink-900 block mb-1.5">
                Answer *
              </label>
              <textarea
                {...register('answer')}
                rows={5}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                placeholder="Provide a detailed answer..."
                value={watchedAnswer}
                onChange={(e) => setValue('answer', e.target.value)}
              />
              {errors.answer && <p className="mt-1 text-sm text-danger">{errors.answer.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Category"
                {...register('category')}
                error={errors.category?.message}
                placeholder="e.g., Application Process, Eligibility, Offers"
                value={watchedCategory}
                onChange={(e) => setValue('category', e.target.value)}
                list="category-options"
              />
              <datalist id="category-options">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              <Input
                label="Tags (comma-separated)"
                {...register('tags')}
                error={errors.tags?.message}
                placeholder="placement, drive, application"
                value={watchedTags}
                onChange={(e) => setValue('tags', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isPublished')}
                id="isPublished"
                checked={watchedIsPublished}
                onChange={(e) => setValue('isPublished', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-700 focus:ring-primary-700"
              />
              <label htmlFor="isPublished" className="font-body text-sm text-ink-600">
                Published (visible to students)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FAQItem = ({ faq, isTPO, onEdit, onDelete, isExpanded, onToggle }) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-primary-50/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-primary-700 flex-shrink-0" />
            <h3 className="font-body text-base font-semibold text-ink-900">{faq.question}</h3>
            {faq.category && (
              <Badge tone="info" size="sm">
                {faq.category}
              </Badge>
            )}
          </div>
          {isExpanded && (
            <div className="mt-3 text-ink-600 whitespace-pre-wrap font-body text-sm leading-relaxed">
              {faq.answer}
            </div>
          )}
          {!isExpanded && (
            <p className="mt-2 text-ink-400 font-body text-sm">Click to expand answer...</p>
          )}
          {faq.tags && faq.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {faq.tags.map((tag) => (
                <Badge key={tag} tone="neutral" size="xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-ink-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ink-400" />
          )}
          {isTPO && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(faq)
                }}
                aria-label={`Edit ${faq.question}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(faq)
                }}
                aria-label={`Delete ${faq.question}`}
                className="text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

export default function FAQPage() {
  const { user } = useAuth()
  const isTPO = user?.role === 'tpo'

  const [faqs, setFaqs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // For TPO: pagination, sorting, etc.
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [isPublishedFilter, setIsPublishedFilter] = useState('')
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' })

  const fetchFAQs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isTPO) {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search,
          category: selectedCategory,
          isPublished: isPublishedFilter,
          sortBy: sort.sortBy,
          sortOrder: sort.sortOrder,
        }
        const res = await faqApi.getFAQs(params)
        setFaqs(res.faqs)
        setPagination(res.pagination)
      } else {
        const res = await faqApi.getPublishedFAQs()
        setFaqs(res.faqs)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch FAQs')
    } finally {
      setLoading(false)
    }
  }, [isTPO, pagination.page, pagination.limit, search, selectedCategory, isPublishedFilter, sort])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await faqApi.getFAQCategories()
      setCategories(res.categories)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFAQs()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [fetchFAQs, fetchCategories])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    if (isTPO) setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleCategoryChange = (value) => {
    setSelectedCategory(value)
    if (isTPO) setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handlePublishedFilterChange = (value) => {
    setIsPublishedFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreateModal = () => {
    setEditingFAQ(null)
    setModalOpen(true)
  }

  const openEditModal = (faq) => {
    setEditingFAQ(faq)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingFAQ(null)
  }

  const handleFormSubmit = async (data) => {
    setSubmitLoading(true)
    setError(null)
    try {
      const tagsArray = data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []
      const payload = { ...data, tags: tagsArray }

      if (editingFAQ) {
        await faqApi.updateFAQ(editingFAQ._id, payload)
        setSuccess('FAQ updated successfully')
      } else {
        await faqApi.createFAQ(payload)
        setSuccess('FAQ created successfully')
      }
      closeModal()
      fetchFAQs()
      fetchCategories()
    } catch (err) {
      setError(err.message || 'Failed to save FAQ')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (faq) => {
    if (!window.confirm(`Are you sure you want to delete "${faq.question}"?`)) return
    setError(null)
    try {
      await faqApi.deleteFAQ(faq._id)
      setSuccess('FAQ deleted successfully')
      fetchFAQs()
      fetchCategories()
    } catch (err) {
      setError(err.message || 'Failed to delete FAQ')
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const groupedFAQs = faqs.reduce((acc, faq) => {
    const cat = faq.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(faq)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">FAQ / Help Center</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Find answers to common questions about placements, drives, and applications
          </p>
        </div>
        {isTPO && (
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Add FAQ
          </Button>
        )}
      </div>

      {error && (
        <div
          className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-4 flex items-center justify-between"
          role="alert"
        >
          <span className="font-body text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {success && (
        <div
          className="bg-success bg-opacity-10 border border-success text-success rounded-lg p-4 flex items-center justify-between"
          role="status"
        >
          <span className="font-body text-sm">{success}</span>
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search FAQs by question, answer, or tags..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {isTPO && (
                <select
                  value={isPublishedFilter}
                  onChange={(e) => handlePublishedFilterChange(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                >
                  <option value="">All Status</option>
                  <option value="true">Published</option>
                  <option value="false">Draft</option>
                </select>
              )}
              {isTPO && (
                <div className="flex gap-2">
                  <select
                    value={sort.sortBy}
                    onChange={(e) =>
                      setSort((prev) => ({ ...prev, sortBy: e.target.value, sortOrder: 'asc' }))
                    }
                    className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="category">Category</option>
                    <option value="question">Question</option>
                  </select>
                  <select
                    value={sort.sortOrder}
                    onChange={(e) => setSort((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 w-24"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <p className="font-body text-ink-500">No FAQs found</p>
            {isTPO && (
              <p className="font-body text-sm text-ink-400 mt-1">
                Click "Add FAQ" to create your first entry
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {Object.entries(groupedFAQs).map(([category, catFaqs]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-body text-sm font-semibold text-ink-600 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-primary-700" />
                    </span>
                    {category} ({catFaqs.length})
                  </h4>
                  <div className="space-y-2">
                    {catFaqs.map((faq) => (
                      <FAQItem
                        key={faq._id}
                        faq={faq}
                        isTPO={isTPO}
                        isExpanded={expandedIds.has(faq._id)}
                        onToggle={() => toggleExpand(faq._id)}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isTPO && pagination.totalPages > 1 && (
              <div className="px-4 py-4 border-t border-border flex items-center justify-between">
                <p className="font-body text-sm text-ink-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} FAQs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <FAQForm
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingFAQ}
        isLoading={submitLoading}
        title={editingFAQ ? 'Edit FAQ' : 'Add FAQ'}
        categories={categories}
      />
    </div>
  )
}
