// My Applications Page tests.
// Tests rendering, filtering, pagination, withdraw modal, and empty state.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the application API module
const mockGetMyApplications = vi.fn()
const mockWithdrawApplication = vi.fn()

vi.mock('../api/application.api.js', () => ({
  getMyApplications: (...args) => mockGetMyApplications(...args),
  withdrawApplication: (...args) => mockWithdrawApplication(...args),
  default: {
    getMyApplications: (...args) => mockGetMyApplications(...args),
    withdrawApplication: (...args) => mockWithdrawApplication(...args),
  },
}))

import MyApplicationsPage from './MyApplicationsPage.jsx'

const sampleApplication = {
  _id: 'app-001',
  drive: {
    _id: 'drive-001',
    title: 'Software Engineer',
    company: { _id: 'company-001', name: 'Test Corp' },
    jobType: 'full-time',
    compensation: { ctcLpa: 12, stipend: 0, currency: 'INR' },
    status: 'registration_open',
  },
  overallStatus: 'applied',
  appliedAt: '2026-09-01T00:00:00Z',
  roundStatuses: [
    { round: 'round-001', status: 'pending' },
    { round: 'round-002', status: 'shortlisted' },
  ],
}

const sampleApplicationWithdrawn = {
  _id: 'app-002',
  drive: {
    _id: 'drive-002',
    title: 'Data Analyst',
    company: { _id: 'company-002', name: 'Data Inc' },
    jobType: 'internship',
    compensation: { ctcLpa: 6, stipend: 0, currency: 'INR' },
    status: 'registration_closed',
  },
  overallStatus: 'withdrawn',
  appliedAt: '2026-09-02T00:00:00Z',
  roundStatuses: [],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/applications/my']}>
      <MyApplicationsPage />
    </MemoryRouter>
  )
}

describe('MyApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMyApplications.mockResolvedValue({
      applications: [sampleApplication, sampleApplicationWithdrawn],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    })
  })

  it('renders the page heading', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my applications/i })).toBeInTheDocument()
    })
  })

  it('renders applications in a table', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('Test Corp')).toBeInTheDocument()
    expect(screen.getByText('Data Analyst')).toBeInTheDocument()
  })

  it('shows status badges with correct labels', async () => {
    renderPage()
    await waitFor(() => {
      // 'Applied' appears both as a dropdown option and as a status badge
      const appliedElements = screen.getAllByText('Applied')
      expect(appliedElements.length).toBeGreaterThanOrEqual(2) // option + badge
    })
    // 'Withdrawn' only appears once (badge; it's also an option, but the text matches)
    const withdrawnElements = screen.getAllByText('Withdrawn')
    expect(withdrawnElements.length).toBeGreaterThanOrEqual(2) // option + badge
  })

  it('shows round status badges', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
    // 'Shortlisted' appears both as dropdown option and as round badge
    const shortlistedElements = screen.getAllByText('Shortlisted')
    expect(shortlistedElements.length).toBeGreaterThanOrEqual(2) // option + badge
  })

  it('renders status filter dropdown', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument()
    })
  })

  it('calls API with filter when status is selected', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument()
    })

    const select = screen.getByDisplayValue('All Status')
    fireEvent.change(select, { target: { value: 'applied' } })

    await waitFor(() => {
      expect(mockGetMyApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'applied' })
      )
    })
  })

  it('shows empty state when no applications exist', async () => {
    mockGetMyApplications.mockResolvedValue({
      applications: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No Applications Found')).toBeInTheDocument()
    })
    expect(screen.getByText("You haven't applied to any drives yet")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse drives/i })).toBeInTheDocument()
  })

  it('shows withdraw button only for withdrawable applications', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    // The first application (registration_open + applied) should have a withdraw button
    expect(screen.getByLabelText('Withdraw application for Software Engineer')).toBeInTheDocument()
    // The second application (registration_closed + withdrawn) should NOT have a withdraw button
    expect(screen.queryByLabelText('Withdraw application for Data Analyst')).not.toBeInTheDocument()
  })

  it('opens withdraw confirmation modal when clicking withdraw', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Withdraw application for Software Engineer'))
    expect(screen.getByRole('heading', { name: /withdraw application/i })).toBeInTheDocument()
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })

  it('handles withdraw API error in modal', async () => {
    mockWithdrawApplication.mockRejectedValue(new Error('Withdrawal not allowed'))

    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Withdraw application for Software Engineer'))
    fireEvent.click(screen.getByRole('button', { name: /^withdraw$/i }))

    await waitFor(() => {
      expect(screen.getByText('Withdrawal not allowed')).toBeInTheDocument()
    })
  })

  it('shows error alert when API fails', async () => {
    mockGetMyApplications.mockRejectedValue(new Error('Network error'))

    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('shows "No rounds" text when roundStatuses is empty', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No rounds')).toBeInTheDocument()
    })
  })
})
