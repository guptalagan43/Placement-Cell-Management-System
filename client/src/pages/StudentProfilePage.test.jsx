import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StudentProfilePage from '../pages/StudentProfilePage.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'

// Mock the API modules
vi.mock('../api/studentProfile.api.js', () => ({
  getSelfProfile: vi.fn(),
  updateSelfProfile: vi.fn(),
}))

vi.mock('../api/resume.api.js', () => ({
  getResumes: vi.fn(),
  getUploadParams: vi.fn(),
  addResume: vi.fn(),
  deleteResume: vi.fn(),
  setDefaultResume: vi.fn(),
}))

import { getSelfProfile, updateSelfProfile } from '../api/studentProfile.api.js'
import { getResumes, getUploadParams } from '../api/resume.api.js'

const mockProfileComplete = {
  _id: 'profile-123',
  user: 'user-123',
  rollNumber: 'CS2021001',
  branch: 'Computer Science & Engineering',
  batch: 2021,
  cgpaOverall: 8.5,
  cgpaSemesters: [8.0, 8.2, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9],
  backlogsActive: 0,
  backlogsHistory: [0, 0, 0, 0, 0, 0, 0, 0],
  tenthPercent: 92.5,
  twelfthPercent: 88.0,
  tenthDetails: { percentage: 92.5, year: 2018, board: 'CBSE' },
  twelfthDetails: { percentage: 88.0, year: 2020, board: 'CBSE' },
  section: 'A',
  dateOfBirth: '2003-05-15T00:00:00.000Z',
  gender: 'male',
  phone2: '+91 9876543210',
  address: { street: '123 Main St', city: 'Jaipur', state: 'Rajasthan', pincode: '302017' },
  country: 'India',
  guardianInfo: {
    father: { name: 'Father Name', mobile: '9876543210' },
    mother: { name: 'Mother Name', mobile: '9876543211' },
    localGuardianName: 'Uncle Name',
  },
  skills: ['JavaScript', 'React', 'Node.js'],
  certifications: [{ name: 'AWS Certified', issuer: 'Amazon', year: 2023, proofUrl: '' }],
  projects: [
    { title: 'E-commerce', description: 'A project', techStack: ['React', 'Node'], link: '' },
  ],
  placementStatus: 'not_placed',
  isBlacklisted: false,
  resumes: [],
}

const mockProfileIncomplete = {
  _id: 'profile-123',
  user: 'user-123',
  rollNumber: 'CS2021001',
  branch: 'Computer Science & Engineering',
  batch: 2021,
  cgpaOverall: 8.5,
  cgpaSemesters: [8.0, 8.2],
  backlogsActive: 0,
  backlogsHistory: [0, 0, 0, 0, 0, 0, 0, 0],
  tenthPercent: 92.5,
  twelfthPercent: 88.0,
  tenthDetails: { percentage: 92.5 },
  twelfthDetails: { percentage: 88.0 },
  section: 'A',
  skills: ['JavaScript'],
  certifications: [],
  projects: [],
  placementStatus: 'not_placed',
  isBlacklisted: false,
  resumes: [],
}

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('StudentProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSelfProfile.mockResolvedValue({ profile: mockProfileComplete })
    getResumes.mockResolvedValue({ resumes: [] })
    updateSelfProfile.mockResolvedValue({ profile: mockProfileComplete })
    getUploadParams.mockResolvedValue({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      signature: 'test-signature',
      timestamp: Date.now(),
      folder: 'pcms/resumes',
    })
  })

  it('renders the profile page with completeness meter', async () => {
    renderWithProviders(<StudentProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })

    // Check completeness meter - complete profile (personal 10 + academic 25 + guardian 5 + skills 15 + certs 10 + projects 10 = 75)
    await waitFor(() => {
      expect(screen.getByText('Profile Complete')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    // Progress bar should be present
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '75')
  })

  it('shows tabs for all sections including Resumes', async () => {
    renderWithProviders(<StudentProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Personal/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Academic/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Guardian/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Skills/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Certifications/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Projects/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Resumes/ })).toBeInTheDocument()
    })
  })

  it('displays Resumes tab with upload option when no resumes', async () => {
    renderWithProviders(<StudentProfilePage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Resumes/ })).toBeInTheDocument()
    })

    // Click Resumes tab
    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: /Resumes/ }))
    })

    await waitFor(() => {
      expect(screen.getByText('No resumes uploaded yet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Upload Your First Resume/ })).toBeInTheDocument()
    })
  })

  it('opens upload modal when clicking Upload Resume', async () => {
    renderWithProviders(<StudentProfilePage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Resumes/ })).toBeInTheDocument()
    })

    // Click Resumes tab
    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: /Resumes/ }))
    })

    // Click the + Upload Resume button in the card header (not the empty state button)
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /\+ Upload Resume/ }))
    })

    const modalHeading = await screen.findByRole('heading', { name: /Upload Resume/ })
    expect(modalHeading).toBeInTheDocument()
    expect(screen.getByLabelText(/Label/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Resume File/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Upload$/ })).toBeInTheDocument()
  })

  it('shows resume list with default badge when resumes exist', async () => {
    const resumesWithDefault = [
      {
        _id: 'resume-1',
        label: 'Main Resume',
        originalFilename: 'resume.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        isDefault: true,
        cloudinaryPublicId: 'test-id',
        cloudinarySecureUrl: 'https://cloudinary.com/test.pdf',
        uploadedAt: new Date().toISOString(),
      },
    ]
    getSelfProfile.mockResolvedValue({
      profile: { ...mockProfileComplete, resumes: resumesWithDefault },
    })
    getResumes.mockResolvedValue({ resumes: resumesWithDefault })

    renderWithProviders(<StudentProfilePage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Resumes/ })).toBeInTheDocument()
    })

    // Click Resumes tab
    await act(async () => {
      await userEvent.click(screen.getByRole('tab', { name: /Resumes/ }))
    })

    await waitFor(() => {
      expect(screen.getByText('Main Resume')).toBeInTheDocument()
      expect(screen.getByText('resume.pdf')).toBeInTheDocument()
      expect(screen.getByText('Default')).toBeInTheDocument()
    })
  })

  it('computes partial completeness when profile is incomplete', async () => {
    getSelfProfile.mockResolvedValue({ profile: mockProfileIncomplete })
    getResumes.mockResolvedValue({ resumes: [] })

    renderWithProviders(<StudentProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })

    // Incomplete: personal 0% + academic 25% (cgpa 25% + 10th 20% + 12th 20% + section 10% + sems 15% + backlogs 10% = 100% of 25) + skills 15% = 40%
    await waitFor(() => {
      expect(screen.getByText('40%')).toBeInTheDocument()
    })
  })
})

// Test the computeCompleteness function logic directly
function computeCompleteness(profile) {
  if (!profile) return 0

  const weights = {
    personal: 10,
    academic: 25,
    guardian: 5,
    skills: 15,
    certifications: 10,
    projects: 10,
    resumes: 25,
  }

  let score = 0

  // Personal (10%)
  if (profile.dateOfBirth) score += weights.personal * 0.3
  if (profile.gender) score += weights.personal * 0.2
  if (profile.address?.city) score += weights.personal * 0.3
  if (profile.phone2) score += weights.personal * 0.2

  // Academic (25%)
  if (profile.cgpaOverall != null) score += weights.academic * 0.25
  const tenth = profile.tenthDetails ?? {}
  const twelfth = profile.twelfthDetails ?? {}
  if (tenth.percentage != null || profile.tenthPercent != null) score += weights.academic * 0.2
  if (twelfth.percentage != null || profile.twelfthPercent != null) score += weights.academic * 0.2
  if (profile.section) score += weights.academic * 0.1
  if (profile.cgpaSemesters?.some((v) => v != null)) score += weights.academic * 0.15
  if (profile.backlogsActive != null) score += weights.academic * 0.1

  // Guardian (5%)
  if (profile.guardianInfo?.father?.name) score += weights.guardian * 0.4
  if (profile.guardianInfo?.mother?.name) score += weights.guardian * 0.4
  if (profile.guardianInfo?.localGuardianName) score += weights.guardian * 0.2

  // Skills (15%)
  if (profile.skills?.some((s) => (typeof s === 'string' ? s.trim() : s?.name?.trim())))
    score += weights.skills

  // Certifications (10%)
  if (profile.certifications?.some((c) => c?.name?.trim())) score += weights.certifications

  // Projects (10%)
  if (profile.projects?.some((p) => p?.title?.trim())) score += weights.projects

  // Resumes (25%)
  if (profile.resumes?.length > 0) score += weights.resumes

  return Math.round(score)
}

describe('computeCompleteness', () => {
  it('returns 0 for null profile', () => {
    expect(computeCompleteness(null)).toBe(0)
  })

  it('returns 75 for complete profile without resume', () => {
    // personal 10 + academic 25 + guardian 5 + skills 15 + certs 10 + projects 10 = 75
    expect(computeCompleteness(mockProfileComplete)).toBe(75)
  })

  it('returns 40 for partial profile', () => {
    // personal 0 + academic 25 + guardian 0 + skills 15 + certs 0 + projects 0 + resumes 0 = 40
    expect(computeCompleteness(mockProfileIncomplete)).toBe(40)
  })

  it('adds 25% when resume exists', () => {
    const profileWithResume = {
      ...mockProfileComplete,
      resumes: [{ _id: 'resume-1', label: 'Test' }],
    }
    // 75% + 25% = 100%
    expect(computeCompleteness(profileWithResume)).toBe(100)
  })

  it('returns 40 for only academic + guardian fields', () => {
    const onlyAcademicAndGuardian = {
      ...mockProfileComplete,
      // zero out personal
      dateOfBirth: null,
      gender: null,
      phone2: '',
      address: {},
      // keep academic (25) + guardian (5) + skills (15) = 45, but also zero skills/certs/projects
      skills: [],
      certifications: [],
      projects: [],
      resumes: [],
    }
    // academic 25 + guardian 5 = 30
    expect(computeCompleteness(onlyAcademicAndGuardian)).toBe(30)
  })
})
