// Company List Page: Coordinator/TPO can view, create, edit, delete companies.
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit, Trash2, X, Loader2, Building2 } from 'lucide-react'
import * as companyApi from '../api/company.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  sector: z.string().max(100).optional(),
  about: z.string().max(2000).optional(),
  hrContact: z.object({
    name: z.string().min(1, 'HR contact name is required').max(100),
    email: z.string().email('Valid email is required').max(254),
    phone: z.string().max(20).optional(),
    designation: z.string().max(100).optional(),
  }),
  website: z.string().url('Valid URL required').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

const CompanyForm = ({ isOpen, onClose, onSubmit, initialData, isLoading, title }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      sector: '',
      about: '',
      hrContact: { name: '', email: '', phone: '', designation: '' },
      website: '',
      isActive: true,
      ...initialData,
    },
  })

  const hrName = watch('hrContact.name')
  const hrEmail = watch('hrContact.email')
  const hrPhone = watch('hrContact.phone')
  const hrDesignation = watch('hrContact.designation')

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        sector: '',
        about: '',
        hrContact: { name: '', email: '', phone: '', designation: '' },
        website: '',
        isActive: true,
        ...initialData,
      })
    }
  }, [isOpen, initialData, reset])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl shadow-raised w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-ink-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Company Name *"
                {...register('name')}
                error={errors.name?.message}
                placeholder="e.g., Acme Corporation Pvt Ltd"
              />
              <Input
                label="Sector"
                {...register('sector')}
                error={errors.sector?.message}
                placeholder="e.g., IT Services, Manufacturing"
              />
            </div>

            <Input
              label="Website"
              {...register('website')}
              error={errors.website?.message}
              placeholder="https://company.com"
            />

            <div>
              <label className="font-body text-sm font-medium text-ink-900 block mb-1.5">
                About
              </label>
              <textarea
                {...register('about')}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
                placeholder="Brief description of the company..."
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-body text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                HR Contact
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="HR Name *"
                  {...register('hrContact.name')}
                  error={errors.hrContact?.name?.message}
                  value={hrName}
                  onChange={(e) => setValue('hrContact.name', e.target.value)}
                />
                <Input
                  label="HR Email *"
                  type="email"
                  {...register('hrContact.email')}
                  error={errors.hrContact?.email?.message}
                  value={hrEmail}
                  onChange={(e) => setValue('hrContact.email', e.target.value)}
                />
                <Input
                  label="HR Phone"
                  {...register('hrContact.phone')}
                  error={errors.hrContact?.phone?.message}
                  value={hrPhone}
                  onChange={(e) => setValue('hrContact.phone', e.target.value)}
                  placeholder="+91-9876543210"
                />
                <Input
                  label="Designation"
                  {...register('hrContact.designation')}
                  error={errors.hrContact?.designation?.message}
                  value={hrDesignation}
                  onChange={(e) => setValue('hrContact.designation', e.target.value)}
                  placeholder="HR Manager"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isActive')}
                id="isActive"
                className="w-4 h-4 rounded border-border text-primary-700 focus:ring-primary-700"
              />
              <label htmlFor="isActive" className="font-body text-sm text-ink-600">
                Active (visible in drive creation dropdowns)
              </label>
            </div>
          </div>

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

export default function CompanyListPage() {
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', sector: '', isActive: '' })
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' })
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchCompanies = useCallback(async () => {
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
      const res = await companyApi.getCompanies(params)
      setCompanies(res.companies)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters])

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Initial load
  useEffect(() => {
    fetchCompanies()
  }, [])

  // Refetch when dependencies change
  useEffect(() => {
    fetchCompanies()
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
    setEditingCompany(null)
    setModalOpen(true)
  }

  const openEditModal = (company) => {
    setEditingCompany(company)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCompany(null)
  }

  const handleFormSubmit = async (data) => {
    setSubmitLoading(true)
    setError(null)
    try {
      if (editingCompany) {
        await companyApi.updateCompany(editingCompany._id, data)
        setSuccess('Company updated successfully')
      } else {
        await companyApi.createCompany(data)
        setSuccess('Company created successfully')
      }
      closeModal()
      fetchCompanies()
    } catch (err) {
      setError(err.message || 'Failed to save company')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (company) => {
    if (!window.confirm(`Are you sure you want to delete "${company.name}"?`)) return
    setError(null)
    try {
      await companyApi.deleteCompany(company._id)
      setSuccess('Company deleted successfully')
      fetchCompanies()
    } catch (err) {
      setError(err.message || 'Failed to delete company')
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Companies</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Manage companies that run recruitment drives
          </p>
        </div>
        <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
          Add Company
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
                placeholder="Search by name or sector..."
                value={filters.search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filters.sector}
                onChange={(e) => handleFilterChange('sector', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Sectors</option>
                <option value="IT Services">IT Services</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
              </select>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                      onClick={() => handleSort('name')}
                    >
                      Company
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('sector')}
                    >
                      Sector
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('isActive')}
                    >
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-ink-500">
                        No companies found
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr key={company._id} className="hover:bg-primary-50/50">
                        <td className="px-4 py-4 font-body text-sm text-ink-900">{company.name}</td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {company.sector || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={company.isActive ? 'success' : 'neutral'} size="sm">
                            {company.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(company)}
                              aria-label={`Edit ${company.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(company)}
                              aria-label={`Delete ${company.name}`}
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

      <CompanyForm
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingCompany}
        isLoading={submitLoading}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
      />
    </div>
  )
}
