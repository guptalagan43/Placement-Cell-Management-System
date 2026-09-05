import { NavLink, Outlet } from 'react-router-dom'

// Base layout shell: a header bar and an (intentionally empty) sidebar
// container wrapping the routed content. Real header/sidebar content and the
// design system land in later phases; the minimal nav here exists only so
// route navigation is demonstrable in this skeleton.
const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/drives', label: 'Drives' },
  { to: '/about', label: 'About' },
]

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">PCMS</span>
        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="app-body">
        <aside className="app-sidebar" aria-label="Sidebar" />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
