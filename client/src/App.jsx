import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute, RoleRoute } from './components/auth/RouteGuards.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ActivatePage from './pages/ActivatePage.jsx'
import StudentProfilePage from './pages/StudentProfilePage.jsx'
import CompanyListPage from './pages/CompanyListPage.jsx'
import DriveListPage from './pages/DriveListPage.jsx'
import StudentDriveListPage from './pages/StudentDriveListPage.jsx'
import DriveDetailPage from './pages/DriveDetailPage.jsx'
import MyApplicationsPage from './pages/MyApplicationsPage.jsx'
import AdminApplicantsPage from './pages/AdminApplicantsPage.jsx'
import AuditLogPage from './pages/AuditLogPage.jsx'
import OfferResponsePage from './pages/OfferResponsePage.jsx'
import RulesPage from './pages/RulesPage.jsx'
import AnnouncementBoardPage from './pages/AnnouncementBoardPage.jsx'
import ContactsDirectoryPage from './pages/ContactsDirectoryPage.jsx'
import FAQPage from './pages/FAQPage.jsx'
import HomePage from './pages/HomePage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import ComponentPreviewPage from './pages/ComponentPreviewPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
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

      {/* Public forgot/reset password routes */}
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />

      {/* Public activation route — redirects away if already authenticated */}
      <Route
        path="/activate"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ActivatePage />}
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

        {/* Student Profile Page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Rules & Regulations Page (all authenticated users) */}
        <Route
          path="/rules"
          element={
            <ProtectedRoute>
              <RulesPage />
            </ProtectedRoute>
          }
        />

        {/* Announcement Board (all authenticated users) */}
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementBoardPage />
            </ProtectedRoute>
          }
        />
        {/* Contacts Directory (all authenticated users) */}
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsDirectoryPage />
            </ProtectedRoute>
          }
        />
        {/* FAQ / Help Center (all authenticated users) */}
        <Route
          path="/faq"
          element={
            <ProtectedRoute>
              <FAQPage />
            </ProtectedRoute>
          }
        />
        {/* Notifications Page (all authenticated users) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Drive List (all authenticated users) */}
        <Route
          path="/drives"
          element={
            <ProtectedRoute>
              <StudentDriveListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drives/:id"
          element={
            <ProtectedRoute>
              <DriveDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications/my"
          element={
            <ProtectedRoute>
              <MyApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offers/:offerId/respond"
          element={
            <ProtectedRoute>
              <OfferResponsePage />
            </ProtectedRoute>
          }
        />

        {/* Company Management (Coordinator/TPO only) */}
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['coordinator', 'tpo']}>
                <CompanyListPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Drive Management (Coordinator/TPO only) */}
        <Route
          path="/drives-admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['coordinator', 'tpo']}>
                <DriveListPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/drives-admin/:driveId/applicants"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['coordinator', 'tpo']}>
                <AdminApplicantsPage />
              </RoleRoute>
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

        {/* Audit Log (TPO only) */}
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['tpo']}>
                <AuditLogPage />
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
