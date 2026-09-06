import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// ProtectedRoute: redirects unauthenticated users to /login with the
// attempted destination preserved in location.state (so we can redirect back).
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-700 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// RoleRoute: wraps children and redirects if user's role is not in allowedRoles.
// This is COSMETIC only — real authorization is enforced server-side (Phase 8/9).
export function RoleRoute({ allowedRoles, children, fallback = null }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    return fallback ?? <Navigate to="/" replace />
  }

  return children
}

export default { ProtectedRoute, RoleRoute }
