import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'

// Mock user for testing
const mockUser = {
  email: 'test@student.skit.ac.in',
  role: 'student',
  department: 'Computer Science & Engineering',
}

// Test wrapper that provides authenticated AuthContext
function renderWithAuth(path, user = mockUser) {
  function TestWrapper({ children }) {
    const mockAuth = {
      user,
      accessToken: 'mock-access-token',
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }
    return <AuthProvider value={mockAuth}>{children}</AuthProvider>
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <TestWrapper>
        <App />
      </TestWrapper>
    </MemoryRouter>
  )
}

function renderPreview() {
  renderWithAuth('/preview')
}

describe('Component preview route', () => {
  it('resolves /preview to the preview page', () => {
    renderPreview()
    expect(screen.getByRole('heading', { level: 1, name: 'Component Preview' })).toBeInTheDocument()
  })

  it('renders every button variant plus its disabled state', () => {
    renderPreview()
    for (const name of [
      'Primary',
      'Outline',
      'Danger',
      'Primary disabled',
      'Outline disabled',
      'Danger disabled',
      'Full-width (in forms)',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Primary disabled' })).toBeDisabled()
  })

  it('renders every semantic badge tone', () => {
    renderPreview()
    for (const label of ['Eligible', 'Rejected', 'Pending', 'Draft', 'Info']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders resting and raised cards', () => {
    renderPreview()
    expect(screen.getByRole('heading', { name: 'Resting card' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Raised card' })).toBeInTheDocument()
  })

  it('renders the input variants including the search field', () => {
    renderPreview()
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email (disabled)')).toBeDisabled()
    expect(screen.getByText('Roll number is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Search actions')).toBeInTheDocument()
  })
})
