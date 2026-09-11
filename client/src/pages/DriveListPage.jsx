// Drive List Page: Coordinator/TPO can view, create, edit, delete drives.
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  Briefcase,
  DollarSign,
  Calendar,
  Target,
  Layers,
} from 'lucide-react'
import * as driveApi from '../api/drive.api.js'
import * as companyApi from '../api/company.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'

// Canonical department list (must match server constants/departments.js)
const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Basic Sciences & Humanities',
]

// Job types
const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'full-time+internship', label: 'Full-time + Internship' },
]

// Drive schema with Zod validation
const eligibilityCriteriaSchema = z.object({
  branches: z.array(z.string()).min(1, 'At least one branch is required'),
  batches: z.array(z.number().int().min(2000).max(2100)).min(1, 'At least one batch is required'),
  minCgpa: z.number().min(0, 'CGPA must be >= 0').max(10, 'CGPA must be <= 10'),
  maxBacklogs: z
    .number()
    .int()
    .min(0, 'Max backlogs must be >= 0')
    .max(50, 'Max backlogs must be <= 50'),
  min10th: z.number().min(0, '10th % must be >= 0').max(100, '10th % must be <= 100'),
  min12th: z.number().min(0, '12th % must be >= 0').max(100, '12th % must be <= 100'),
})

const compensationSchema = z.object({
  ctcLpa: z.number().min(0, 'CTC must be >= 0'),
  stipend: z.number().min(0, 'Stipend must be >= 0').optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  details: z.string().max(500).optional(),
})

const driveSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Drive title is required').max(200),
  jobType: z.enum(['full-time', 'internship', 'full-time+internship']),
  compensation: compensationSchema,
  eligibilityCriteria: eligibilityCriteriaSchema,
  tier: z.number().int().min(1, 'Tier must be >= 1').max(10, 'Tier must be <= 10'),
  vacancies: z
    .number()
    .int()
    .min(1, 'Vacancies must be >= 1')
    .max(1000, 'Vacancies must be <= 1000'),
  registrationDeadline: z.string().min(1, 'Registration deadline is required'),
  status: z
    .enum([
      'draft',
      'published',
      'registration_open',
      'registration_closed',
      'in_progress',
      'completed',
      'results_declared',
    ])
    .optional()
    .default('draft'),
  departmentScope: z.enum(DEPARTMENTS).optional(),
  description: z.string().max(5000).optional(),
})

// Helper to get default form values
const getDefaultValues = () => ({
  company: '',
  title: '',
  jobType: 'full-time',
  compensation: { ctcLpa: 0, stipend: 0, currency: 'INR', details: '' },
  eligibilityCriteria: {
    branches: [],
    batches: [],
    minCgpa: 7,
    maxBacklogs: 2,
    min10th: 60,
    min12th: 65,
  },
  tier: 3,
  vacancies: 1,
  registrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'draft',
  departmentScope: '',
  description: '',
})

// Helper to generate batch years (current year + 4)
const getBatchYears = () => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear + i)
}

const DriveForm = ({ isOpen, onClose, onSubmit, initialData, isLoading, title, companies }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(driveSchema),
    defaultValues: getDefaultValues(),
  })

  const watchedValues = watch()

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Convert date to YYYY-MM-DD format for date input
        const deadline = initialData.registrationDeadline
          ? new Date(initialData.registrationDeadline).toISOString().split('T')[0]
          : getDefaultValues().registrationDeadline

        reset({
          ...getDefaultValues(),
          ...initialData,
          registrationDeadline: deadline,
          eligibilityCriteria: {
            ...getDefaultValues().eligibilityCriteria,
            ...initialData.eligibilityCriteria,
          },
          compensation: {
            ...getDefaultValues().compensation,
            ...initialData.compensation,
          },
        })
      } else {
        reset(getDefaultValues())
      }
    }
  }, [isOpen, initialData, reset])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl shadow-raised w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-ink-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="font-body text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Company *"
                error={errors.company?.message}
                placeholder="Select a company"
              >
                <select
                  {...register('company')}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.sector})
                    </option>
                  ))}
                </select>
              </Input>
              <Input
                label="Drive Title *"
                {...register('title')}
                error={errors.title?.message}
                placeholder="e.g., Software Engineer - 2024 Batch"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Job Type *" error={errors.jobType?.message}>
                <select
                  {...register('jobType')}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                >
                  {JOB_TYPES.map((jt) => (
                    <option key={jt.value} value={jt.value}>
                      {jt.label}
                    </option>
                  ))}
                </select>
              </Input>
              <Input
                label="Tier *"
                error={errors.tier?.message}
                type="number"
                min="1"
                max="10"
                {...register('tier', { valueAsNumber: true })}
              />
            </div>

            <Input
              label="Vacancies *"
              type="number"
              min="1"
              max="1000"
              {...register('vacancies', { valueAsNumber: true })}
              error={errors.vacancies?.message}
            />

            <Input
              label="Registration Deadline *"
              type="date"
              {...register('registrationDeadline')}
              error={errors.registrationDeadline?.message}
              min={new Date().toISOString().split('T')[0]}
            />

            <div>
              <label className="font-body text-sm font-medium text-ink-900 block mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                placeholder="Optional description of the drive..."
              />
            </div>
          </div>

          {/* Section 2: Compensation */}
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="font-body text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Compensation
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="CTC (LPA) *"
                type="number"
                min="0"
                step="0.1"
                {...register('compensation.ctcLpa', { valueAsNumber: true })}
                error={errors.compensation?.ctcLpa?.message}
                placeholder="e.g., 12.5"
              />
              <Input
                label="Stipend (LPA)"
                type="number"
                min="0"
                step="0.1"
                {...register('compensation.stipend', { valueAsNumber: true })}
                error={errors.compensation?.stipend?.message}
                placeholder="e.g., 2.0 (if internship)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Currency" error={errors.compensation?.currency?.message}>
                <select
                  {...register('compensation.currency')}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </Input>
              <Input
                label="Details"
                {...register('compensation.details')}
                error={errors.compensation?.details?.message}
                placeholder="e.g., Includes bonus, stock options"
              />
            </div>
          </div>

          {/* Section 3: Eligibility Criteria */}
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="font-body text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Eligibility Criteria
            </h3>

            {/* Branches */}
            <div>
              <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                Eligible Branches *
              </label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => {
                  const checked =
                    watchedValues.eligibilityCriteria?.branches?.includes(dept) ?? false
                  return (
                    <label
                      key={dept}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = watchedValues.eligibilityCriteria?.branches ?? []
                          const updated = e.target.checked
                            ? [...current, dept]
                            : current.filter((b) => b !== dept)
                          setValue('eligibilityCriteria.branches', updated, {
                            shouldValidate: true,
                          })
                        }}
                        className="w-4 h-4 rounded border-border text-primary-700 focus:ring-primary-700"
                      />
                      <span className="font-body text-ink-700">{dept}</span>
                    </label>
                  )
                })}
              </div>
              {errors.eligibilityCriteria?.branches && (
                <p className="mt-1 font-body text-sm text-danger" role="alert">
                  {errors.eligibilityCriteria.branches.message}
                </p>
              )}
            </div>

            {/* Batches */}
            <div>
              <label className="font-body text-sm font-medium text-ink-900 block mb-2">
                Eligible Batches *
              </label>
              <div className="flex flex-wrap gap-2">
                {getBatchYears().map((year) => {
                  const checked =
                    watchedValues.eligibilityCriteria?.batches?.includes(year) ?? false
                  return (
                    <label
                      key={year}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = watchedValues.eligibilityCriteria?.batches ?? []
                          const updated = e.target.checked
                            ? [...current, year]
                            : current.filter((b) => b !== year)
                          setValue('eligibilityCriteria.batches', updated, { shouldValidate: true })
                        }}
                        className="w-4 h-4 rounded border-border text-primary-700 focus:ring-primary-700"
                      />
                      <span className="font-body text-ink-700">{year}</span>
                    </label>
                  )
                })}
              </div>
              {errors.eligibilityCriteria?.batches && (
                <p className="mt-1 font-body text-sm text-danger" role="alert">
                  {errors.eligibilityCriteria.batches.message}
                </p>
              )}
            </div>

            {/* Academic Thresholds */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Min CGPA *"
                type="number"
                min="0"
                max="10"
                step="0.01"
                {...register('eligibilityCriteria.minCgpa', { valueAsNumber: true })}
                error={errors.eligibilityCriteria?.minCgpa?.message}
              />
              <Input
                label="Max Backlogs *"
                type="number"
                min="0"
                max="50"
                {...register('eligibilityCriteria.maxBacklogs', { valueAsNumber: true })}
                error={errors.eligibilityCriteria?.maxBacklogs?.message}
              />
              <Input
                label="Min 10th % *"
                type="number"
                min="0"
                max="100"
                {...register('eligibilityCriteria.min10th', { valueAsNumber: true })}
                error={errors.eligibilityCriteria?.min10th?.message}
              />
              <Input
                label="Min 12th % *"
                type="number"
                min="0"
                max="100"
                {...register('eligibilityCriteria.min12th', { valueAsNumber: true })}
                error={errors.eligibilityCriteria?.min12th?.message}
              />
            </div>
          </div>

          {/* Section 4: Department Scope (TPO only - shown but disabled for coordinators) */}
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="font-body text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Department Scope
            </h3>
            <Input
              label="Department Scope (TPO only)"
              error={errors.departmentScope?.message}
              disabled={true}
            >
              <select
                {...register('departmentScope')}
                className="w-full rounded-md border border-border bg-surface/50 px-3 py-2 text-ink-900"
                disabled
              >
                <option value="">Institute-wide (all departments)</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </Input>
            <p className="font-body text-xs text-ink-500">
              Coordinators are automatically scoped to their department. TPO can override.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DriveListPage() {
  const [drives, setDrives] = useState([])
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', jobType: '', tier: '' })
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' })
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDrive, setEditingDrive] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchDrives = useCallback(async () => {
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
      const res = await driveApi.getDrives(params)
      setDrives(res.drives)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch drives')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await companyApi.getCompanies({ isActive: true })
      setCompanies(res.companies)
    } catch (err) {
      console.error('Failed to fetch companies:', err)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Initial load
  useEffect(() => {
    fetchDrives()
    fetchCompanies()
  }, [])

  // Refetch when dependencies change
  useEffect(() => {
    fetchDrives()
  }, [pagination.page, pagination.limit, sort, filters])

  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleSearch = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const openCreateModal = () => {
    setEditingDrive(null)
    setModalOpen(true)
  }

  const openEditModal = (drive) => {
    setEditingDrive(drive)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingDrive(null)
  }

  const handleFormSubmit = async (data) => {
    setSubmitLoading(true)
    setError(null)
    try {
      if (editingDrive) {
        await driveApi.updateDrive(editingDrive._id, data)
        setSuccess('Drive updated successfully')
      } else {
        await driveApi.createDrive(data)
        setSuccess('Drive created successfully')
      }
      closeModal()
      fetchDrives()
    } catch (err) {
      setError(err.message || 'Failed to save drive')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (drive) => {
    if (!window.confirm(`Are you sure you want to delete "${drive.title}"?`)) return
    setError(null)
    try {
      await driveApi.deleteDrive(drive._id)
      setSuccess('Drive deleted successfully')
      fetchDrives()
    } catch (err) {
      setError(err.message || 'Failed to delete drive')
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Status badge tone mapping
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
      case 'draft':
      default:
        return 'neutral'
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Drives</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Manage recruitment drives and eligibility criteria
          </p>
        </div>
        <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
          Add Drive
        </Button>
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
                placeholder="Search by title or company..."
                value={filters.search}
                onChange={handleSearch}
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
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="registration_open">Registration Open</option>
                <option value="registration_closed">Registration Closed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="results_declared">Results Declared</option>
              </select>
              <select
                value={filters.jobType}
                onChange={(e) => handleFilterChange('jobType', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Job Types</option>
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="full-time+internship">Full-time + Internship</option>
              </select>
              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Tiers</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>
                    Tier {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('title')}
                    >
                      Drive Title
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('company')}
                    >
                      Company
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('jobType')}
                    >
                      Job Type
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('tier')}
                    >
                      Tier
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('registrationDeadline')}
                    >
                      Deadline
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {drives.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                        No drives found
                      </td>
                    </tr>
                  ) : (
                    drives.map((drive) => (
                      <tr key={drive._id} className="hover:bg-primary-50/50">
                        <td className="px-4 py-4 font-body text-sm text-ink-900">{drive.title}</td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {drive.company?.name || drive.company || '-'}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {drive.jobType?.replace('-', ' ').replace('+', ' + ') || '-'}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {drive.tier ? `Tier ${drive.tier}` : '-'}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {formatDate(drive.registrationDeadline)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={getStatusTone(drive.status)} size="sm">
                            {drive.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(drive)}
                              aria-label={`Edit ${drive.title}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(drive)}
                              aria-label={`Delete ${drive.title}`}
                              className="text-danger hover:bg-danger/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="px-4 py-4 border-t border-border flex items-center justify-between">
                <p className="font-body text-sm text-ink-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} drives
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

      <DriveForm
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingDrive}
        isLoading={submitLoading}
        title={editingDrive ? 'Edit Drive' : 'Add Drive'}
        companies={companies}
      />
    </div>
  )
}
