// Offer Response Page: Student can view and accept/decline their offers.
// Traces to FR-OFR-02, FR-OFR-04.
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, XCircle, Clock, Briefcase, FileText, Calendar, Loader2, ChevronLeft, X } from 'lucide-react'
import * as offerApi from '../api/offer.api.js'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}

const STATUS_TONES = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
  expired: 'neutral',
}

const formatDate = (dateStr) => {
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

const timeUntilDeadline = (deadline) => {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate - now

  if (diff <= 0) return { expired: true, text: 'Expired' }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return { expired: false, text: `${days}d ${hours}h remaining` }
  if (hours > 0) return { expired: false, text: `${hours}h ${minutes}m remaining` }
  return { expired: false, text: `${minutes}m remaining` }
}

export default function OfferResponsePage() {
  const { offerId } = useParams()
  const navigate = useNavigate()

  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responding, setResponding] = useState(false)
  const [response, setResponse] = useState(null) // 'accept' | 'decline'
  const [showConfirm, setShowConfirm] = useState(false)

  const fetchOffer = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await offerApi.getOfferById(offerId)
      setOffer(res.offer)
    } catch (err) {
      setError(err.message || 'Failed to load offer')
    } finally {
      setLoading(false)
    }
  }, [offerId])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchOffer()
  }, [fetchOffer])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleResponse = (choice) => {
    setResponse(choice)
    setShowConfirm(true)
  }

  const confirmResponse = async () => {
    if (!response) return
    setResponding(true)
    try {
      await offerApi.respondToOffer(offerId, response)
      setShowConfirm(false)
      // Refetch to show updated status
      fetchOffer()
    } catch (err) {
      setError(err.message || 'Failed to respond to offer')
    } finally {
      setResponding(false)
    }
  }

  const cancelResponse = () => {
    setResponse(null)
    setShowConfirm(false)
  }

  if (loading) {
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

  if (error && !offer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Offer Response</h1>
          <p className="font-body text-sm text-ink-600 mt-1">View and respond to your job offer</p>
        </div>
        <Card>
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">Unable to Load Offer</h3>
            <p className="font-body text-ink-500 mb-4">{error}</p>
            <Button variant="primary" onClick={() => navigate('/applications/my')}>
              Back to My Applications
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!offer) return null

  const deadlineInfo = timeUntilDeadline(offer.responseDeadline)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/applications/my')} aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">Job Offer</h1>
            <p className="font-body text-sm text-ink-600 mt-1">Review and respond to your offer</p>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-4 flex items-center justify-between"
          role="alert"
        >
          <span className="font-body text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Offer Header with Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Badge tone={STATUS_TONES[offer.status] || 'neutral'} size="lg">
                {STATUS_LABELS[offer.status] || offer.status}
              </Badge>
            </div>
            {offer.status === 'pending' && !deadlineInfo.expired && (
              <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-lg px-4 py-2">
                <Clock className="w-5 h-5 text-primary-700" />
                <span className="font-body text-sm font-medium text-primary-700">{deadlineInfo.text}</span>
              </div>
            )}
            {deadlineInfo.expired && offer.status === 'pending' && (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger rounded-lg px-4 py-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <span className="font-body text-sm font-medium text-danger">Response deadline has passed</span>
              </div>
            )}
          </div>

          {/* Drive & Company Info */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Drive</p>
                <p className="font-heading text-lg font-semibold text-ink-900">{offer.application?.drive?.title || '-'}</p>
              </div>
              <div>
                <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Company</p>
                <p className="font-heading text-lg font-semibold text-ink-900">{offer.application?.drive?.company?.name || '-'}</p>
              </div>
              <div>
                <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Tier</p>
                <p className="font-body text-lg font-semibold text-ink-900">{offer.application?.drive?.tier ? `Tier ${offer.application.drive.tier}` : '-'}</p>
              </div>
              <div>
                <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">CTC</p>
                <p className="font-heading text-lg font-semibold text-ink-900">{formatCTC(offer.application?.drive?.compensation?.ctcLpa)}</p>
              </div>
            </div>
          </div>

          {/* Response Deadline */}
          <div className="flex items-center gap-4 bg-surface border border-border rounded-xl p-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Response Deadline</p>
              <p className="font-body text-lg font-semibold text-ink-900">{formatDate(offer.responseDeadline)}</p>
            </div>
          </div>

          {/* Offer Document */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider">Offer Document</p>
              <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
                Download
              </Button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-primary-50 border border-primary-100 rounded-lg">
              <FileText className="w-10 h-10 text-primary-700 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-body text-sm font-medium text-ink-900">{offer.document?.originalFilename || 'Offer Letter.pdf'}</p>
                <p className="font-body text-xs text-ink-500">PDF • {(offer.document?.fileSize ? (offer.document.fileSize / 1024).toFixed(1) + ' KB' : 'Unknown size')}</p>
              </div>
            </div>
          </div>

          {/* Response Actions */}
          {offer.status === 'pending' && !deadlineInfo.expired ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              <Button
                variant="danger"
                size="lg"
                onClick={() => handleResponse('decline')}
                disabled={responding}
                className="h-14"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Decline Offer
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleResponse('accept')}
                disabled={responding}
                className="h-14"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept Offer
              </Button>
            </div>
          ) : offer.status === 'accepted' ? (
            <div className="bg-success/10 border border-success rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <h3 className="font-heading text-lg font-semibold text-success mb-1">Offer Accepted</h3>
              <p className="font-body text-success">You have accepted this offer on {formatDate(offer.respondedAt)}. Your placement status has been updated.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/applications/my')} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to My Applications
              </Button>
            </div>
          ) : offer.status === 'declined' ? (
            <div className="bg-danger/10 border border-danger rounded-xl p-6 text-center">
              <XCircle className="w-12 h-12 text-danger mx-auto mb-3" />
              <h3 className="font-heading text-lg font-semibold text-danger mb-1">Offer Declined</h3>
              <p className="font-body text-danger">You declined this offer on {formatDate(offer.respondedAt)}. You can continue applying to other drives.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/applications/my')} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to My Applications
              </Button>
            </div>
          ) : offer.status === 'expired' ? (
            <div className="bg-neutral/10 border border-neutral rounded-xl p-6 text-center">
              <Clock className="w-12 h-12 text-neutral mx-auto mb-3" />
              <h3 className="font-heading text-lg font-semibold text-neutral mb-1">Offer Expired</h3>
              <p className="font-body text-neutral">This offer expired on {formatDate(offer.responseDeadline)} without a response. You can continue applying to other drives.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/applications/my')} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to My Applications
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-raised w-full max-w-md">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                {response === 'accept' ? 'Accept Offer' : 'Decline Offer'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                {response === 'accept' ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <XCircle className="w-8 h-8 text-danger" />
                )}
                <div>
                  <p className="font-body text-sm font-semibold text-ink-900">
                    Are you sure you want to {response} this offer?
                  </p>
                  <p className="font-body text-xs text-ink-500 mt-1">
                    {response === 'accept'
                      ? 'Accepting this offer will update your placement status and may affect your eligibility for other drives (Tier-Lock Rule).'
                      : 'Declining this offer means you will not be considered for this position. You can continue applying to other drives.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={cancelResponse} disabled={responding}>
                  Cancel
                </Button>
                <Button
                  variant={response === 'accept' ? 'primary' : 'danger'}
                  onClick={confirmResponse}
                  disabled={responding}
                >
                  {responding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    response === 'accept' ? 'Confirm Accept' : 'Confirm Decline'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}