// Admin Applicants Page: Coordinator/TPO can view and update applicant round statuses for a drive.
// Traces to FR-APP-04, FR-APP-05, FR-APP-06, FR-OFR-01.
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  FilePlus,
  Calendar,
  Send,
} from 'lucide-react'
import * as applicationApi from '../api/application.api.js'
import * as driveApi from '../api/drive.api.js'
import * as roundApi from '../api/round.api.js'
import * as offerApi from '../api/offer.api.js'
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

  // Bulk CSV upload state
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false)
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false)
  const [bulkUploadResult, setBulkUploadResult] = useState(null)
  const [bulkUploadError, setBulkUploadError] = useState(null)
  const [selectedRoundForBulk, setSelectedRoundForBulk] = useState('')
  const [csvFile, setCsvFile] = useState(null)

  // Offer issuance state
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [offerLoading, setOfferLoading] = useState(false)
  const [offerError, setOfferError] = useState(null)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [offerFormData, setOfferFormData] = useState({
    document: null,
    documentName: '',
    documentSize: 0,
    documentType: '',
    responseDeadline: '',
    uploadParams: null,
  })
  const [uploadProgress, setUploadProgress] = useState(0)

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

  const handleBulkUpload = async () => {
    if (!csvFile || !selectedRoundForBulk) {
      setBulkUploadError('Please select a CSV file and a round')
      return
    }

    setBulkUploadLoading(true)
    setBulkUploadError(null)
    setBulkUploadResult(null)

    try {
      // Parse CSV file
      const text = await csvFile.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row')
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const rollNumberIndex = headers.indexOf('rollnumber')
      const statusIndex = headers.indexOf('status')

      if (rollNumberIndex === -1 || statusIndex === -1) {
        throw new Error('CSV must have "rollNumber" and "status" columns')
      }

      const updates = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim())
        if (cols.length > Math.max(rollNumberIndex, statusIndex)) {
          updates.push({
            rollNumber: cols[rollNumberIndex],
            status: cols[statusIndex],
          })
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid rows found in CSV')
      }

      const result = await applicationApi.bulkUpdateRoundStatus(
        driveId,
        selectedRoundForBulk,
        updates
      )
      setBulkUploadResult(result)
      // Refresh applications to reflect changes
      fetchApplications()
    } catch (err) {
      setBulkUploadError(err.message || 'Failed to process bulk upload')
    } finally {
      setBulkUploadLoading(false)
    }
  }

  const closeBulkUploadModal = () => {
    setBulkUploadModalOpen(false)
    setSelectedRoundForBulk('')
    setCsvFile(null)
    setBulkUploadResult(null)
    setBulkUploadError(null)
  }

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setBulkUploadError('Please select a CSV file')
        return
      }
      setCsvFile(file)
      setBulkUploadError(null)
    }
  }

  // Offer issuance functions
  const openOfferModal = (application) => {
    setSelectedApplication(application)
    setOfferError(null)
    setOfferFormData({
      document: null,
      documentName: '',
      documentSize: 0,
      documentType: '',
      responseDeadline: '',
      uploadParams: null,
    })
    setUploadProgress(0)
    // Fetch upload params
    offerApi.getOfferUploadParams().then((res) => {
      setOfferFormData((prev) => ({ ...prev, uploadParams: res }))
    }).catch(() => {
      setOfferError('Failed to initialize upload service')
    })
    setOfferModalOpen(true)
  }

  const closeOfferModal = () => {
    setOfferModalOpen(false)
    setSelectedApplication(null)
    setOfferError(null)
    setOfferFormData({
      document: null,
      documentName: '',
      documentSize: 0,
      documentType: '',
      responseDeadline: '',
      uploadParams: null,
    })
    setUploadProgress(0)
  }

  const handleOfferDocumentChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type (PDF only for offer letters)
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setOfferError('Please select a PDF file')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setOfferError('File size must be less than 10MB')
        return
      }
      setOfferFormData((prev) => ({
        ...prev,
        document: file,
        documentName: file.name,
        documentSize: file.size,
        documentType: file.type,
      }))
      setOfferError(null)
    }
  }

  const handleDeadlineChange = (e) => {
    setOfferFormData((prev) => ({
      ...prev,
      responseDeadline: e.target.value,
    }))
  }

  const uploadToCloudinary = async (file, params) => {
    const formData = new FormData()
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } else {
          reject(new Error('Upload failed'))
        }
      })
      xhr.addEventListener('error', () => reject(new Error('Upload failed')))
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${params.cloud_name}/raw/upload`)
      xhr.send(formData)
    })
  }

  const handleIssueOffer = async () => {
    if (!selectedApplication) {
      setOfferError('No application selected')
      return
    }
    if (!offerFormData.document) {
      setOfferError('Please select an offer document')
      return
    }
    if (!offerFormData.responseDeadline) {
      setOfferError('Please select a response deadline')
      return
    }
    if (!offerFormData.uploadParams) {
      setOfferError('Upload service not initialized')
      return
    }

    // Validate deadline is in the future
    const deadline = new Date(offerFormData.responseDeadline)
    if (deadline <= new Date()) {
      setOfferError('Response deadline must be in the future')
      return
    }

    setOfferLoading(true)
    setOfferError(null)
    setUploadProgress(0)

    try {
      // Upload document to Cloudinary
      const uploadResult = await uploadToCloudinary(offerFormData.document, offerFormData.uploadParams)

      // Issue offer via API
      await offerApi.issueOffer(selectedApplication._id, {
        document: {
          cloudinaryPublicId: uploadResult.public_id,
          cloudinarySecureUrl: uploadResult.secure_url,
          originalFilename: offerFormData.documentName,
          fileSize: offerFormData.documentSize,
          mimeType: offerFormData.documentType,
        },
        responseDeadline: offerFormData.responseDeadline,
      })

      setSuccess(`Offer issued for ${selectedApplication.student?.rollNumber || 'student'}`)
      closeOfferModal()
      fetchApplications()
    } catch (err) {
      setOfferError(err.message || 'Failed to issue offer')
    } finally {
      setOfferLoading(false)
      setUploadProgress(0)
    }
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkUploadModalOpen(true)}
                icon={<Upload className="w-4 h-4" />}
              >
                Bulk Upload CSV
              </Button>
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
                    <th className="px-4 py-3 text-center font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Actions
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
                      <td className="px-4 py-4 text-center">
                        {app.overallStatus === 'selected' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openOfferModal(app)}
                            disabled={updatingRow === app._id || offerLoading}
                            icon={<FilePlus className="w-4 h-4" />}
                          >
                            Issue Offer
                          </Button>
                        )}
                        {app.overallStatus === 'offer_issued' && (
                          <Badge tone="warning" size="sm">Offer Issued</Badge>
                        )}
                        {app.overallStatus === 'offer_accepted' && (
                          <Badge tone="success" size="sm">Offer Accepted</Badge>
                        )}
                        {app.overallStatus === 'offer_declined' && (
                          <Badge tone="danger" size="sm">Offer Declined</Badge>
                        )}
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

      {/* Bulk Upload CSV Modal */}
      {bulkUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-raised w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Bulk Upload Round Status (CSV)
              </h2>
              <Button variant="ghost" size="icon" onClick={closeBulkUploadModal} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <h3 className="font-body text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CSV Format
                </h3>
                <p className="font-body text-sm text-ink-600 mb-2">
                  CSV must have columns:{' '}
                  <code className="bg-surface px-1.5 py-0.5 rounded text-primary-700">
                    rollNumber,status
                  </code>
                </p>
                <pre className="bg-surface/50 p-2 rounded text-xs font-mono text-ink-600 overflow-x-auto">
                  {`rollNumber,status
21CS001,shortlisted
21CS002,shortlisted
21CS003,cleared`}
                </pre>
                <p className="font-body text-xs text-ink-500 mt-2">
                  Valid statuses: {ROUND_STATUS_OPTIONS.map((o) => o.value).join(', ')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                    Select Round *
                  </label>
                  <select
                    value={selectedRoundForBulk}
                    onChange={(e) => setSelectedRoundForBulk(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                    disabled={roundsLoading || rounds.length === 0}
                  >
                    <option value="">Select Round</option>
                    {rounds.map((r) => (
                      <option key={r._id} value={r._id}>
                        Round {r.roundNumber}: {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                    CSV File *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      disabled={bulkUploadLoading}
                      className="sr-only"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-ink-400 mb-2" />
                      <span className="font-body text-sm text-ink-600">
                        {csvFile ? csvFile.name : 'Drag & drop or click to select a CSV file'}
                      </span>
                      <span className="font-body text-xs text-ink-400">
                        Max 100 rows recommended
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {bulkUploadError && (
                <div
                  className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-3"
                  role="alert"
                >
                  <span className="font-body text-sm">{bulkUploadError}</span>
                </div>
              )}

              {bulkUploadResult && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <h4 className="font-body text-sm font-semibold text-ink-900 mb-3">
                    Upload Results
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between font-body text-sm">
                      <span className="text-ink-600">Total rows processed:</span>
                      <span className="font-medium text-ink-900">
                        {bulkUploadResult.updated + bulkUploadResult.errors.length}
                      </span>
                    </div>
                    <div className="flex justify-between font-body text-sm text-success">
                      <span>Successfully updated:</span>
                      <span className="font-medium">{bulkUploadResult.updated}</span>
                    </div>
                    <div className="flex justify-between font-body text-sm text-danger">
                      <span>Errors:</span>
                      <span className="font-medium">{bulkUploadResult.errors.length}</span>
                    </div>
                    {bulkUploadResult.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="font-body text-sm text-ink-600 cursor-pointer">
                          View error details ({bulkUploadResult.errors.length})
                        </summary>
                        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                          {bulkUploadResult.errors.map((err, idx) => (
                            <li
                              key={idx}
                              className="font-body text-xs text-danger flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3 flex-shrink-0" />
                              Roll: {err.rollNumber} - {err.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={closeBulkUploadModal}
                  disabled={bulkUploadLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleBulkUpload}
                  disabled={bulkUploadLoading || !csvFile || !selectedRoundForBulk}
                >
                  {bulkUploadLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Upload & Update'
                  )}
                </Button>
              </div>
            </div>
</div>
        </div>
      )}

      {/* Issue Offer Modal */}
      {offerModalOpen && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-raised w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Issue Offer Letter</h2>
              <Button variant="ghost" size="icon" onClick={closeOfferModal} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <h3 className="font-body text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Student Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-body text-ink-500">Roll Number:</span>
                    <span className="font-medium text-ink-900 ml-2">{selectedApplication.student?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="font-body text-ink-500">Name:</span>
                    <span className="font-medium text-ink-900 ml-2">{selectedApplication.student?.user?.name}</span>
                  </div>
                  <div>
                    <span className="font-body text-ink-500">Branch:</span>
                    <span className="font-medium text-ink-900 ml-2">{selectedApplication.student?.branch}</span>
                  </div>
                  <div>
                    <span className="font-body text-ink-500">Batch:</span>
                    <span className="font-medium text-ink-900 ml-2">{selectedApplication.student?.batch}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                    Offer Document (PDF) *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleOfferDocumentChange}
                      disabled={offerLoading}
                      className="sr-only"
                      id="offer-document-upload"
                    />
                    <label
                      htmlFor="offer-document-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-ink-400 mb-2" />
                      <span className="font-body text-sm text-ink-600">
                        {offerFormData.documentName ? offerFormData.documentName : 'Drag & drop or click to select a PDF file'}
                      </span>
                      <span className="font-body text-xs text-ink-400">
                        PDF only, max 10MB
                      </span>
                    </label>
                  </div>
                  {offerFormData.document && (
                    <div className="mt-2 text-xs text-success">
                      Selected: {offerFormData.documentName} ({(offerFormData.documentSize / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                    Response Deadline *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="datetime-local"
                      value={offerFormData.responseDeadline}
                      onChange={handleDeadlineChange}
                      className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                      disabled={offerLoading}
                    />
                  </div>
                  <p className="font-body text-xs text-ink-500 mt-1">Student must respond before this date/time</p>
                </div>
              </div>

              {offerError && (
                <div
                  className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-3"
                  role="alert"
                >
                  <span className="font-body text-sm">{offerError}</span>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-sm font-medium text-ink-900">Uploading Document...</span>
                    <span className="font-mono text-sm text-primary-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-primary-100 rounded-full h-2">
                    <div
                      className="bg-primary-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={closeOfferModal}
                  disabled={offerLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleIssueOffer}
                  disabled={offerLoading || !offerFormData.document || !offerFormData.responseDeadline}
                >
                  {offerLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Issuing...
                    </>
                  ) : (
                    'Issue Offer'
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