import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

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

// Wrapper for unauthenticated state
function renderUnauthenticated(path) {
  function TestWrapper({ children }) {
    const mockAuth = {
      user: null,
      accessToken: null,
      isAuthenticated: false,
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

describe('App routing with auth', () => {
  it('redirects unauthenticated user to /login', () => {
    renderUnauthenticated('/')
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('redirects unauthenticated user from /drives to /login', () => {
    renderUnauthenticated('/drives')
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('redirects unauthenticated user from /about to /login', () => {
    renderUnauthenticated('/about')
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('renders the Home page for authenticated user', () => {
    renderWithAuth('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders the Drives page for authenticated user', () => {
    renderWithAuth('/drives')
    expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()
  })

  it('renders the About page for authenticated user', () => {
    renderWithAuth('/about')
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('renders the 404 page for an unknown route (authenticated)', () => {
    renderWithAuth('/no-such-route')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })

  it('renders the layout shell (header nav + sidebar) for authenticated user', () => {
    renderWithAuth('/')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument()
  })

  it('navigates between routes via the header nav for authenticated user', () => {
    renderWithAuth('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Drives' }))
    expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('shows admin nav for coordinator role', () => {
    const coordinatorUser = { ...mockUser, role: 'coordinator' }
    renderWithAuth('/', coordinatorUser)
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  })

  it('shows admin nav for TPO role', () => {
    const tpoUser = { ...mockUser, role: 'tpo' }
    renderWithAuth('/', tpoUser)
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
  })

  it('hides admin nav for student role', () => {
    renderWithAuth('/')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows user name and role in header', () => {
    renderWithAuth('/')
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    expect(screen.getByText('student')).toBeInTheDocument()
  })

  it('shows logout button for authenticated user', () => {
    renderWithAuth('/')
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })
})
