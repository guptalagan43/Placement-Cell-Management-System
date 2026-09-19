// AuditLogPage component tests
// Traces to FR-AUD-02.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AuditLogPage from './AuditLogPage.jsx'
import * as auditLogApi from '../api/auditLog.api.js'

vi.mock('../api/auditLog.api.js')

const mockActors = [
  {
    _id: 'user1',
    name: 'TPO User',
    email: 'tpo@test.com',
    role: 'tpo',
    count: 2,
  },
  {
    _id: 'user2',
    name: 'Coordinator User',
    email: 'coordinator@test.com',
    role: 'coordinator',
    count: 1,
  },
]

const mockActionTypes = [
  'eligibility_override',
  'round_status_update',
  'company_create',
]

const mockAuditLogs = [
  {
    _id: 'log1',
    timestamp: '2024-01-15T10:00:00Z',
    action: 'eligibility_override',
    reason: 'Student has exceptional circumstances',
    actor: {
      _id: 'user1',
      name: 'TPO User',
      email: 'tpo@test.com',
      role: 'tpo',
    },
    target: {
      entityType: 'Application',
      entityId: 'app1',
    },
    metadata: {
      drive: 'drive1',
      student: 'student1',
    },
  },
  {
    _id: 'log2',
    timestamp: '2024-01-16T10:00:00Z',
    action: 'round_status_update',
    reason: 'Student cleared technical round',
    actor: {
      _id: 'user2',
      name: 'Coordinator User',
      email: 'coordinator@test.com',
      role: 'coordinator',
    },
    target: {
      entityType: 'Application',
      entityId: 'app2',
    },
    metadata: {
      round: 'round1',
    },
  },
  {
    _id: 'log3',
    timestamp: '2024-01-17T10:00:00Z',
    action: 'company_create',
    reason: 'New company added for placement season',
    actor: {
      _id: 'user1',
      name: 'TPO User',
      email: 'tpo@test.com',
      role: 'tpo',
    },
    target: {
      entityType: 'Company',
      entityId: 'company1',
    },
    metadata: {},
  },
]

const renderWithRouter = (initialEntries = ['/admin/audit-log']) => {
  const { container, ...rest } = render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/audit-log" element={<AuditLogPage />} />
      </Routes>
    </MemoryRouter>
  )
  return { container, ...rest }
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditLogApi.getAuditLogs.mockResolvedValue({
      auditLogs: mockAuditLogs,
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    })
    auditLogApi.getActionTypes.mockResolvedValue({ actions: mockActionTypes })
    auditLogApi.getActors.mockResolvedValue({ actors: mockActors })
  })

  it('renders page title and description', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Audit Log' })).toBeInTheDocument()
    })
    expect(screen.getByText(/Immutable record of all administrative actions/)).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    const { container } = renderWithRouter()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders audit log table with data', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Student has exceptional circumstances')).toBeInTheDocument()
      expect(screen.getByText('Student cleared technical round')).toBeInTheDocument()
      expect(screen.getByText('New company added for placement season')).toBeInTheDocument()
    })
  })

  it('renders action badges with correct labels', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Action labels appear in both dropdown options and badges - use getAllByText
      expect(screen.getAllByText('Eligibility Override').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Round Status Update').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Company Create').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders actor information', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Actor names appear in table rows - use getAllByText for multiple occurrences
      expect(screen.getAllByText('TPO User').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Coordinator User').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('tpo@test.com').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('coordinator@test.com').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders target entity type badges', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Entity type badges appear in table - there are multiple "Application" in dropdown + badges
      expect(screen.getAllByText('Application').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Company').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('filters by actor', async () => {
    renderWithRouter()
    await waitFor(() => {
      const actorFilter = screen.getByDisplayValue('All Actors')
      expect(actorFilter).toBeInTheDocument()
    })
  })

  it('filters by action', async () => {
    renderWithRouter()
    await waitFor(() => {
      const actionFilter = screen.getByDisplayValue('All Actions')
      expect(actionFilter).toBeInTheDocument()
    })
  })

  it('filters by entity type', async () => {
    renderWithRouter()
    await waitFor(() => {
      const entityFilter = screen.getByDisplayValue('All Entity Types')
      expect(entityFilter).toBeInTheDocument()
    })
  })

  it('has date from and date to filters', async () => {
    renderWithRouter()
    await waitFor(() => {
      const dateFrom = screen.getByPlaceholderText('From')
      const dateTo = screen.getByPlaceholderText('To')
      expect(dateFrom).toBeInTheDocument()
      expect(dateTo).toBeInTheDocument()
    })
  })

  it('shows "No Audit Logs Found" when empty', async () => {
    auditLogApi.getAuditLogs.mockResolvedValueOnce({
      auditLogs: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('No Audit Logs Found')).toBeInTheDocument()
    })
  })

  it('shows pagination when multiple pages', async () => {
    auditLogApi.getAuditLogs.mockResolvedValueOnce({
      auditLogs: mockAuditLogs,
      pagination: { page: 1, limit: 1, total: 3, totalPages: 3 },
    })
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  it('searches by target entity ID', async () => {
    renderWithRouter()
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search by target entity ID...')
      expect(searchInput).toBeInTheDocument()
    })
  })

  it('opens detail modal when row is clicked', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Click on the first row - use the table row that contains the reason text
      const reasonCell = screen.getAllByText('Student has exceptional circumstances')[0]
      const firstRow = reasonCell.closest('tr')
      expect(firstRow).toBeInTheDocument()
      firstRow.click()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Audit Log Details' })).toBeInTheDocument()
    })
  })

  it('shows metadata in detail modal', async () => {
    renderWithRouter()
    await waitFor(() => {
      const reasonCell = screen.getAllByText('Student has exceptional circumstances')[0]
      const firstRow = reasonCell.closest('tr')
      firstRow.click()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Audit Log Details' })).toBeInTheDocument()
      // Verify modal shows the pre tag with JSON metadata
      expect(screen.getByText(/Metadata/)).toBeInTheDocument()
    })
  })

  it('closes detail modal when close button clicked', async () => {
    renderWithRouter()
    await waitFor(() => {
      const reasonCell = screen.getAllByText('Student has exceptional circumstances')[0]
      const firstRow = reasonCell.closest('tr')
      firstRow.click()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Audit Log Details' })).toBeInTheDocument()
    })
    await waitFor(() => {
      const closeButton = screen.getByLabelText('Close')
      closeButton.click()
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Audit Log Details' })).not.toBeInTheDocument()
    })
  })
})