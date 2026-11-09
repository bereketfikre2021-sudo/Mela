import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreditCard, Home, PackageSearch, Receipt, UserCog, Users, Wallet } from 'lucide-react'

import { NotificationProvider } from './design-system/Notification'
import type { NavItem } from './design-system/BottomNav'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './modules/auth/AuthContext'
import { useAuth } from './modules/auth/AuthContext'
import { PublicOnly, RequireBusiness, RequireProfile } from './modules/auth/RouteGuards'
import { ProfileMenu } from './components/ProfileMenu'
import { SyncBadge } from './components/SyncBadge'
import { SyncProvider } from './context/SyncContext'
import { SubscriptionProvider } from './modules/subscriptions/SubscriptionContext'
import { useSubscription } from './modules/subscriptions/SubscriptionContext'
import { StaffProvider } from './modules/staff/StaffContext'

// Pages
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ContactPage } from './pages/ContactPage'
import { CustomersPage } from './pages/CustomersPage'
import { EditBusinessProfilePage } from './pages/EditBusinessProfilePage'
import { ExpensesPage } from './pages/ExpensesPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OverviewPage } from './pages/OverviewPage'
import { PosPage } from './pages/PosPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProductsPage } from './pages/ProductsPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesPage } from './pages/SalesPage'
import { StockPage } from './pages/StockPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { TermsPage } from './pages/TermsPage'
import { WelcomePage } from './pages/WelcomePage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { StaffPage } from './pages/StaffPage'

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
                <AppRoutes />
              </StaffProvider>
            </SubscriptionProvider>
          </BrowserRouter>
        </SyncProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

function AppRoutes() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { status } = useAuth()
  const { isActive } = useSubscription()

  /**
   * 5-item primary nav.
   * "Sales" has a desktop dropdown (New Sale / History).
   * Mobile bottom nav taps "Sales" → goes directly to POS.
   */
  const appNav: NavItem[] = [
    {
      id:    '/app',
      label: t('nav.home'),
      icon:  Home,
    },
    {
      id:    '/app/pos',          // mobile tap destination
      label: t('nav.sales'),
      icon:  Receipt,
      children: [
        { id: '/app/pos',   label: t('nav.newSale') },
        { id: '/app/sales', label: t('nav.salesHistory') },
      ],
    },
    {
      id:    '/app/expenses',
      label: t('nav.expenses'),
      icon:  Wallet,
    },
    {
      id:    '/app/stock',
      label: t('nav.stock'),
      icon:  PackageSearch,
    },
    {
      id:    '/app/customers',
      label: t('nav.customers'),
      icon:  Users,
    },
    {
      id:    '/app/subscription',
      label: t('nav.subscription'),
      icon:  CreditCard,
    },
    // Staff nav item only shown on Premium
    ...(isActive ? [{
      id:    '/app/staff',
      label: t('nav.staff'),
      icon:  UserCog,
    }] : []),
  ]

  const publicShell = (children: React.ReactNode) => (
    <AppShell brand={brand} fullWidth>{children}</AppShell>
  )

  const profileMenu = status === 'authenticated'
    ? <div className="flex items-center gap-1"><SyncBadge /><ProfileMenu /></div>
    : null

  /**
   * activeId determines which nav item is highlighted.
   * Secondary routes (profile, reports, etc.) highlight the closest primary.
   */
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

      {/* ── PRIMARY nav destinations ─────────────────────────────────────── */}
      <Route path="/app"
        element={appShell(<RequireBusiness><OverviewPage /></RequireBusiness>, '/app')} />

      <Route path="/app/pos"
        element={appShell(<RequireBusiness><PosPage /></RequireBusiness>, '/app/pos')} />

      <Route path="/app/sales"
        element={appShell(<RequireBusiness><SalesPage /></RequireBusiness>, '/app/pos')} />

      <Route path="/app/expenses"
        element={appShell(<RequireBusiness><ExpensesPage /></RequireBusiness>, '/app/expenses')} />

      <Route path="/app/stock"
        element={appShell(<RequireBusiness><StockPage /></RequireBusiness>, '/app/stock')} />

      <Route path="/app/customers"
        element={appShell(<RequireBusiness><CustomersPage /></RequireBusiness>, '/app/customers')} />

      {/* ── Secondary routes (accessible by URL, not in primary nav) ──────── */}
      <Route path="/app/products"
        element={appShell(<RequireBusiness><ProductsPage /></RequireBusiness>, '/app/stock')} />
      <Route path="/app/inventory"
        element={appShell(<RequireBusiness><InventoryPage /></RequireBusiness>, '/app/stock')} />
      <Route path="/app/reports"
        element={appShell(<RequireBusiness><ReportsPage /></RequireBusiness>, '/app')} />
      <Route path="/app/purchases"
        element={appShell(<RequireBusiness><PurchasesPage /></RequireBusiness>, '/app/stock')} />
      <Route path="/app/suppliers"
        element={appShell(<RequireBusiness><SuppliersPage /></RequireBusiness>, '/app/customers')} />
      <Route path="/app/profile"
        element={appShell(<RequireBusiness><EditBusinessProfilePage /></RequireBusiness>, '/app')} />

      <Route path="/app/subscription"
        element={appShell(<RequireBusiness><SubscriptionPage /></RequireBusiness>, '/app/subscription')} />

      <Route path="/app/staff"
        element={appShell(<RequireBusiness><StaffPage /></RequireBusiness>, '/app/staff')} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
