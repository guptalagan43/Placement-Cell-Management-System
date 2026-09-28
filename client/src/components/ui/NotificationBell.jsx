// Notification Bell: bell icon with unread count badge and dropdown panel.
// Traces to FR-NOT-02, design.md §6 top-bar pattern.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Circle, Check, ExternalLink, Loader2 } from 'lucide-react'
import * as notificationApi from '../../api/notification.api.js'
import Button from './Button.jsx'
import Card from './Card.jsx'
import Badge from './Badge.jsx'
import { cn } from '../../lib/cn.js'

const TYPE_ICONS = {
  drive_published: '📢',
  application_confirmed: '✅',
  shortlisted: '🎯',
  round_rescheduled: '🔄',
  results_declared: '📊',
  offer_issued: '💼',
  deadline_approaching: '⏰',
  general: '📋',
}

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
  return then.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount()
      setUnreadCount(res.count || 0)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await notificationApi.getMyNotifications({ limit: 10 })
      setNotifications(res.notifications || [])
    } catch (err) {
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Polling for unread count
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await notificationApi.markAsRead(notification._id)
        setUnreadCount((prev) => Math.max(0, prev - 1))
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        )
      } catch (err) {
        console.error('Failed to mark as read:', err)
      }
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link)
    }
    setIsOpen(false)
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
    setIsOpen(false)
  }

  const hasUnread = unreadCount > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative"
      >
        <Bell className="w-5 h-5 text-ink-600" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger flex items-center justify-center text-xs font-semibold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 z-50 animate-in fade-in-0 zoom-in-95">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-heading text-base font-semibold text-ink-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-700" />
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-ink-500" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-700 mx-auto mb-2" />
                  <p className="font-body text-sm text-ink-500">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="font-body text-sm text-danger">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchNotifications} className="mt-2">
                    Retry
                  </Button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-ink-300 mx-auto mb-3" />
                  <h4 className="font-heading text-base font-semibold text-ink-900 mb-1">
                    No Notifications
                  </h4>
                  <p className="font-body text-sm text-ink-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-ink-50/50">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsOpen(false)
                  navigate('/notifications')
                }}
              >
                View All Notifications
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification, onClick }) {
  const Icon = TYPE_ICONS[notification.type] || TYPE_ICONS.general
  const typeLabel = TYPE_LABELS[notification.type] || 'General'

  return (
    <div
      className={cn(
        'p-4 cursor-pointer transition-colors',
        notification.read
          ? 'bg-surface hover:bg-primary-50/50'
          : 'bg-primary-50/50 hover:bg-primary-100/50'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg">
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'font-heading text-sm font-semibold text-ink-900 truncate',
                !notification.read && 'font-bold'
              )}
            >
              {typeLabel}
            </h4>
            {!notification.read && (
              <Circle className="w-2 h-2 flex-shrink-0 mt-1.5 text-primary-700" />
            )}
          </div>
          <p
            className={cn(
              'font-body text-sm mt-1 line-clamp-2',
              notification.read ? 'text-ink-600' : 'text-ink-900'
            )}
          >
            {notification.message}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
            <span>{formatTimeAgo(notification.createdAt)}</span>
            {notification.link && (
              <span className="flex items-center gap-1 text-primary-700 hover:underline">
                <ExternalLink className="w-3 h-3" />
                View
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { NotificationBell }
