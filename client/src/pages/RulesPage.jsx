// Rules & Regulations Page: Displays current rules content and handles policy acknowledgment.
// Traces to FR-RUL-01, FR-RUL-02.
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle, FileText, Clock, User, Edit3 } from 'lucide-react'
import * as rulesApi from '../api/rules.api.js'
import * as studentProfileApi from '../api/studentProfile.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'

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

export default function RulesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rulesPage, setRulesPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [ackError, setAckError] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await rulesApi.getRules()
        setRulesPage(res.rulesPage)
        // Check if user has already acknowledged this version by fetching their profile
        if (user && res.rulesPage?.version) {
          try {
            const profileRes = await studentProfileApi.getSelfProfile()
            const ack = profileRes.profile?.policyAcknowledgment
            if (ack?.version && String(ack.version) === String(res.rulesPage.version)) {
              setAcknowledged(true)
            }
          } catch (profileErr) {
            // Profile might not exist yet, that's okay
            console.debug('Could not fetch profile for acknowledgment check:', profileErr)
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load rules')
      } finally {
        setLoading(false)
      }
    }
    fetchRules()
  }, [user])

  const handleAcknowledge = async () => {
    if (!rulesPage?.version) return
    setAcknowledging(true)
    setAckError(null)
    try {
      await studentProfileApi.acknowledgePolicy(String(rulesPage.version))
      setAcknowledged(true)
      // Refresh user context to update profile
      window.location.reload()
    } catch (err) {
      setAckError(err.details?.message || err.message || 'Failed to acknowledge policy')
    } finally {
      setAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-700" />
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
            <h1 className="font-heading text-2xl font-bold text-ink-900">Unable to Load Rules</h1>
            <p className="font-body text-ink-500">{error}</p>
          </div>
        </div>
        <Card>
          <div className="p-8 text-center">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!rulesPage) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">Rules & Regulations</h1>
            <p className="font-body text-ink-500">Placement Cell policies and guidelines</p>
          </div>
        </div>
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
              No Rules Published
            </h3>
            <p className="font-body text-ink-500 mb-6">
              The T&P Cell has not yet published the Rules & Regulations.
            </p>
            {user?.role === 'tpo' && (
              <Button variant="primary" onClick={() => navigate('/admin/rules')}>
                <Edit3 className="w-4 h-4 mr-2" />
                Create Rules Page
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink-900">Rules & Regulations</h1>
            <p className="font-body text-ink-500">Placement Cell policies and guidelines</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="info" size="md">
            Version {rulesPage.version}
          </Badge>
          {rulesPage.editedAt && (
            <span className="font-body text-sm text-ink-500">
              Updated {formatDateTime(rulesPage.editedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <Card className="border-info bg-info/5">
        <div className="p-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="font-body text-xs text-ink-500">Last Updated</p>
              <p className="font-body text-sm font-medium text-ink-900">
                {formatDateTime(rulesPage.editedAt || rulesPage.updatedAt || rulesPage.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <p className="font-body text-xs text-ink-500">Edited By</p>
              <p className="font-body text-sm font-medium text-ink-900">
                {rulesPage.editor?.name || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-body text-xs text-ink-500">Content Length</p>
              <p className="font-body text-sm font-medium text-ink-900">
                {rulesPage.content?.length || 0} characters
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Rules Content */}
      <Card>
        <div className="p-6">
          <div className="prose prose-primary max-w-none font-body text-ink-700">
            {rulesPage.content ? (
              <div dangerouslySetInnerHTML={{ __html: rulesPage.content }} />
            ) : (
              <p className="text-ink-500">No content available.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Acknowledgment Section (for students only) */}
      {user?.role === 'student' && (
        <Card className="border-primary bg-primary-50/50">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-primary-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                  Policy Acknowledgment Required
                </h3>
                <p className="font-body text-sm text-ink-600">
                  You must read and acknowledge the current Rules & Regulations before you can apply
                  to any drive. This is a one-time requirement per version — if the rules are
                  updated, you will need to acknowledge the new version before applying again.
                </p>
              </div>
            </div>

            {acknowledged ? (
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                <div>
                  <p className="font-heading text-base font-semibold text-success">
                    Acknowledged Successfully
                  </p>
                  <p className="font-body text-sm text-ink-600">
                    You have acknowledged version {rulesPage.version} of the Rules & Regulations.
                    You are now eligible to apply for drives.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="policyAcknowledgment"
                    disabled={acknowledging}
                    className="w-5 h-5 mt-0.5 text-primary-700 border-border rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    aria-describedby="ack-desc"
                  />
                  <div className="flex-1">
                    <span className="font-body text-sm text-ink-900">
                      I have read and understood the Rules & Regulations (Version{' '}
                      {rulesPage.version}) and agree to abide by them.
                    </span>
                    <p id="ack-desc" className="font-body text-xs text-ink-500 mt-1">
                      This acknowledgment is recorded with a timestamp and version number.
                    </p>
                  </div>
                </label>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  aria-busy={acknowledging}
                >
                  {acknowledging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Recording Acknowledgment...
                    </>
                  ) : (
                    'Acknowledge & Continue'
                  )}
                </Button>

                {ackError && (
                  <p className="font-body text-sm text-danger" role="alert">
                    {ackError}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Admin Edit Link */}
      {user?.role === 'tpo' && (
        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/admin/rules')}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Rules & Regulations
          </Button>
        </div>
      )}
    </div>
  )
}
