import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X, Loader2, Filter, ChevronDown } from 'lucide-react'
import * as notificationApi from '../api/notification.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import { cn } from '../lib/cn.js'

const TYPE_LABELS = {
  drive_published: 'New Drive',
  application_confirmed: 'Application Confirmed',
  shortlisted: 'Shortlisted',
  round_rescheduled: 'Round Rescheduled',
  results_declared: 'Results Declared',
  offer_issued: 'Offer Issued',
  deadline_approaching: 'Deadline Approaching',
  general: 'General',
}

const TYPE_TONES = {
  drive_published: 'info',
  application_confirmed: 'success',
  shortlisted: 'warning',
  round_rescheduled: 'info',
  results_declared: 'neutral',
  offer_issued: 'success',
  deadline_approaching: 'warning',
  general: 'neutral',
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ read: '', type: '' })
  const [filterOpen, setFilterOpen] = useState(false)
  const initialLoadRef = useRef(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: pagination.page, limit: pagination.limit }
      if (filters.read) params.read = filters.read
      if (filters.type) params.type = filters.type

      const res = await notificationApi.getMyNotifications(params)
      setNotifications(res.notifications || [])
      setPagination((prev) => ({ ...prev, ...res.pagination }))
    } catch (err) {
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Notifications</h1>
          <p className="font-body text-sm text-ink-500 mt-1">Manage your in-app notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search notifications..."
                value={filters.type || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                leftIcon={<Filter className="w-4 h-4" />}
              />
            </div>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-raised z-10 p-2">
                  <label className="block font-body text-xs font-medium text-ink-700 mb-2">
                    Read Status
                  </label>
                  <div className="flex flex-col gap-1">
                    {['', 'true', 'false'].map((value) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="readFilter"
                          value={value}
                          checked={filters.read === value}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, read: e.target.value || '' }))
                          }
                          className="text-primary-700"
                        />
                        <span className="font-body text-sm text-ink-700 capitalize">
                          {value === 'true' ? 'Read' : value === 'false' ? 'Unread' : 'All'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-700 mx-auto mb-2" />
              <p className="font-body text-sm text-ink-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-danger mx-auto mb-3" />
              <p className="font-body text-sm text-danger">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchNotifications} className="mt-2">
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-ink-300 mx-auto mb-3" />
              <h3 className="font-heading text-base font-semibold text-ink-900 mb-1">
                No Notifications
              </h3>
              <p className="font-body text-sm text-ink-500">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={handleMarkAsRead}
                navigate={navigate}
              />
            ))
          )}
        </div>

        {pagination.totalPages > 1 && !loading && !error && (
          <div className="p-4 border-t border-border flex items-center justify-between gap-4">
            <p className="font-body text-sm text-ink-500">
              Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function NotificationItem({ notification, onMarkRead, navigate }) {
  const typeLabel = TYPE_LABELS[notification.type] || 'General'
  const typeTone = TYPE_TONES[notification.type] || 'neutral'

  return (
    <div
      className={cn(
        'p-4 cursor-pointer transition-colors',
        notification.read
          ? 'bg-surface hover:bg-primary-50/50'
          : 'bg-primary-50/50 hover:bg-primary-100/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-primary-100 text-primary-700">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4
                className={cn(
                  'font-heading text-sm font-semibold text-ink-900',
                  !notification.read && 'font-bold'
                )}
              >
                {typeLabel}
              </h4>
              <Badge tone={typeTone} size="sm">
                {typeLabel}
              </Badge>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary-700 flex-shrink-0 mt-2" />
              )}
            </div>
            <span className="font-body text-xs text-ink-500 whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>
          <p
            className={cn(
              'font-body text-sm mt-1 line-clamp-3',
              notification.read ? 'text-ink-600' : 'text-ink-900'
            )}
          >
            {notification.message}
          </p>
          {notification.link && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(notification.link)
                }}
              >
                View Details
              </Button>
            </div>
          )}
          {!notification.read && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(notification._id)
                }}
              >
                <Check className="w-3 h-3 mr-1" />
                Mark as read
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
