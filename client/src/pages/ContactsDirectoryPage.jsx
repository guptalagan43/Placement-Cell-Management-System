// Contacts Directory Page: All authenticated users can view; TPO can create, edit, delete contacts.
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
  Mail,
  Phone,
  Users,
  User,
  Building2,
} from 'lucide-react'
import * as contactApi from '../api/contact.api.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  role: z.string().min(1, 'Role is required').max(100),
  department: z.string().max(100).optional(),
  email: z.string().email('Valid email is required').max(254).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
})

const ContactForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  title,
  departments,
  roles,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      role: '',
      department: '',
      email: '',
      phone: '',
      ...initialData,
    },
  })

  const watchedName = watch('name')
  const watchedRole = watch('role')
  const watchedDepartment = watch('department')
  const watchedEmail = watch('email')
  const watchedPhone = watch('phone')

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        role: '',
        department: '',
        email: '',
        phone: '',
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
                label="Name *"
                {...register('name')}
                error={errors.name?.message}
                placeholder="e.g., Dr. Rajesh Kumar"
                value={watchedName}
                onChange={(e) => setValue('name', e.target.value)}
              />
              <Input
                label="Role *"
                {...register('role')}
                error={errors.role?.message}
                placeholder="e.g., TPO, Coordinator, HR Representative"
                value={watchedRole}
                onChange={(e) => setValue('role', e.target.value)}
                list="role-options"
              />
              <datalist id="role-options">
                {roles.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Department"
                {...register('department')}
                error={errors.department?.message}
                placeholder="e.g., Computer Science & Engineering"
                value={watchedDepartment}
                onChange={(e) => setValue('department', e.target.value)}
                list="department-options"
              />
              <datalist id="department-options">
                {departments.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>

              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="contact@company.com"
                value={watchedEmail}
                onChange={(e) => setValue('email', e.target.value)}
              />
            </div>

            <Input
              label="Phone"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+91-9876543210"
              value={watchedPhone}
              onChange={(e) => setValue('phone', e.target.value)}
            />
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

export default function ContactsDirectoryPage() {
  const { user } = useAuth()
  const isTPO = user?.role === 'tpo'

  const [contacts, setContacts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', department: '', role: '' })
  const [sort, setSort] = useState({ sortBy: 'name', sortOrder: 'asc' })
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])

  const fetchContacts = useCallback(async () => {
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
      const res = await contactApi.getContacts(params)
      setContacts(res.contacts)
      setPagination(res.pagination)
    } catch (err) {
      setError(err.message || 'Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        contactApi.getContactDepartments(),
        contactApi.getContactRoles(),
      ])
      setDepartments(deptRes.departments)
      setRoles(roleRes.roles)
    } catch (err) {
      console.error('Failed to fetch filter options:', err)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Initial load
  useEffect(() => {
    fetchContacts()
    fetchFilterOptions()
  }, [])

  // Refetch when dependencies change
  useEffect(() => {
    fetchContacts()
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
    setEditingContact(null)
    setModalOpen(true)
  }

  const openEditModal = (contact) => {
    setEditingContact(contact)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingContact(null)
  }

  const handleFormSubmit = async (data) => {
    setSubmitLoading(true)
    setError(null)
    try {
      if (editingContact) {
        await contactApi.updateContact(editingContact._id, data)
        setSuccess('Contact updated successfully')
      } else {
        await contactApi.createContact(data)
        setSuccess('Contact created successfully')
      }
      closeModal()
      fetchContacts()
      fetchFilterOptions()
    } catch (err) {
      setError(err.message || 'Failed to save contact')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (contact) => {
    if (!window.confirm(`Are you sure you want to delete "${contact.name}"?`)) return
    setError(null)
    try {
      await contactApi.deleteContact(contact._id)
      setSuccess('Contact deleted successfully')
      fetchContacts()
      fetchFilterOptions()
    } catch (err) {
      setError(err.message || 'Failed to delete contact')
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const getRoleIcon = (role) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('tpo')) return <Users className="w-4 h-4" />
    if (lowerRole.includes('coordinator')) return <User className="w-4 h-4" />
    if (lowerRole.includes('hr') || lowerRole.includes('representative'))
      return <Building2 className="w-4 h-4" />
    return <User className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Contacts Directory</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Find T&P Cell contacts, coordinators, and company representatives
          </p>
        </div>
        {isTPO && (
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Add Contact
          </Button>
        )}
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
                placeholder="Search by name, role, or department..."
                value={filters.search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-surface text-ink-900 placeholder-ink-400 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
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
                      onClick={() => handleSort('name')}
                    >
                      Contact
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('role')}
                    >
                      Role
                    </th>
                    <th
                      className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider cursor-pointer hover:text-primary-700"
                      onClick={() => handleSort('department')}
                    >
                      Department
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Phone
                    </th>
                    {isTPO && (
                      <th className="px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={isTPO ? 6 : 5} className="px-4 py-12 text-center text-ink-500">
                        No contacts found
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact._id} className="hover:bg-primary-50/50">
                        <td className="px-4 py-4 font-body text-sm text-ink-900 font-medium">
                          {contact.name}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600 flex items-center gap-2">
                          {getRoleIcon(contact.role)}
                          <span>{contact.role}</span>
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600">
                          {contact.department || <span className="text-ink-400">—</span>}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600 flex items-center gap-2">
                          {contact.email ? (
                            <>
                              <Mail className="w-4 h-4 text-ink-400" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary-700 hover:underline"
                              >
                                {contact.email}
                              </a>
                            </>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-body text-sm text-ink-600 flex items-center gap-2">
                          {contact.phone ? (
                            <>
                              <Phone className="w-4 h-4 text-ink-400" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-primary-700 hover:underline"
                              >
                                {contact.phone}
                              </a>
                            </>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        {isTPO && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(contact)}
                                aria-label={`Edit ${contact.name}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(contact)}
                                aria-label={`Delete ${contact.name}`}
                                className="text-danger hover:bg-danger/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
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
                  {pagination.total} contacts
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

      <ContactForm
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingContact}
        isLoading={submitLoading}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        departments={departments}
        roles={roles}
      />
    </div>
  )
}
