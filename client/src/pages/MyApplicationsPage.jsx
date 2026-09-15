// My Applications Page: Student can track all their applications.
// Traces to FR-APP-03.
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  DollarSign,
  Calendar,
  Target,
  Building2,
  ArrowLeft,
  Filter,
  ChevronRight,
  X,
  Loader2,
  Download,
  AlertTriangle,
} from 'lucide-react'
import * as applicationApi from '../api/application.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import EligibilityBadge from '../components/ui/EligibilityBadge.jsx'

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  selected: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted',
  offer_declined: 'Offer Declined',
}

const STATUS_TONES = {
  applied: 'info',
  shortlisted: 'warning',
  selected: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
  offer_issued: 'warning',
  offer_accepted: 'success',
  offer_declined: 'danger',
}

const ROUND_STATUS_LABELS = {
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  cleared: 'Cleared',
  not_cleared: 'Not Cleared',
  absent: 'Absent',
}

const ROUND_STATUS_TONES = {
  pending: 'neutral',
  shortlisted: 'warning',
  cleared: 'success',
  not_cleared: 'danger',
  absent: 'danger',
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

export default function MyApplicationsPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '' })
  const [sort] = useState({ sortBy: 'appliedAt', sortOrder: 'desc' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawingApp, setWithdrawingApp] = useState(null)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)
  const fetchApplications = useCallback(async () => {
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
      const res = await applicationApi.getMyApplications(params)
      setApplications(res.applications)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters])

  useEffect(() => {
    let mounted = true
    const doFetch = async () => {
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
        const res = await applicationApi.getMyApplications(params)
        if (mounted) {
          setApplications(res.applications)
          setPagination(res.pagination)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to fetch applications')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    doFetch()
    return () => {
      mounted = false
    }
  }, [pagination.page, pagination.limit, sort, filters])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({ status: '' })
  }

  const openWithdrawModal = (application) => {
    setWithdrawingApp(application)
    setWithdrawError(null)
    setWithdrawModalOpen(true)
  }

  const closeWithdrawModal = () => {
    setWithdrawModalOpen(false)
    setWithdrawingApp(null)
    setWithdrawError(null)
  }

  const handleWithdraw = async () => {
    if (!withdrawingApp) return
    setWithdrawLoading(true)
    setWithdrawError(null)
    try {
      await applicationApi.withdrawApplication(withdrawingApp._id)
      closeWithdrawModal()
      fetchApplications() // Refresh list
    } catch (err) {
      setWithdrawError(err.message || 'Failed to withdraw application')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const clearMessages = () => {
    setError(null)
  }

  const canWithdraw = (app) => {
    const terminalStatuses = [
      'withdrawn',
      'selected',
      'rejected',
      'offer_issued',
      'offer_accepted',
      'offer_declined',
    ]
    return (
      app.drive?.status === 'registration_open' && !terminalStatuses.includes(app.overallStatus)
    )
  }

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Applications</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Track the status of all your drive applications
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-6 bg-primary-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-primary-100 rounded w-1/2 mb-2" />
              <div className="space-y-3">
                <div className="h-4 bg-primary-100 rounded w-full" />
                <div className="h-4 bg-primary-100 rounded w-full" />
                <div className="h-4 bg-primary-100 rounded w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Applications</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Track the status of all your drive applications
          </p>
        </div>
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

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Status</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="offer_issued">Offer Issued</option>
                <option value="offer_accepted">Offer Accepted</option>
                <option value="offer_declined">Offer Declined</option>
              </select>
            </div>
            {filters.status && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                icon={<X className="w-4 h-4" />}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loading && applications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              No Applications Found
            </h3>
            <p className="font-body text-ink-500 mb-4">
              {filters.status
                ? 'No applications match the current filter'
                : "You haven't applied to any drives yet"}
            </p>
            {!filters.status && (
              <Button variant="primary" onClick={() => navigate('/drives')}>
                Browse Drives
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Drive
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Job Type
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      CTC
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Applied On
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Overall Status
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Round Statuses
                    </th>
                    <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-primary-50/50">
                      <td className="px-4 py-4 font-body text-sm text-ink-900">
                        {app.drive?.title || '-'}
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        {app.drive?.company?.name || '-'}
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        {app.drive?.jobType?.replace('-', ' ').replace('+', ' + ') || '-'}
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        {formatCTC(app.drive?.compensation?.ctcLpa)}
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        {formatDate(app.appliedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={STATUS_TONES[app.overallStatus] || 'neutral'} size="sm">
                          {STATUS_LABELS[app.overallStatus] || app.overallStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {app.roundStatuses?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {app.roundStatuses.map((rs, idx) => (
                              <Badge
                                key={rs.round || idx}
                                tone={ROUND_STATUS_TONES[rs.status] || 'neutral'}
                                size="xs"
                              >
                                {ROUND_STATUS_LABELS[rs.status] || rs.status}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="font-body text-xs text-ink-400">No rounds</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/drives/${app.drive?._id}`)}
                            aria-label={`View drive ${app.drive?.title}`}
                          >
                            <Briefcase className="w-4 h-4" />
                          </Button>
                          {canWithdraw(app) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openWithdrawModal(app)}
                              aria-label={`Withdraw application for ${app.drive?.title}`}
                              className="text-danger hover:bg-danger/10"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="px-4 py-4 border-t border-border flex items-center justify-between">
                <p className="font-body text-sm text-ink-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} applications
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

      {/* Withdraw Confirmation Modal */}
      {withdrawModalOpen && withdrawingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-raised w-full max-w-md">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Withdraw Application
              </h2>
              <Button variant="ghost" size="icon" onClick={closeWithdrawModal} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-body text-ink-600">
                Are you sure you want to withdraw your application for{' '}
                <strong>{withdrawingApp.drive?.title}</strong> at{' '}
                <strong>{withdrawingApp.drive?.company?.name}</strong>?
              </p>
              <p className="font-body text-sm text-ink-500">
                This action cannot be undone. You will no longer be considered for this drive.
              </p>
              {withdrawError && (
                <div
                  className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-3"
                  role="alert"
                >
                  <span className="font-body text-sm">{withdrawError}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={closeWithdrawModal} disabled={withdrawLoading}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleWithdraw} disabled={withdrawLoading}>
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
