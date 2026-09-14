// Drive Detail Page (Student-Facing): Shows full drive details, eligibility, rounds, info sessions, and apply action.
// Traces to FR-DRV-05, FR-SCH-01, FR-SCH-02.
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  DollarSign,
  Calendar,
  Target,
  Building2,
  ArrowLeft,
  Download,
  Clock,
  MapPin,
  Video,
  AlertCircle,
  CheckCircle,
  Users,
  Megaphone,
} from 'lucide-react'
import * as driveApi from '../api/drive.api.js'
import * as roundApi from '../api/round.api.js'
import * as infoSessionApi from '../api/infoSession.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import EligibilityBadge from '../components/ui/EligibilityBadge.jsx'

const JOB_TYPES = {
  'full-time': 'Full-time',
  internship: 'Internship',
  'full-time+internship': 'Full-time + Internship',
}

const MODE_LABELS = {
  online: 'Online',
  offline: 'Offline',
}

const MODE_ICONS = {
  online: Video,
  offline: MapPin,
}

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
    month: 'long',
    day: 'numeric',
  })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCTC = (ctcLpa) => {
  if (!ctcLpa && ctcLpa !== 0) return '-'
  return `₹${ctcLpa} LPA`
}

export default function DriveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [drive, setDrive] = useState(null)
  const [rounds, setRounds] = useState([])
  const [infoSessions, setInfoSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDriveDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const [driveRes, roundsRes, infoSessionsRes] = await Promise.all([
          driveApi.getDriveByIdForStudent(id),
          roundApi.getRoundsForStudent(id),
          infoSessionApi.getInfoSessionsForStudent(id),
        ])
        setDrive(driveRes.drive)
        setRounds(roundsRes.rounds ?? [])
        setInfoSessions(infoSessionsRes.infoSessions ?? [])
      } catch (err) {
        if (err.status === 404) {
          setError('Drive not found')
        } else {
          setError(err.message || 'Failed to load drive details')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDriveDetails()
  }, [id])

  const isEligible = drive?.eligibility?.eligible === true
  const eligibilityReasons = drive?.eligibility?.reasonMessages ?? []
  const registrationOpen = drive?.status === 'registration_open'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900 animate-pulse">
              Loading...
            </h1>
          </div>
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">Drive Not Found</h1>
          </div>
        </div>
        <Card>
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">{error}</h3>
            <p className="font-body text-ink-500 mb-6">
              This drive may not be available for applications yet.
            </p>
            <Button variant="primary" onClick={() => navigate('/drives')}>
              Back to Drives
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!drive) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="font-body text-sm text-ink-500">Back to Drives</p>
          <h1 className="font-heading text-2xl font-bold text-ink-900">{drive.title}</h1>
        </div>
      </div>

      {/* Drive Header Card */}
      <Card className="overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Company & Status Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-primary-700" />
              </div>
              <div>
                <p className="font-body text-sm text-ink-500 mb-1">
                  {drive.company?.name || 'Unknown Company'}
                </p>
                <h2 className="font-heading text-xl font-semibold text-ink-900">{drive.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={getStatusTone(drive.status)} size="lg">
                {drive.status.replace('_', ' ')}
              </Badge>
              <EligibilityBadge
                eligible={drive.eligibility?.eligible ?? null}
                reasons={drive.eligibility?.reasons ?? []}
                reasonMessages={drive.eligibility?.reasonMessages ?? []}
                size="md"
              />
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-border pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary-700" />
              </div>
              <div>
                <p className="font-body text-xs text-ink-500">Tier</p>
                <p className="font-heading text-lg font-semibold text-ink-900">Tier {drive.tier}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="font-body text-xs text-ink-500">CTC</p>
                <p className="font-heading text-lg font-semibold text-green-700">
                  {formatCTC(drive.compensation?.ctcLpa)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-body text-xs text-ink-500">Apply By</p>
                <p className="font-heading text-lg font-semibold text-ink-900 truncate">
                  {formatDate(drive.registrationDeadline)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="font-body text-xs text-ink-500">Job Type</p>
                <p className="font-heading text-lg font-semibold text-ink-900">
                  {JOB_TYPES[drive.jobType] || drive.jobType}
                </p>
              </div>
            </div>
          </div>

          {/* Vacancies & Description */}
          <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-6">
            <div>
              <p className="font-body text-xs text-ink-500 mb-1">Vacancies</p>
              <p className="font-heading text-xl font-semibold text-ink-900">{drive.vacancies}</p>
            </div>
            {drive.description && (
              <div className="sm:col-span-2">
                <p className="font-body text-xs text-ink-500 mb-1">Description</p>
                <p className="font-body text-ink-700">{drive.description}</p>
              </div>
            )}
          </div>

          {/* Eligibility Criteria */}
          {drive.eligibilityCriteria && (
            <div className="border-t border-border pt-6">
              <h3 className="font-heading text-base font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary-700" />
                Eligibility Criteria
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {drive.eligibilityCriteria.branches?.length > 0 && (
                  <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                    <Building2 className="w-4 h-4 text-ink-500 flex-shrink-0" />
                    <span className="truncate">
                      {drive.eligibilityCriteria.branches.join(', ')}
                    </span>
                  </div>
                )}
                {drive.eligibilityCriteria.batches?.length > 0 && (
                  <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                    <Target className="w-4 h-4 text-ink-500" />
                    <span>Batches: {drive.eligibilityCriteria.batches.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                  <Target className="w-4 h-4 text-ink-500" />
                  <span>Min CGPA: {drive.eligibilityCriteria.minCgpa}</span>
                </div>
                <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                  <AlertCircle className="w-4 h-4 text-ink-500" />
                  <span>Max Backlogs: {drive.eligibilityCriteria.maxBacklogs}</span>
                </div>
                <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                  <Target className="w-4 h-4 text-ink-500" />
                  <span>10th: ≥ {drive.eligibilityCriteria.min10th}%</span>
                </div>
                <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                  <Target className="w-4 h-4 text-ink-500" />
                  <span>12th: ≥ {drive.eligibilityCriteria.min12th}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Compensation Details */}
          {drive.compensation && (drive.compensation.stipend || drive.compensation.details) && (
            <div className="border-t border-border pt-6">
              <h3 className="font-heading text-base font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary-700" />
                Compensation Details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {drive.compensation.stipend && (
                  <div className="flex items-center gap-2 font-body text-sm text-ink-700">
                    <DollarSign className="w-4 h-4 text-ink-500" />
                    <span>Stipend: ₹{drive.compensation.stipend} LPA</span>
                  </div>
                )}
                {drive.compensation.details && (
                  <div className="flex items-center gap-2 font-body text-sm text-ink-700 sm:col-span-2">
                    <DollarSign className="w-4 h-4 text-ink-500" />
                    <span>{drive.compensation.details}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JD Download Placeholder */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-ink-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary-700" />
                Job Description
              </h3>
              <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                Download JD
              </Button>
            </div>
            <p className="font-body text-sm text-ink-500 mt-2">
              Job description download will be available once the company uploads the document.
            </p>
          </div>
        </div>
      </Card>

      {/* Eligibility Summary */}
      <Card>
        <div className="p-6">
          <h2 className="font-heading text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary-700" />
            Your Eligibility
          </h2>
          <EligibilityBadge
            eligible={drive.eligibility?.eligible ?? null}
            reasons={drive.eligibility?.reasons ?? []}
            reasonMessages={drive.eligibility?.reasonMessages ?? []}
            size="lg"
          />
          {!isEligible && eligibilityReasons.length > 0 && (
            <div className="mt-4 p-4 bg-danger bg-opacity-5 rounded-lg border border-danger/20">
              <h4 className="font-body text-sm font-semibold text-danger mb-2">Reasons:</h4>
              <ul className="font-body text-sm text-ink-700 space-y-1">
                {eligibilityReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Rounds */}
      <Card>
        <div className="p-6">
          <h2 className="font-heading text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-700" />
            Selection Rounds
          </h2>
          {rounds.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-ink-300 mx-auto mb-4" />
              <h3 className="font-heading text-base font-semibold text-ink-900 mb-1">
                No Rounds Scheduled
              </h3>
              <p className="font-body text-ink-500">
                Rounds will appear here once scheduled by the placement cell.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rounds.map((round) => {
                const ModeIcon = MODE_ICONS[round.mode] || Clock
                return (
                  <div
                    key={round._id}
                    className="border border-border rounded-lg p-4 hover:bg-primary-50/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-heading text-lg font-bold text-primary-700 flex-shrink-0">
                          {round.roundNumber}
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-semibold text-ink-900">
                            {round.name}
                          </h3>
                          <p className="font-body text-sm text-ink-500">
                            {MODE_LABELS[round.mode] || round.mode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:ml-auto">
                        <div className="flex items-center gap-2 font-body text-sm text-ink-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDateTime(round.dateTime)}</span>
                        </div>
                        <Badge tone={round.mode === 'online' ? 'info' : 'warning'} size="sm">
                          {MODE_LABELS[round.mode] || round.mode}
                        </Badge>
                      </div>
                    </div>
                    {(round.venue || round.meetingLink) && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 font-body text-sm text-ink-600">
                        <ModeIcon className="w-4 h-4" />
                        <span className="truncate">
                          {round.mode === 'online' ? round.meetingLink : round.venue}
                        </span>
                      </div>
                    )}
                    {round.instructions && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="font-body text-xs text-ink-500 mb-1">Instructions:</p>
                        <p className="font-body text-sm text-ink-700">{round.instructions}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Info Sessions (Pre-Placement Talks) */}
      <Card>
        <div className="p-6">
          <h2 className="font-heading text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-700" />
            Pre-Placement Talks (PPTs)
          </h2>
          {infoSessions.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="w-12 h-12 text-ink-300 mx-auto mb-4" />
              <h3 className="font-heading text-base font-semibold text-ink-900 mb-1">
                No Pre-Placement Talks Scheduled
              </h3>
              <p className="font-body text-ink-500">
                PPTs will appear here once scheduled by the placement cell.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {infoSessions.map((session) => {
                const ModeIcon = MODE_ICONS[session.mode] || Clock
                return (
                  <div
                    key={session._id}
                    className="border border-border rounded-lg p-4 hover:bg-purple-50/50 transition-colors relative"
                  >
                    {session.mandatory && (
                      <div className="absolute top-2 right-2">
                        <Badge tone="danger" size="xs" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Mandatory
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-heading text-lg font-bold text-purple-700 flex-shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-semibold text-ink-900">
                            {session.title}
                          </h3>
                          <p className="font-body text-sm text-ink-500">
                            {MODE_LABELS[session.mode] || session.mode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:ml-auto">
                        <div className="flex items-center gap-2 font-body text-sm text-ink-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDateTime(session.dateTime)}</span>
                        </div>
                        <Badge tone={session.mode === 'online' ? 'info' : 'warning'} size="sm">
                          {MODE_LABELS[session.mode] || session.mode}
                        </Badge>
                      </div>
                    </div>
                    {(session.venue || session.meetingLink) && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 font-body text-sm text-ink-600">
                        <ModeIcon className="w-4 h-4" />
                        <span className="truncate">
                          {session.mode === 'online' ? session.meetingLink : session.venue}
                        </span>
                      </div>
                    )}
                    {session.description && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="font-body text-xs text-ink-500 mb-1">Details:</p>
                        <p className="font-body text-sm text-ink-700">{session.description}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Apply Action */}
      <Card>
        <div className="p-6 text-center">
          <h2 className="font-heading text-lg font-semibold text-ink-900 mb-4">Ready to Apply?</h2>
          {drive.eligibility?.eligible === null ? (
            <div className="space-y-3">
              <p className="font-body text-ink-600">
                Please complete your profile to check eligibility.
              </p>
              <Button variant="primary" onClick={() => navigate('/profile')}>
                Complete Profile
              </Button>
            </div>
          ) : !isEligible ? (
            <div className="space-y-3">
              <p className="font-body text-ink-600">You are not eligible for this drive.</p>
              <p className="font-body text-sm text-ink-500">
                Please review the eligibility criteria above.
              </p>
            </div>
          ) : !registrationOpen ? (
            <div className="space-y-3">
              <Badge tone="warning" size="lg" className="mb-2">
                Registrations Not Open
              </Badge>
              <p className="font-body text-ink-600">
                Applications open when the drive status changes to{' '}
                <strong>Registration Open</strong>.
              </p>
              <p className="font-body text-sm text-ink-500">
                Current status: {drive.status.replace('_', ' ')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-body text-ink-600">You are eligible to apply for this drive.</p>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  // Placeholder for Phase 35 - Apply action
                  alert('Apply functionality will be implemented in Phase 35')
                }}
              >
                Apply Now
              </Button>
              <p className="font-body text-xs text-ink-500">
                Apply action will be fully implemented in Phase 35
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
