// Student Drive List Page: Students can browse published+ drives with filters and search.
// Uses cards layout per design.md reference; no eligibility badge yet (Phase 28).
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Filter,
  Briefcase,
  DollarSign,
  Calendar,
  Target,
  ChevronRight,
  Building2,
} from 'lucide-react'
import * as driveApi from '../api/drive.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'

const JOB_TYPES = [
  { value: '', label: 'All Job Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'full-time+internship', label: 'Full-time + Internship' },
]

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Tier ${i + 1}` })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'registration_open', label: 'Registration Open' },
  { value: 'registration_closed', label: 'Registration Closed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'results_declared', label: 'Results Declared' },
]

const getStatusTone = (status) => {
  switch (status) {
    case 'published':
    case 'registration_open':
      return 'success'
    case 'registration_closed':
    case 'in_progress':
      return 'warning'
    case 'completed':
    case 'results_declared':
      return 'neutral'
    default:
      return 'neutral'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatCTC = (ctcLpa) => {
  if (!ctcLpa && ctcLpa !== 0) return '-'
  return `₹${ctcLpa} LPA`
}

export default function StudentDriveListPage() {
  const [drives, setDrives] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({
    search: '',
    jobType: '',
    tier: '',
    status: '',
    ctcMin: '',
    ctcMax: '',
  })
  const [sort, setSort] = useState({ sortBy: 'registrationDeadline', sortOrder: 'asc' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDrives = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
        ...filters,
      }
      const res = await driveApi.getDrivesForStudents(params)
      setDrives(res.drives)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch drives')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters])

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  // Initial load
  useEffect(() => {
    fetchDrives()
  }, [])

  // Refetch when dependencies change
  useEffect(() => {
    fetchDrives()
  }, [pagination.page, pagination.limit, sort, filters])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleSearch = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({ search: '', jobType: '', tier: '', status: '', ctcMin: '', ctcMax: '' })
  }

  const hasActiveFilters = useMemo(
    () => filters.jobType || filters.tier || filters.status || filters.ctcMin || filters.ctcMax,
    [filters.jobType, filters.tier, filters.status, filters.ctcMin, filters.ctcMax]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink-900">Drives</h1>
        <p className="font-body text-sm text-ink-600 mt-1">
          Browse and apply to recruitment drives from companies visiting campus
        </p>
      </div>

      {error && (
        <div
          className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-4 flex items-center justify-between"
          role="alert"
        >
          <span className="font-body text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchDrives}>
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border bg-primary-50/30">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search by title, company, or description..."
                value={filters.search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.jobType}
                onChange={(e) => handleFilterChange('jobType', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[150px]"
              >
                {JOB_TYPES.map((jt) => (
                  <option key={jt.value} value={jt.value}>
                    {jt.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[120px]"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[160px]"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min CTC"
                  value={filters.ctcMin}
                  onChange={(e) => handleFilterChange('ctcMin', e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-28"
                />
                <Input
                  type="number"
                  placeholder="Max CTC"
                  value={filters.ctcMax}
                  onChange={(e) => handleFilterChange('ctcMax', e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-28"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  icon={<Filter className="w-4 h-4" />}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {(filters.jobType ||
            filters.tier ||
            filters.status ||
            filters.ctcMin ||
            filters.ctcMax) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.jobType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary-700 text-primary-700 text-sm bg-primary-50">
                  <span>Job Type: {JOB_TYPES.find((j) => j.value === filters.jobType)?.label}</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('jobType', '')}
                    className="hover:bg-primary-100 rounded-full p-0.5"
                    aria-label="Remove job type filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.tier && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary-700 text-primary-700 text-sm bg-primary-50">
                  <span>Tier: {filters.tier}</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('tier', '')}
                    className="hover:bg-primary-100 rounded-full p-0.5"
                    aria-label="Remove tier filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary-700 text-primary-700 text-sm bg-primary-50">
                  <span>
                    Status: {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('status', '')}
                    className="hover:bg-primary-100 rounded-full p-0.5"
                    aria-label="Remove status filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.ctcMin && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary-700 text-primary-700 text-sm bg-primary-50">
                  <span>Min CTC: ₹{filters.ctcMin} LPA</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('ctcMin', '')}
                    className="hover:bg-primary-100 rounded-full p-0.5"
                    aria-label="Remove min CTC filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.ctcMax && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary-700 text-primary-700 text-sm bg-primary-50">
                  <span>Max CTC: ₹{filters.ctcMax} LPA</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('ctcMax', '')}
                    className="hover:bg-primary-100 rounded-full p-0.5"
                    aria-label="Remove max CTC filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="font-body text-sm text-ink-600">
            {pagination.total === 0
              ? 'No drives found'
              : `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} drives`}
          </p>
          <div className="flex items-center gap-2">
            <label className="font-body text-sm text-ink-600">Sort by:</label>
            <select
              value={sort.sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 text-sm"
            >
              <option value="registrationDeadline">Deadline</option>
              <option value="title">Title</option>
              <option value="tier">Tier</option>
              <option value="createdAt">Date Posted</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSort(sort.sortBy)}
              aria-label={sort.sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            >
              <ChevronRight
                className={`w-4 h-4 ${sort.sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Drive Cards Grid */}
        {loading ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-6 bg-primary-100 rounded w-3/4 mb-3" />
                <div className="h-4 bg-primary-100 rounded w-1/2 mb-2" />
                <div className="h-4 bg-primary-100 rounded w-1/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-primary-100 rounded w-full" />
                  <div className="h-4 bg-primary-100 rounded w-full" />
                  <div className="h-4 bg-primary-100 rounded w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : drives.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              No drives found
            </h3>
            <p className="font-body text-ink-500 mb-4">
              {filters.search || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No drives are currently available for applications'}
            </p>
            {(filters.search || hasActiveFilters) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                icon={<Filter className="w-4 h-4" />}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drives.map((drive) => (
                <Card key={drive._id} className="hover:shadow-raised transition-shadow">
                  <div className="p-4 space-y-3">
                    {/* Header: Company + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-ink-500 uppercase tracking-wider mb-1">
                          {drive.company?.name || 'Unknown Company'}
                        </p>
                        <h3 className="font-heading text-base font-semibold text-ink-900 truncate">
                          {drive.title}
                        </h3>
                      </div>
                      <Badge tone={getStatusTone(drive.status)} size="sm">
                        {drive.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Job Type + Tier */}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 font-body text-ink-600">
                        <Briefcase className="w-3.5 h-3.5" />
                        {drive.jobType?.replace('-', ' ').replace('+', ' + ')}
                      </span>
                      <span className="inline-flex items-center gap-1 font-body text-ink-600">
                        <Target className="w-3.5 h-3.5" />
                        Tier {drive.tier}
                      </span>
                    </div>

                    {/* CTC */}
                    <div className="flex items-center gap-1 font-body text-sm font-semibold text-primary-700">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatCTC(drive.compensation?.ctcLpa)}
                      {drive.compensation?.stipend && drive.jobType === 'internship' && (
                        <span className="font-normal text-ink-500">
                          (Stipend: ₹{drive.compensation.stipend} LPA)
                        </span>
                      )}
                    </div>

                    {/* Meta: Deadline, Branches, Batches */}
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center gap-1 font-body text-xs text-ink-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Apply by: {formatDate(drive.registrationDeadline)}</span>
                      </div>

                      {drive.eligibilityCriteria?.branches?.length > 0 && (
                        <div className="flex items-center gap-1 font-body text-xs text-ink-500 flex-wrap">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {drive.eligibilityCriteria.branches.slice(0, 2).join(', ')}
                            {drive.eligibilityCriteria.branches.length > 2 && (
                              <span> +{drive.eligibilityCriteria.branches.length - 2} more</span>
                            )}
                          </span>
                        </div>
                      )}

                      {drive.eligibilityCriteria?.batches?.length > 0 && (
                        <div className="flex items-center gap-1 font-body text-xs text-ink-500">
                          <Target className="w-3.5 h-3.5" />
                          <span>Batches: {drive.eligibilityCriteria.batches.join(', ')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 font-body text-xs text-ink-500 flex-wrap">
                        <span>CGPA ≥ {drive.eligibilityCriteria?.minCgpa ?? '-'}</span>
                        <span className="text-ink-300">|</span>
                        <span>Backlogs ≤ {drive.eligibilityCriteria?.maxBacklogs ?? '-'}</span>
                        <span className="text-ink-300">|</span>
                        <span>10th ≥ {drive.eligibilityCriteria?.min10th ?? '-'}%</span>
                        <span className="text-ink-300">|</span>
                        <span>12th ≥ {drive.eligibilityCriteria?.min12th ?? '-'}%</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        fullWidth
                        icon={<ChevronRight className="w-4 h-4" />}
                        onClick={() => (window.location.href = `/drives/${drive._id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 px-4 pb-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-body text-sm text-ink-600">
                  Page {pagination.page} of {pagination.totalPages}
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
          </div>
        )}
      </Card>
    </div>
  )
}
