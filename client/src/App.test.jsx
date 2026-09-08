import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the auth context module so useAuth returns our controlled state
const mockLogin = vi.fn()
const mockLogout = vi.fn()
let mockAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  login: mockLogin,
  logout: mockLogout,
}

vi.mock('./context/AuthContext.jsx', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => mockAuthState,
  }
})

import App from './App.jsx'

// Mock user for testing
const mockUser = {
  email: 'test@student.skit.ac.in',
  role: 'student',
  department: 'Computer Science & Engineering',
}

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App routing with auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('unauthenticated', () => {
    beforeEach(() => {
      mockAuthState = {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        loading: false,
        login: mockLogin,
        logout: mockLogout,
      }
    })

    it('redirects unauthenticated user to /login', () => {
      renderApp('/')
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('redirects unauthenticated user from /drives to /login', () => {
      renderApp('/drives')
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('redirects unauthenticated user from /about to /login', () => {
      renderApp('/about')
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })
  })

  describe('authenticated', () => {
    beforeEach(() => {
      mockAuthState = {
        user: mockUser,
        accessToken: 'mock-access-token',
        isAuthenticated: true,
        loading: false,
        login: mockLogin,
        logout: mockLogout,
      }
    })

    it('renders the Home page for authenticated user', () => {
      renderApp('/')
      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    })

    it('renders the Drives page for authenticated user', () => {
      renderApp('/drives')
      expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()
    })

    it('renders the About page for authenticated user', () => {
      renderApp('/about')
      expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    })

    it('renders the 404 page for an unknown route (authenticated)', () => {
      renderApp('/no-such-route')
      expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
    })

    it('renders the layout shell (header nav + sidebar) for authenticated user', () => {
      renderApp('/')
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
      expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument()
    })

    it('navigates between routes via the header nav for authenticated user', () => {
      renderApp('/')
      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('link', { name: 'Drives' }))
      expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('link', { name: 'About' }))
      expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    })

    it('hides admin nav for student role', () => {
      renderApp('/')
      expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('shows user name and role in header', () => {
      renderApp('/')
      expect(screen.getByText(mockUser.email)).toBeInTheDocument()
      expect(screen.getByText('student')).toBeInTheDocument()
    })

    it('shows logout button for authenticated user', () => {
      renderApp('/')
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    })
  })

  describe('role-based nav', () => {
    it('shows admin nav for coordinator role', () => {
      mockAuthState = {
        user: { ...mockUser, role: 'coordinator' },
        accessToken: 'mock-access-token',
        isAuthenticated: true,
        loading: false,
        login: mockLogin,
        logout: mockLogout,
      }
      renderApp('/')
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    })

    it('shows admin nav for TPO role', () => {
      mockAuthState = {
        user: { ...mockUser, role: 'tpo' },
        accessToken: 'mock-access-token',
        isAuthenticated: true,
        loading: false,
        login: mockLogin,
        logout: mockLogout,
      }
      renderApp('/')
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    })
  })
})
