import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'

// Mock the auth context module so useAuth returns authenticated state
const mockUser = {
  email: 'test@student.skit.ac.in',
  role: 'student',
  department: 'Computer Science & Engineering',
}

vi.mock('../context/AuthContext.jsx', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      accessToken: 'mock-access-token',
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  }
})

import App from '../App.jsx'

function renderPreview() {
  render(
    <MemoryRouter initialEntries={['/preview']}>
      <App />
    </MemoryRouter>
  )
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
