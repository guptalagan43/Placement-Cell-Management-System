import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../lib/cn.js'

// Base layout shell: a header bar and an (intentionally empty) sidebar
// container wrapping the routed content, now styled with the Phase 4 design
// tokens. Real header/sidebar content lands in later phases; the nav here
// exists so route navigation is demonstrable and to reach the component
// preview during design work.
const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/drives', label: 'Drives' },
  { to: '/about', label: 'About' },
  { to: '/preview', label: 'Components' },
]

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-6 border-b border-border bg-surface px-6 py-3">
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
