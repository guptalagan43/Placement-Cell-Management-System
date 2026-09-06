import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute, RoleRoute } from './components/auth/RouteGuards.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import HomePage from './pages/HomePage.jsx'
import DrivesPage from './pages/DrivesPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ComponentPreviewPage from './pages/ComponentPreviewPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Inner routes with auth guards. Separated so AuthProvider wraps at the top level.
function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public login route — redirects away if already authenticated */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected routes under AppLayout */}
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drives"
          element={
            <ProtectedRoute>
              <DrivesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <AboutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/preview"
          element={
            <ProtectedRoute>
              <ComponentPreviewPage />
            </ProtectedRoute>
          }
        />

        {/* Example admin-only route (cosmetic guard) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['coordinator', 'tpo']}>
                <div className="text-center py-12">
                  <h2 className="font-heading text-xl font-bold text-ink-900">Admin Dashboard</h2>
                  <p className="mt-2 font-body text-ink-600">
                    Coordinator/TPO only area (Phase 11 demo)
                  </p>
                </div>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Catch-all redirect for unauthenticated users */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

// Top-level App wraps everything in AuthProvider.
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
