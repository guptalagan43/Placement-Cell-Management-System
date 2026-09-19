// Audit Log Page: TPO can view and filter the full history of administrative actions.
// Traces to FR-AUD-02.
import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Activity,
  Eye,
} from 'lucide-react'
import * as auditLogApi from '../api/auditLog.api.js'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'

const ACTION_LABELS = {
  eligibility_override: 'Eligibility Override',
  round_status_update: 'Round Status Update',
  bulk_shortlist_upload: 'Bulk Shortlist Upload',
  drive_status_change: 'Drive Status Change',
  drive_clone: 'Drive Clone',
  company_create: 'Company Create',
  company_update: 'Company Update',
  company_delete: 'Company Delete',
  offer_issue: 'Offer Issue',
  offer_response: 'Offer Response',
  rules_edit: 'Rules Edit',
  blacklist_flag_change: 'Blacklist Flag Change',
  student_profile_edit: 'Student Profile Edit',
}

const ACTION_TONES = {
  eligibility_override: 'warning',
  round_status_update: 'info',
  bulk_shortlist_upload: 'info',
  drive_status_change: 'warning',
  drive_clone: 'neutral',
  company_create: 'success',
  company_update: 'neutral',
  company_delete: 'danger',
  offer_issue: 'success',
  offer_response: 'neutral',
  rules_edit: 'warning',
  blacklist_flag_change: 'danger',
  student_profile_edit: 'neutral',
}

const ENTITY_TYPE_LABELS = {
  Application: 'Application',
  Drive: 'Drive',
  Company: 'Company',
  Round: 'Round',
  InfoSession: 'Info Session',
  Offer: 'Offer',
  RulesPage: 'Rules Page',
  StudentProfile: 'Student Profile',
  User: 'User',
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ActionBadge = ({ action }) => (
  <Badge tone={ACTION_TONES[action] || 'neutral'} size="sm">
    {ACTION_LABELS[action] || action}
  </Badge>
)

const EntityTypeBadge = ({ entityType }) => (
  <Badge tone="neutral" size="sm" variant="outline">
    {ENTITY_TYPE_LABELS[entityType] || entityType}
  </Badge>
)

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    dateFrom: '',
    dateTo: '',
    targetEntityType: '',
    targetEntityId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [actionTypes, setActionTypes] = useState([])
  const [actors, setActors] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      }
      const res = await auditLogApi.getAuditLogs(params)
      setAuditLogs(res.auditLogs)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [actionsRes, actorsRes] = await Promise.all([
        auditLogApi.getActionTypes(),
        auditLogApi.getActors(),
      ])
      setActionTypes(actionsRes.actions || [])
      setActors(actorsRes.actors || [])
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchAuditLogs()
    fetchFilterOptions()
  }, [fetchAuditLogs, fetchFilterOptions])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const clearFilters = () => {
    setFilters({
      actor: '',
      action: '',
      dateFrom: '',
      dateTo: '',
      targetEntityType: '',
      targetEntityId: '',
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const openDetailModal = (log) => {
    setSelectedLog(log)
    setDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setSelectedLog(null)
    setDetailModalOpen(false)
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const hasActiveFilters =
    filters.actor || filters.action || filters.dateFrom || filters.dateTo || filters.targetEntityType || filters.targetEntityId

  if (loading && auditLogs.length === 0) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink-900">Audit Log</h1>
        <p className="font-body text-sm text-ink-600 mt-1">
          Immutable record of all administrative actions across the system
        </p>
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
                placeholder="Search by target entity ID..."
                value={filters.targetEntityId || ''}
                onChange={(e) => handleFilterChange('targetEntityId', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.actor}
                onChange={(e) => handleFilterChange('actor', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[200px]"
              >
                <option value="">All Actors</option>
                {actors.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.email}) - {a.role}
                  </option>
                ))}
              </select>

              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[200px]"
              >
                <option value="">All Actions</option>
                {actionTypes.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action] || action}
                  </option>
                ))}
              </select>

              <select
                value={filters.targetEntityType}
                onChange={(e) => handleFilterChange('targetEntityType', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[180px]"
              >
                <option value="">All Entity Types</option>
                {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[160px]"
                  placeholder="From"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 min-w-[160px]"
                  placeholder="To"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} icon={<X className="w-4 h-4" />}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading && auditLogs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">No Audit Logs Found</h3>
            <p className="font-body text-ink-500 mb-4">
              {hasActiveFilters ? 'No audit logs match the current filters' : 'No administrative actions have been recorded yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Actor</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Target Entity</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-primary-50/50 cursor-pointer" onClick={() => openDetailModal(log)}>
                      <td className="px-4 py-4 font-body text-sm text-ink-900 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-4">
                        <div className="font-body text-sm text-ink-900">{log.actor?.name || 'Unknown'}</div>
                        <div className="font-body text-xs text-ink-500">{log.actor?.email || '-'}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge tone="neutral" size="xs">{log.actor?.role || '-'}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <EntityTypeBadge entityType={log.target?.entityType} />
                          <span className="font-body text-sm text-ink-600 font-mono text-xs">
                            {log.target?.entityId?.toString().slice(-8) || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-body text-sm text-ink-600 max-w-xs truncate" title={log.reason}>
                        {log.reason || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetailModal(log); }} aria-label="View details">
                          <Eye className="w-4 h-4" />
                        </Button>
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
                  {pagination.total} entries
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

      {/* Detail Modal */}
      {detailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-raised w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Audit Log Details</h2>
              <Button variant="ghost" size="icon" onClick={closeDetailModal} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">ID</label>
                  <code className="font-mono text-xs text-ink-900 bg-primary-50 px-2 py-1 rounded break-all">{selectedLog._id}</code>
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Timestamp</label>
                  <div className="font-body text-sm text-ink-900">{formatDate(selectedLog.timestamp)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Actor</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-ink-400" />
                    <div>
                      <div className="font-body text-sm text-ink-900">{selectedLog.actor?.name || 'Unknown'}</div>
                      <div className="font-body text-xs text-ink-500">{selectedLog.actor?.email || '-'}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Actor Role</label>
                  <Badge tone="neutral" size="sm">{selectedLog.actor?.role || '-'}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Action</label>
                  <ActionBadge action={selectedLog.action} />
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Target Entity</label>
                  <div className="flex items-center gap-2">
                    <EntityTypeBadge entityType={selectedLog.target?.entityType} />
                    <code className="font-mono text-sm text-ink-600">{selectedLog.target?.entityId || '-'}</code>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Reason</label>
                <div className="font-body text-sm text-ink-900 bg-primary-50 p-3 rounded-md whitespace-pre-wrap">{selectedLog.reason || '-'}</div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">Metadata</label>
                  <pre className="font-mono text-xs text-ink-600 bg-primary-50 p-3 rounded-md overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}