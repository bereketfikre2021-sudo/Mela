/**
 * AdminApp — completely separate React tree for the admin panel.
 * Mounted only when window.location.pathname starts with /admin.
 * Zero imports from the customer-facing app except supabase + env.
 */
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './lib/AdminAuthContext'
import { AdminLayout } from './components/AdminLayout'
import { AdminLoginPage }    from './pages/AdminLoginPage'
import { DashboardPage }     from './pages/DashboardPage'
import { UsersPage }         from './pages/UsersPage'
import { UserDetailPage }    from './pages/UserDetailPage'
import { PaymentsPage }      from './pages/PaymentsPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { PlanLimitsPage }    from './pages/PlanLimitsPage'
import { StaffAdminPage }    from './pages/StaffAdminPage'
import { ActivityPage }      from './pages/ActivityPage'

function AdminCallbackPage() {
  const { status } = useAdminAuth()
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white text-sm">Signing in…</div>
  if (status === 'admin')   return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/admin/login" replace />
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth()
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">Checking admin access…</div>
      </div>
    )
  }
  if (status !== 'admin') return <Navigate to="/admin/login" replace />
  return <AdminLayout>{children}</AdminLayout>
}

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/admin/login"          element={<AdminLoginPage />} />
        <Route path="/admin/auth/callback"  element={<AdminCallbackPage />} />

        {/* Protected */}
        <Route path="/admin"                element={<AdminGuard><Navigate to="/admin/dashboard" replace /></AdminGuard>} />
        <Route path="/admin/dashboard"      element={<AdminGuard><DashboardPage /></AdminGuard>} />
        <Route path="/admin/users"          element={<AdminGuard><UsersPage /></AdminGuard>} />
        <Route path="/admin/users/:ownerId" element={<AdminGuard><UserDetailPage /></AdminGuard>} />
        <Route path="/admin/payments"       element={<AdminGuard><PaymentsPage /></AdminGuard>} />
        <Route path="/admin/payments/:id"   element={<AdminGuard><PaymentDetailPage /></AdminGuard>} />
        <Route path="/admin/subscriptions"  element={<AdminGuard><SubscriptionsPage /></AdminGuard>} />
        <Route path="/admin/plan-limits"    element={<AdminGuard><PlanLimitsPage /></AdminGuard>} />
        <Route path="/admin/staff"          element={<AdminGuard><StaffAdminPage /></AdminGuard>} />
        <Route path="/admin/activity"       element={<AdminGuard><ActivityPage /></AdminGuard>} />

        {/* Fallback */}
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminAuthProvider>
  )
}
