// Announcement Board Page: Student-facing announcement feed with filters.
// Traces to FR-ANN-01, FR-SEA-01.
import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  AlertCircle,
  Megaphone,
  Calendar,
  Pin,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react'
import * as announcementApi from '../api/announcement.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'

const CATEGORY_LABELS = {
  general: 'General',
  drive_specific: 'Drive Specific',
  urgent: 'Urgent',
}

const CATEGORY_TONES = {
  general: 'neutral',
  drive_specific: 'info',
  urgent: 'danger',
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AnnouncementBoardPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({ category: '' })
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' })

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await announcementApi.getAnnouncements({
        category: filters.category || undefined,
        page: pagination.page,
        limit: 10,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      })
      setAnnouncements(res.announcements || [])
      setPagination((prev) => ({
        ...prev,
        totalPages: res.pagination?.totalPages || 1,
        total: res.pagination?.total || 0,
      }))
    } catch (err) {
      setError(err.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [filters.category, pagination.page, sort])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const handleCategoryChange = (category) => {
    setFilters((prev) => ({ ...prev, category: category === prev.category ? '' : category }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const isPinned = (a) => a.isPinned === true

  const pinnedAnnouncements = announcements.filter(isPinned)
  const regularAnnouncements = announcements.filter((a) => !isPinned(a))

  if (loading && announcements.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-primary-700" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-primary-100 rounded w-1/4" />
            <div className="h-4 bg-primary-100 rounded w-1/2" />
          </div>
        </div>
        <Card className="animate-pulse">
          <div className="p-8 space-y-4">
            <div className="h-4 bg-primary-100 rounded w-full" />
            <div className="h-4 bg-primary-100 rounded w-full" />
            <div className="h-4 bg-primary-100 rounded w-full" />
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">
              Unable to Load Announcements
            </h1>
            <p className="font-body text-ink-500">{error}</p>
          </div>
        </div>
        <Card>
          <div className="p-8 text-center">
            <Button variant="primary" onClick={fetchAnnouncements}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const totalCount = announcements.length
  const hasFilters = filters.category

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">Announcements</h1>
            <p className="font-body text-ink-500">T&P Cell notices and updates</p>
          </div>
        </div>

        {/* Category Filter Chips & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'general', label: 'General' },
              { value: 'drive_specific', label: 'Drive Specific' },
              { value: 'urgent', label: 'Urgent' },
            ].map((cat) => (
              <Button
                key={cat.value}
                variant={filters.category === cat.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(cat.value)}
                className="flex items-center gap-2"
              >
                {cat.label}
                {filters.category === cat.value && <X className="w-3 h-3" />}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort.sortBy}
              onChange={(e) =>
                setSort((prev) => ({ ...prev, sortBy: e.target.value, sortOrder: 'desc' }))
              }
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
            >
              <option value="createdAt">Newest First</option>
              <option value="updatedAt">Last Updated</option>
              <option value="title">Title</option>
            </select>
            <select
              value={sort.sortOrder}
              onChange={(e) => setSort((prev) => ({ ...prev, sortOrder: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 w-28"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <Filter className="w-4 h-4" />
          <span>
            Filtered by: <strong>{CATEGORY_LABELS[filters.category]}</strong>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCategoryChange(filters.category)}
            aria-label="Clear filter"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Announcements Count */}
      <p className="font-body text-sm text-ink-500">
        {totalCount} announcement{totalCount !== 1 ? 's' : ''} found
        {pagination.total && <span> (Total: {pagination.total})</span>}
      </p>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-ink-900 flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary-700" />
            Pinned Announcements
          </h2>
          <div className="space-y-3">
            {pinnedAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement._id} announcement={announcement} isPinned />
            ))}
          </div>
        </section>
      )}

      {/* Regular Announcements */}
      <section className="space-y-4">
        {pinnedAnnouncements.length > 0 && (
          <h2 className="font-heading text-lg font-semibold text-ink-900">Latest Announcements</h2>
        )}
        {regularAnnouncements.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <Megaphone className="w-12 h-12 text-ink-300 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                {hasFilters ? 'No announcements match your filter' : 'No Announcements'}
              </h3>
              <p className="font-body text-ink-500">
                {hasFilters
                  ? 'Try changing your filter selection.'
                  : 'No announcements published yet.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                isPinned={false}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="font-body text-sm text-ink-600 px-4">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function AnnouncementCard({ announcement, isPinned }) {
  const categoryTone = CATEGORY_TONES[announcement.category] || 'neutral'
  const isUrgent = announcement.category === 'urgent'

  return (
    <Card
      className={`relative border-l-4 ${isPinned ? 'border-primary-700 bg-primary-50/50' : isUrgent ? 'border-danger bg-danger/5' : ''}`}
    >
      {isPinned && (
        <div className="absolute top-2 right-2">
          <Badge tone="primary" size="xs" className="flex items-center gap-1">
            <Pin className="w-3 h-3" />
            Pinned
          </Badge>
        </div>
      )}

      <div className="p-5 {isPinned ? 'pl-8' : 'pl-6'}">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-heading text-base font-semibold text-ink-900 truncate">
                {announcement.title}
              </h3>
              <Badge tone={categoryTone} size="xs">
                {CATEGORY_LABELS[announcement.category] || announcement.category}
              </Badge>
              {announcement.drive && (
                <Badge tone="info" size="xs" className="flex items-center gap-1">
                  <Megaphone className="w-3 h-3" />
                  Drive Specific
                </Badge>
              )}
            </div>

            <div className="prose prose-sm max-w-none font-body text-ink-700 whitespace-pre-line">
              {announcement.body}
            </div>

            {announcement.departmentScope && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-ink-100 text-ink-700">
                  {announcement.departmentScope}
                </span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Posted {formatDateTime(announcement.createdAt)}
              </span>
              {announcement.expiresAt && (
                <span className="flex items-center gap-1 text-warning">
                  <Calendar className="w-3 h-3" />
                  Expires {formatDate(announcement.expiresAt)}
                </span>
              )}
              {announcement.postedBy?.name && (
                <span className="flex items-center gap-1">
                  Posted by {announcement.postedBy.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
