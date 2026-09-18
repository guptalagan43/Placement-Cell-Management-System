// Admin Applicants Page: Coordinator/TPO can view and update applicant round statuses for a drive.
// Traces to FR-APP-04, FR-APP-06.
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, Filter, X, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import * as applicationApi from '../api/application.api.js'
import * as driveApi from '../api/drive.api.js'
import * as roundApi from '../api/round.api.js'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'

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
  applied: 'neutral',
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

const ROUND_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'not_cleared', label: 'Not Cleared' },
  { value: 'absent', label: 'Absent' },
]

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const StatusSelect = ({ value, onChange, disabled, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 disabled:bg-surface/50 disabled:cursor-not-allowed ${className}`}
  >
    {ROUND_STATUS_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
)

export default function AdminApplicantsPage() {
  const { driveId } = useParams()
  const navigate = useNavigate()

  const [drive, setDrive] = useState(null)
  const [applications, setApplications] = useState([])
  const [rounds, setRounds] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '', round: '' })
  const [loading, setLoading] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [updatingRow, setUpdatingRow] = useState(null)

  const fetchDrive = useCallback(async () => {
    setDriveLoading(true)
    try {
      const res = await driveApi.getDriveById(driveId)
      setDrive(res.drive)
    } catch (err) {
      console.error('Failed to fetch drive:', err)
      setError('Failed to load drive details')
    } finally {
      setDriveLoading(false)
    }
  }, [driveId])

  const fetchRounds = useCallback(async () => {
    setRoundsLoading(true)
    try {
      const res = await roundApi.getRounds(driveId)
      setRounds(res.rounds)
    } catch (err) {
      console.error('Failed to fetch rounds:', err)
    } finally {
      setRoundsLoading(false)
    }
  }, [driveId])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      }
      const res = await applicationApi.getDriveApplications(driveId, params)
      setApplications(res.applications)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch applicants')
    } finally {
      setLoading(false)
    }
  }, [driveId, pagination.page, pagination.limit, filters])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchDrive()
    fetchRounds()
  }, [fetchDrive, fetchRounds])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({ status: '', round: '' })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleRoundStatusChange = async (application, round, newStatus) => {
    if (updatingRow === application._id) return
    setUpdatingRow(application._id)
    setError(null)
    setSuccess(null)
    try {
      await applicationApi.updateRoundStatus(application._id, {
        roundId: round._id,
        status: newStatus,
      })
      setSuccess(`Status updated for ${application.student?.rollNumber || 'student'}`)
      // Refetch applications to reflect the change
      fetchApplications()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setUpdatingRow(null)
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  if (driveLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-primary-100 rounded w-1/4 mb-2" />
          <div className="h-4 bg-primary-100 rounded w-1/2" />
        </div>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border animate-pulse">
            <div className="h-10 bg-primary-100 rounded w-1/3" />
          </div>
          <div className="p-4">
            <div className="h-64 bg-primary-50 rounded" />
          </div>
        </Card>
      </div>
    )
  }

  if (!drive) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Applicants</h1>
          <p className="font-body text-sm text-ink-600 mt-1">Drive not found</p>
        </div>
        <Card>
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              Drive Not Found
            </h3>
            <p className="font-body text-ink-500 mb-4">
              The requested drive could not be found or you don't have access to it.
            </p>
            <Button variant="outline" onClick={() => navigate('/drives-admin')}>
              Back to Drives
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/drives-admin')}
              className="p-1"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <span>Drives / </span>
            <span className="font-medium text-ink-900">{drive.title}</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Applicants</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            {drive.company?.name || drive.company} •{' '}
            {drive.jobType?.replace('-', ' ').replace('+', ' + ')} • Tier {drive.tier}
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
                placeholder="Search by roll number or name..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
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
              <select
                value={filters.round}
                onChange={(e) => handleFilterChange('round', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                disabled={roundsLoading || rounds.length === 0}
              >
                <option value="">All Rounds</option>
                {rounds.map((r) => (
                  <option key={r._id} value={r._id}>
                    Round {r.roundNumber}: {r.name}
                  </option>
                ))}
              </select>
              {(filters.status || filters.round || filters.search) && (
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
        </div>

        {loading && applications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              No Applicants Found
            </h3>
            <p className="font-body text-ink-500 mb-4">
              {filters.status || filters.round || filters.search
                ? 'No applicants match the current filters'
                : 'No students have applied to this drive yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Branch / Batch
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      CGPA / Backlogs
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Overall Status
                    </th>
                    {rounds.map((round) => (
                      <th
                        key={round._id}
                        className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider"
                      >
                        R{round.roundNumber}: {round.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Applied On
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-primary-50/50">
                      <td className="px-4 py-4 font-body text-sm text-ink-900">
                        <div className="font-medium">{app.student?.rollNumber || '-'}</div>
                        <div className="text-xs text-ink-500">
                          {app.student?.user?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        <div>{app.student?.branch || '-'}</div>
                        <div className="text-xs">{app.student?.batch || '-'}</div>
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600">
                        <div>CGPA: {app.student?.cgpaOverall ?? '-'}</div>
                        <div className="text-xs">
                          Backlogs: {app.student?.backlogsActive ?? '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={STATUS_TONES[app.overallStatus] || 'neutral'} size="sm">
                          {STATUS_LABELS[app.overallStatus] || app.overallStatus}
                        </Badge>
                      </td>
                      {rounds.map((round) => {
                        const roundStatus = app.roundStatuses?.find(
                          (rs) =>
                            rs.round?.toString() === round._id.toString() || rs.round === round._id
                        )
                        const currentStatus = roundStatus?.status || 'pending'
                        const isUpdating = updatingRow === app._id
                        return (
                          <td key={round._id} className="px-4 py-4">
                            <StatusSelect
                              value={currentStatus}
                              onChange={(newStatus) =>
                                handleRoundStatusChange(app, round, newStatus)
                              }
                              disabled={isUpdating}
                              className="min-w-[140px]"
                            />
                            {roundStatus?.updatedAt && (
                              <div className="font-body text-xs text-ink-400 mt-1">
                                Updated {formatDate(roundStatus.updatedAt)}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-4 font-body text-sm text-ink-600 text-right">
                        {formatDate(app.appliedAt)}
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
                  {pagination.total} applicants
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
    </div>
  )
}
