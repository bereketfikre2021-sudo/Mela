import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart2, Home, PackageSearch, Receipt, Users, Wallet } from 'lucide-react'

import { NotificationProvider } from './design-system/Notification'
import type { NavItem } from './design-system/BottomNav'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './modules/auth/AuthContext'
import { useAuth } from './modules/auth/AuthContext'
import { PublicOnly, RequireBusiness, RequireProfile } from './modules/auth/RouteGuards'
import { ProfileMenu } from './components/ProfileMenu'
import { SyncBadge } from './components/SyncBadge'
import { NotificationBell } from './components/NotificationBell'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { PaywallGate } from './components/PaywallGate'
import { TrialBanner } from './components/TrialBanner'
import { SyncProvider } from './context/SyncContext'
import { SubscriptionProvider } from './modules/subscriptions/SubscriptionContext'
import { StaffProvider } from './modules/staff/StaffContext'
import { AppNotificationProvider } from './modules/notifications/NotificationContext'
import { getBusinessConfig } from './modules/auth/businessConfig'

import { lazy, Suspense } from 'react'
import { Spinner } from './design-system/LoadingState'

// Lazy-load all pages for code splitting — each becomes its own chunk
const AuthCallbackPage       = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })))
const ContactPage             = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
const CustomersPage           = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const EditBusinessProfilePage = lazy(() => import('./pages/EditBusinessProfilePage').then(m => ({ default: m.EditBusinessProfilePage })))
const ExpensesPage            = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const InventoryPage           = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })))
const LoginPage               = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const OnboardingPage          = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const OverviewPage            = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })))
const PosPage                 = lazy(() => import('./pages/PosPage').then(m => ({ default: m.PosPage })))
const PrivacyPage             = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const ProductsPage            = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const PurchasesPage           = lazy(() => import('./pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })))
const RegisterPage            = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ReportsPage             = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SalesPage               = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })))
const StockPage               = lazy(() => import('./pages/StockPage').then(m => ({ default: m.StockPage })))
const SuppliersPage           = lazy(() => import('./pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const TermsPage               = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))
const WelcomePage             = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })))
const SubscriptionPage        = lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })))
const MorePage                = lazy(() => import('./pages/MorePage').then(m => ({ default: m.MorePage })))
const StaffPage               = lazy(() => import('./pages/StaffPage').then(m => ({ default: m.StaffPage })))
const NotificationsPage       = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))

function PageLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner size="lg" label="Loading" />
    </div>
  )
}

const brand = (
  <div className="flex items-center">
    <img src="/Logo.svg" alt="MELA" className="h-9 w-9" />
  </div>
)

export function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  }, [i18n.resolvedLanguage, i18n.language])

  return (
    <NotificationProvider>
      <AuthProvider>
        <SyncProvider>
          <BrowserRouter>
            <SubscriptionProvider>
              <StaffProvider>
                <AppNotificationProvider>
                  <TrialBanner />
                  <PaywallGate>
                    <Suspense fallback={<PageLoader />}>
                      <AppRoutes />
                    </Suspense>
                  </PaywallGate>
                  <PWAInstallBanner />
                </AppNotificationProvider>
              </StaffProvider>
            </SubscriptionProvider>
          </BrowserRouter>
        </SyncProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

function AppRoutes() {
  const { t }           = useTranslation()
  const navigate        = useNavigate()
  const { status, profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const isService = bizConfig.isServiceBased

  /**
   * Primary nav — 6 items max.
   * Sales is universal for all business types.
   * Products → Services label for service businesses.
   * Customers → Clients label for service businesses.
   */
  const appNav: NavItem[] = [
    {
      id:    '/app',
      label: t('nav.home'),
      icon:  Home,
    },
    {
      id:    '/app/sales',
      label: t('nav.sales'),
      icon:  Receipt,
    },
    {
      id:    '/app/expenses',
      label: t('nav.expenses'),
      icon:  Wallet,
    },
    {
      id:    '/app/products',
      label: isService ? t('nav.services') : t('nav.products'),
      icon:  PackageSearch,
    },
    {
      id:    '/app/customers',
      label: isService ? t('nav.clients') : t('nav.customers'),
      icon:  Users,
    },
    {
      id:    '/app/reports',
      label: t('nav.reports'),
      icon:  BarChart2,
    },
  ]

  const publicShell = (children: React.ReactNode) => (
    <AppShell brand={brand} fullWidth>{children}</AppShell>
  )

  const profileMenu = status === 'authenticated'
    ? <div className="flex items-center gap-1"><SyncBadge /><NotificationBell /><ProfileMenu /></div>
    : null

  const appShell = (children: React.ReactNode, activeId: string) => (
    <AppShell
      brand={brand}
      navItems={appNav}
      activeId={activeId}
      onNavigate={navigate}
      trailingExtra={profileMenu}
    >
      {children}
    </AppShell>
  )

  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────────────────────── */}
      <Route path="/"              element={publicShell(<WelcomePage />)} />
      <Route path="/privacy"       element={publicShell(<PrivacyPage />)} />
      <Route path="/terms"         element={publicShell(<TermsPage />)} />
      <Route path="/contact"       element={publicShell(<ContactPage />)} />
      <Route path="/auth/callback" element={publicShell(<AuthCallbackPage />)} />
      <Route path="/login"         element={publicShell(<PublicOnly><LoginPage /></PublicOnly>)} />
      <Route path="/register"      element={publicShell(<PublicOnly><RegisterPage /></PublicOnly>)} />
      <Route path="/onboarding"    element={publicShell(<RequireProfile><OnboardingPage /></RequireProfile>)} />

      {/* ── Primary nav destinations ─────────────────────────────────────── */}
      <Route path="/app"
        element={appShell(<RequireBusiness><OverviewPage /></RequireBusiness>, '/app')} />

      <Route path="/app/pos"
        element={appShell(<RequireBusiness><PosPage /></RequireBusiness>, '/app/sales')} />

      <Route path="/app/sales"
        element={appShell(<RequireBusiness><SalesPage /></RequireBusiness>, '/app/sales')} />

      <Route path="/app/expenses"
        element={appShell(<RequireBusiness><ExpensesPage /></RequireBusiness>, '/app/expenses')} />

      <Route path="/app/reports"
        element={appShell(<RequireBusiness><ReportsPage /></RequireBusiness>, '/app/reports')} />

      {/* ── Secondary routes (via account Advanced menu) ──────────────────── */}
      <Route path="/app/more"
        element={appShell(<RequireBusiness><MorePage /></RequireBusiness>, '/app')} />
      <Route path="/app/products"
        element={appShell(<RequireBusiness><ProductsPage /></RequireBusiness>, '/app/products')} />
      <Route path="/app/stock"
        element={appShell(<RequireBusiness><StockPage /></RequireBusiness>, '/app')} />
      <Route path="/app/inventory"
        element={appShell(<RequireBusiness><InventoryPage /></RequireBusiness>, '/app')} />
      <Route path="/app/purchases"
        element={appShell(<RequireBusiness><PurchasesPage /></RequireBusiness>, '/app')} />
      <Route path="/app/customers"
        element={appShell(<RequireBusiness><CustomersPage /></RequireBusiness>, '/app/customers')} />
      <Route path="/app/suppliers"
        element={appShell(<RequireBusiness><SuppliersPage /></RequireBusiness>, '/app')} />
      <Route path="/app/staff"
        element={appShell(<RequireBusiness><StaffPage /></RequireBusiness>, '/app')} />
      <Route path="/app/notifications"
        element={appShell(<RequireBusiness><NotificationsPage /></RequireBusiness>, '/app')} />
      <Route path="/app/profile"
        element={appShell(<RequireBusiness><EditBusinessProfilePage /></RequireBusiness>, '/app')} />
      <Route path="/app/subscription"
        element={appShell(<RequireBusiness><SubscriptionPage /></RequireBusiness>, '/app')} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
