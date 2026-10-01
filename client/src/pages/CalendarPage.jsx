// Calendar Page: Student-facing aggregated calendar with conflict warnings and ICS export.
// Traces to FR-SCH-03, FR-SCH-05.
import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import * as calendarApi from '../api/calendar.api.js'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'

const TYPE_LABELS = {
  round: 'Round',
  info_session: 'PPT',
}

const TYPE_ICONS = {
  round: Calendar,
  info_session: Video,
}

const TYPE_TONES = {
  round: 'info',
  info_session: 'warning',
}

const MODE_LABELS = {
  online: 'Online',
  offline: 'Offline',
}

const MODE_ICONS = {
  online: Video,
  offline: MapPin,
}

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTimeOnly = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const groupEventsByDate = (events) => {
  const groups = {}
  events.forEach((event) => {
    const date = new Date(event.startTime).toDateString()
    if (!groups[date]) {
      groups[date] = {
        date,
        events: [],
      }
    }
    groups[date].events.push(event)
  })
  return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date))
}

const generateICS = (events) => {
  const now = new Date()
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SKIT T&P Cell//Placement Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SKIT Placement Calendar',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ]

  events.forEach((event) => {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)

    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const uid = `${event.id}@skit-placement`
    const summary = `${TYPE_LABELS[event.type]}: ${event.title} - ${event.company}`
    const description = [
      `Drive: ${event.driveTitle}`,
      `Company: ${event.company}`,
      `Type: ${TYPE_LABELS[event.type]}`,
      `Mode: ${MODE_LABELS[event.mode]}`,
      event.venue && `Venue: ${event.venue}`,
      event.meetingLink && `Meeting Link: ${event.meetingLink}`,
      event.instructions && `Instructions: ${event.instructions}`,
      event.mandatory && 'Mandatory: Yes',
      event.isConflict && '⚠️ CONFLICT DETECTED: This event overlaps with another event',
    ]
      .filter(Boolean)
      .join('\\n')

    const location = event.mode === 'offline' ? event.venue : event.meetingLink || ''

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : '',
      'END:VEVENT'
    )
  })

  icsLines.push('END:VCALENDAR')

  return icsLines.join('\r\n')
}

const downloadICS = (events, filename = 'skit-placement-calendar.ics') => {
  const icsContent = generateICS(events)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedDates, setExpandedDates] = useState(new Set())
  const [filterType, setFilterType] = useState('all')
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const doFetch = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {}
        if (dateRange.startDate) params.startDate = new Date(dateRange.startDate).toISOString()
        if (dateRange.endDate) params.endDate = new Date(dateRange.endDate).toISOString()
        const res = await calendarApi.getMyCalendar(params)
        if (mounted) {
          setEvents(res.events || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to fetch calendar')
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
  }, [dateRange.startDate, dateRange.endDate])

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    return events.filter((e) => e.type === filterType)
  }, [events, filterType])

  const groupedEvents = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents])

  const conflictEvents = useMemo(() => events.filter((e) => e.isConflict), [events])

  const hasConflicts = conflictEvents.length > 0

  const handleDateRangeChange = (key, value) => {
    setDateRange((prev) => ({ ...prev, [key]: value }))
  }

  const handleExportICS = async () => {
    if (events.length === 0) return
    setExportLoading(true)
    try {
      downloadICS(events)
    } finally {
      setExportLoading(false)
    }
  }

  const toggleDateExpanded = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const clearMessages = () => {
    setError(null)
  }

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Calendar</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            View all your upcoming interview rounds and info sessions
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
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Calendar</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            View all your upcoming interview rounds and info sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasConflicts && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-warning bg-opacity-10 border border-warning rounded-full">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="font-body text-sm font-medium text-warning">
                {conflictEvents.length} conflict{conflictEvents.length > 1 ? 's' : ''} detected
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportICS}
            disabled={events.length === 0 || exportLoading}
            icon={
              exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )
            }
          >
            Export .ics
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-4 flex items-center justify-between"
          role="alert"
        >
          <span className="font-body text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            <span className="hidden sm:inline">Dismiss</span>
            <span className="sm:hidden">
              <ChevronDown className="w-4 h-4" />
            </span>
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All Events
              </Button>
              <Button
                variant={filterType === 'round' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType('round')}
              >
                Rounds
              </Button>
              <Button
                variant={filterType === 'info_session' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType('info_session')}
              >
                PPTs
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <div className="relative flex-1 max-w-xs sm:max-w-md">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="Start date"
                />
              </div>
              <div className="relative flex-1 max-w-xs sm:max-w-md">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                  placeholder="End date"
                />
              </div>
              {(dateRange.startDate || dateRange.endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ startDate: '', endDate: '' })}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading && filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              No Events Found
            </h3>
            <p className="font-body text-ink-500 mb-4">
              {filterType !== 'all'
                ? `No ${filterType === 'round' ? 'rounds' : 'PPTs'} match the current filter`
                : "You don't have any upcoming rounds or info sessions"}
            </p>
            {!filterType && (
              <Button variant="primary" onClick={() => (window.location.href = '/drives')}>
                Browse Drives
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groupedEvents.map((group) => {
              const isExpanded = expandedDates.has(group.date)
              return (
                <div key={group.date} className="bg-surface">
                  <button
                    onClick={() => toggleDateExpanded(group.date)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary-50/50 transition-colors text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary-700" />
                      <div>
                        <p className="font-heading text-base font-semibold text-ink-900">
                          {formatDateOnly(group.date + 'T00:00:00')}
                        </p>
                        <p className="font-body text-xs text-ink-500">
                          {group.events.length} event{group.events.length > 1 ? 's' : ''}
                          {group.events.some((e) => e.isConflict) && (
                            <span className="ml-2 text-warning font-medium">⚠️ Has conflicts</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral" size="xs">
                        {group.events.filter((e) => e.type === 'round').length} Rounds
                      </Badge>
                      <Badge tone="warning" size="xs">
                        {group.events.filter((e) => e.type === 'info_session').length} PPTs
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-ink-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-ink-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 animate-in fade-in-0 duration-200">
                      <div className="pt-4 space-y-3">
                        {group.events.map((event) => (
                          <div
                            key={event.id}
                            className={`p-4 rounded-lg border ${
                              event.isConflict
                                ? 'bg-danger/5 border-danger/30'
                                : 'bg-surface border-border'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100">
                                {(() => {
                                  const Icon = TYPE_ICONS[event.type] || Calendar
                                  return <Icon className="w-6 h-6 text-primary-700" />
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge tone={TYPE_TONES[event.type]} size="xs">
                                    {TYPE_LABELS[event.type]}
                                  </Badge>
                                  {event.isConflict && (
                                    <Badge tone="danger" size="xs" className="animate-pulse">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Conflict
                                    </Badge>
                                  )}
                                  {event.mandatory && (
                                    <Badge tone="danger" size="xs">
                                      Mandatory
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-heading text-base font-semibold text-ink-900 truncate">
                                  {event.title}
                                </h4>
                                <p className="font-body text-sm text-ink-600">
                                  {event.company} · {event.driveTitle}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                  <div className="flex items-center gap-1.5 text-ink-600">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {formatTimeOnly(event.startTime)} -{' '}
                                      {formatTimeOnly(event.endTime)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-ink-600">
                                    {(() => {
                                      const Icon = MODE_ICONS[event.mode] || MapPin
                                      return <Icon className="w-4 h-4" />
                                    })()}
                                    <span>{MODE_LABELS[event.mode]}</span>
                                  </div>
                                  {event.mode === 'offline' && event.venue && (
                                    <div className="flex items-center gap-1.5 text-ink-600">
                                      <MapPin className="w-4 h-4" />
                                      <span className="truncate max-w-[200px]">{event.venue}</span>
                                    </div>
                                  )}
                                  {event.mode === 'online' && event.meetingLink && (
                                    <div className="flex items-center gap-1.5 text-ink-600">
                                      <Video className="w-4 h-4" />
                                      <a
                                        href={event.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-700 hover:underline truncate max-w-[200px]"
                                      >
                                        Join Meeting
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {event.instructions && (
                                  <p className="mt-2 font-body text-xs text-ink-500 italic">
                                    {event.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
