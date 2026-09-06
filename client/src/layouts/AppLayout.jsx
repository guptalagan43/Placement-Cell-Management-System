import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from '../lib/cn.js'
import Button from '../components/ui/Button.jsx'

// Base layout shell: header with auth-aware nav, sidebar container, outlet.
const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/drives', label: 'Drives' },
  { to: '/about', label: 'About' },
  { to: '/preview', label: 'Components' },
]

const adminNavItems = [{ to: '/admin', label: 'Admin' }]

export default function AppLayout() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-6 border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-heading text-base font-bold tracking-tight text-primary-700">
            PCMS
          </span>
          <nav className="flex gap-4" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'font-body text-sm text-ink-600 transition-colors hover:text-ink-900',
                    isActive && 'font-semibold text-primary-700'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <nav className="flex gap-4" aria-label="Admin">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'font-body text-sm text-ink-600 transition-colors hover:text-ink-900',
                      isActive && 'font-semibold text-primary-700'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="font-body text-sm font-semibold text-ink-900">
                  {user?.name ?? user?.email}
                </p>
                <p className="font-body text-xs text-primary-700 capitalize">{user?.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>
      <div className="flex flex-1">
        <aside className="w-60 border-r border-border" aria-label="Sidebar" />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
