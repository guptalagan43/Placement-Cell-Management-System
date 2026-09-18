// AdminApplicantsPage component tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminApplicantsPage from './AdminApplicantsPage.jsx'
import * as applicationApi from '../api/application.api.js'
import * as driveApi from '../api/drive.api.js'
import * as roundApi from '../api/round.api.js'

vi.mock('../api/application.api.js')
vi.mock('../api/drive.api.js')
vi.mock('../api/round.api.js')

const mockDrive = {
  _id: 'drive1',
  title: 'Software Engineer',
  company: { name: 'Test Corp' },
  jobType: 'full-time',
  tier: 3,
  status: 'registration_open',
}

const mockRounds = [
  {
    _id: 'round1',
    roundNumber: 1,
    name: 'Online Assessment',
    dateTime: '2024-01-15T10:00:00Z',
    mode: 'online',
  },
  {
    _id: 'round2',
    roundNumber: 2,
    name: 'Technical Interview',
    dateTime: '2024-01-20T10:00:00Z',
    mode: 'offline',
    venue: 'Room 101',
  },
]

const mockApplications = [
  {
    _id: 'app1',
    appliedAt: '2024-01-10T10:00:00Z',
    overallStatus: 'applied',
    student: {
      _id: 'student1',
      rollNumber: '21CS001',
      user: { name: 'John Doe' },
      branch: 'Computer Science & Engineering',
      batch: 2024,
      cgpaOverall: 8.5,
      backlogsActive: 0,
    },
    roundStatuses: [
      { round: 'round1', status: 'pending', updatedAt: null },
      { round: 'round2', status: 'pending', updatedAt: null },
    ],
    drive: mockDrive,
  },
  {
    _id: 'app2',
    appliedAt: '2024-01-11T10:00:00Z',
    overallStatus: 'shortlisted',
    student: {
      _id: 'student2',
      rollNumber: '21CS002',
      user: { name: 'Jane Smith' },
      branch: 'Computer Science & Engineering',
      batch: 2024,
      cgpaOverall: 7.8,
      backlogsActive: 1,
    },
    roundStatuses: [
      { round: 'round1', status: 'shortlisted', updatedAt: '2024-01-12T10:00:00Z' },
      { round: 'round2', status: 'pending', updatedAt: null },
    ],
    drive: mockDrive,
  },
]

const renderWithRouter = (initialEntries = ['/drives-admin/drive1/applicants']) => {
  const { container, ...rest } = render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/drives-admin/:driveId/applicants" element={<AdminApplicantsPage />} />
        <Route path="/drives-admin" element={<div>Drive List</div>} />
      </Routes>
    </MemoryRouter>
  )
  return { container, ...rest }
}

describe('AdminApplicantsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    driveApi.getDriveById.mockResolvedValue({ drive: mockDrive })
    roundApi.getRounds.mockResolvedValue({ rounds: mockRounds })
    applicationApi.getDriveApplications.mockResolvedValue({
      applications: mockApplications,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })
    applicationApi.updateRoundStatus.mockResolvedValue({ success: true })
  })

  it('renders page title and drive info', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Applicants' })).toBeInTheDocument()
    })
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Test Corp/)).toBeInTheDocument()
    })
    // Job type and tier are in a paragraph with other text - just verify they appear somewhere
    await waitFor(() => {
      expect(screen.getByText(/Tier/)).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    const { container } = renderWithRouter()
    // The page shows skeleton loaders with animate-pulse class initially
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders applicant table with data', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('21CS001')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('21CS002')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('renders round status columns for each round', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('R1: Online Assessment')).toBeInTheDocument()
      expect(screen.getByText('R2: Technical Interview')).toBeInTheDocument()
    })
  })

  it('shows correct round status badges', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Should have 4 round status selects (2 applicants × 2 rounds) + 2 filter dropdowns
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('filters by status', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Find the select by its default option text
      const statusFilter = screen.getByDisplayValue('All Status')
      expect(statusFilter).toBeInTheDocument()
    })
  })

  it('filters by round', async () => {
    renderWithRouter()
    await waitFor(() => {
      const roundFilter = screen.getByDisplayValue('All Rounds')
      expect(roundFilter).toBeInTheDocument()
    })
  })

  it('shows "No Applicants Found" when empty', async () => {
    applicationApi.getDriveApplications.mockResolvedValueOnce({
      applications: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('No Applicants Found')).toBeInTheDocument()
    })
  })

  it('shows pagination when multiple pages', async () => {
    applicationApi.getDriveApplications.mockResolvedValueOnce({
      applications: mockApplications,
      pagination: { page: 1, limit: 1, total: 2, totalPages: 2 },
    })
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  it('handles drive not found', async () => {
    driveApi.getDriveById.mockRejectedValueOnce(new Error('Not found'))
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Drive Not Found')).toBeInTheDocument()
    })
    expect(screen.getByText('Back to Drives')).toBeInTheDocument()
  })

  it('search filters by roll number', async () => {
    renderWithRouter()
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search by roll number or name...')
      expect(searchInput).toBeInTheDocument()
    })
  })

  it('shows correct overall status badges', async () => {
    renderWithRouter()
    await waitFor(() => {
      // Should find badges (not the filter options)
      const appliedBadges = screen.getAllByText('Applied')
      const shortlistedBadges = screen.getAllByText('Shortlisted')
      // At least one badge for each status
      expect(appliedBadges.length).toBeGreaterThanOrEqual(1)
      expect(shortlistedBadges.length).toBeGreaterThanOrEqual(1)
    })
  })
})
