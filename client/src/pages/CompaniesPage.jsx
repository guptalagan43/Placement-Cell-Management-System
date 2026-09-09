// CompaniesPage: Admin-facing company list with search, filter, pagination, and CRUD actions.
import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit, Trash2, Filter, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import * as companyApi from '../api/company.api.js'

// Validation schema for company form
const companySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  sector: z.string().max(100).optional(),
  about: z.string().max(2000).optional(),
  hrContact: z.object({
    name: z.string().min(1, 'HR contact name is required').max(100),
    email: z.string().email('Invalid email address').max(254),
    phone: z.string().max(20).optional(),
    designation: z.string().max(100).optional(),
  }),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

const initialFormValues = {
  name: '',
  sector: '',
  about: '',
  hrContact: { name: '', email: '', phone: '', designation: '' },
  website: '',
  isActive: true,
}

function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', sector: '', isActive: '' })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: initialFormValues,
  })

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...filters,
      }
      const data = await companyApi.getCompanies(params)
      setCompanies(data.companies)
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }))
    } catch (err) {
      setError(err.message ?? 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, filters])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCompanies()
  }, [fetchCompanies])

  // Open create modal
  const handleCreate = () => {
    setEditingCompany(null)
    reset(initialFormValues)
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (company) => {
    setEditingCompany(company)
    reset({
      name: company.name,
      sector: company.sector ?? '',
      about: company.about ?? '',
      hrContact: company.hrContact ?? { name: '', email: '', phone: '', designation: '' },
      website: company.website ?? '',
      isActive: company.isActive ?? true,
    })
    setShowModal(true)
  }

  // Handle form submit
  const onSubmit = async (data) => {
    try {
      if (editingCompany) {
        await companyApi.updateCompany(editingCompany._id, data)
      } else {
        await companyApi.createCompany(data)
      }
      setShowModal(false)
      fetchCompanies()
    } catch (err) {
      setError(err.message ?? 'Failed to save company')
    }
  }

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await companyApi.deleteCompany(id)
      setDeleteConfirm(null)
      fetchCompanies()
    } catch (err) {
      setError(err.message ?? 'Failed to delete company')
    }
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({ search: '', sector: '', isActive: '' })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = filters.search || filters.sector || filters.isActive

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Companies</h1>
          <p className="font-body text-sm text-ink-600 mt-1">Manage company master list</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger bg-danger-bg p-4 flex items-center justify-between">
          <p className="font-body text-sm text-danger-text">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search by name or sector..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) =>
                e.key === 'Enter' && setPagination((prev) => ({ ...prev, page: 1 }))
              }
              className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>
          <select
            value={filters.sector}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, sector: e.target.value }))
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-3 py-2 border border-border rounded-md text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">All Sectors</option>
            <option value="IT Services">IT Services</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Consulting">Consulting</option>
            <option value="Finance">Finance</option>
            <option value="Education">Education</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, isActive: e.target.value }))
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-3 py-2 border border-border rounded-md text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Companies Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-700 border-t-transparent" />
            <span className="ml-3 font-body text-ink-600">Loading companies...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-ink-600">No companies found</p>
            <p className="font-body text-sm text-ink-400 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Click "Add Company" to create the first one'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="grid">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th
                      className="px-4 py-3 text-left font-heading text-sm font-semibold text-ink-900 cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-heading text-sm font-semibold text-ink-900 cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('sector')}
                    >
                      Sector {sortBy === 'sector' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-heading text-sm font-semibold text-ink-900 cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('hrContact.name')}
                    >
                      HR Contact
                    </th>
                    <th
                      className="px-4 py-3 text-left font-heading text-sm font-semibold text-ink-900 cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('isActive')}
                    >
                      Status {sortBy === 'isActive' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-heading text-sm font-semibold text-ink-900 cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('createdAt')}
                    >
                      Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-right font-heading text-sm font-semibold text-ink-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map((company) => (
                    <tr key={company._id} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 font-body text-sm font-medium text-ink-900">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink-600">
                        {company.sector || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink-600">
                        {company.hrContact?.name} ({company.hrContact?.email})
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={company.isActive ? 'success' : 'neutral'}>
                          {company.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink-500">
                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(company)}
                            className="text-danger hover:bg-danger-bg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                <p className="font-body text-sm text-ink-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} companies
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-surface rounded-xl shadow-raised p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-ink-900">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <Controller
                name="name"
                control={register}
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <Input label="Company Name" error={errors.name?.message} {...field} />
                )}
              />

              {/* Sector */}
              <Controller
                name="sector"
                control={register}
                render={({ field }) => (
                  <Input label="Sector" {...field} placeholder="e.g., IT Services, Manufacturing" />
                )}
              />

              {/* About */}
              <Controller
                name="about"
                control={register}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="font-body text-sm font-semibold text-ink-900">About</label>
                    <textarea
                      {...field}
                      rows={3}
                      className="w-full border border-border bg-surface px-3 py-2 font-body text-sm text-ink-900 placeholder:text-ink-400 rounded-md focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                      placeholder="Brief description of the company..."
                    />
                  </div>
                )}
              />

              {/* HR Contact Section */}
              <div className="border-t border-border pt-5">
                <h3 className="font-heading text-base font-semibold text-ink-900 mb-4">
                  HR Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="hrContact.name"
                    control={register}
                    rules={{ required: 'HR contact name is required' }}
                    render={({ field }) => (
                      <Input
                        label="HR Contact Name"
                        error={errors.hrContact?.name?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="hrContact.email"
                    control={register}
                    rules={{ required: 'Email is required', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                    render={({ field }) => (
                      <Input
                        label="Email"
                        type="email"
                        error={errors.hrContact?.email?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="hrContact.phone"
                    control={register}
                    render={({ field }) => (
                      <Input label="Phone" {...field} placeholder="+91-XXXXXXXXXX" />
                    )}
                  />
                  <Controller
                    name="hrContact.designation"
                    control={register}
                    render={({ field }) => (
                      <Input label="Designation" {...field} placeholder="e.g., HR Manager" />
                    )}
                  />
                </div>
              </div>

              {/* Website */}
              <Controller
                name="website"
                control={register}
                render={({ field }) => (
                  <Input label="Website" type="url" {...field} placeholder="https://company.com" />
                )}
              />

              {/* isActive */}
              <div className="flex items-center gap-2">
                <Controller
                  name="isActive"
                  control={register}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      {...field}
                      className="w-4 h-4 rounded border-border text-primary-700 focus:ring-primary-700"
                    />
                  )}
                />
                <label className="font-body text-sm text-ink-900 cursor-pointer">Active</label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingCompany ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-surface rounded-xl shadow-raised p-6">
            <h3 className="font-heading text-lg font-bold text-ink-900 mb-2">Delete Company</h3>
            <p className="font-body text-sm text-ink-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm._id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompaniesPage
