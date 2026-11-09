import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart2, Briefcase, Home, PackageSearch, Receipt, Users, Wallet } from 'lucide-react'

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
import { StaffProvider } from './modules/staff/StaffContext'
import { getBusinessConfig } from './modules/auth/businessConfig'

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
import { MorePage } from './pages/MorePage'
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
  const { t }           = useTranslation()
  const navigate        = useNavigate()
  const { status, profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const isService = bizConfig.isServiceBased

  /**
   * Primary nav — max 5 items always.
   *
   * Product businesses:  Home | Sales | Expenses | Reports | [Staff]
   * Service businesses:  Home | Services | Expenses | Reports | [Staff]
   *
   * Everything else (Customers, Products, Stock, Suppliers, Purchases,
   * Inventory, More) lives in the "Advanced" section of the account menu.
   */
  /**
   * Primary nav — 6 items max.
   *
   * Product businesses:  Home | Sales | Expenses | Products | Customers | Reports
   * Service businesses:  Home | Services | Expenses | Clients | Reports
   *
   * Staff lives in Advanced (account menu), not in nav.
   */
  const appNav: NavItem[] = [
    {
      id:    '/app',
      label: t('nav.home'),
      icon:  Home,
    },
    {
      id:    '/app/sales',
      label: isService ? t('nav.services') : t('nav.sales'),
      icon:  isService ? Briefcase : Receipt,
    },
    {
      id:    '/app/expenses',
      label: t('nav.expenses'),
      icon:  Wallet,
    },
    // Products — product businesses only
    ...(!isService ? [{
      id:    '/app/products',
      label: t('nav.products'),
      icon:  PackageSearch,
    }] : []),
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
    ? <div className="flex items-center gap-1"><SyncBadge /><ProfileMenu /></div>
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
      <Route path="/app/profile"
        element={appShell(<RequireBusiness><EditBusinessProfilePage /></RequireBusiness>, '/app')} />
      <Route path="/app/subscription"
        element={appShell(<RequireBusiness><SubscriptionPage /></RequireBusiness>, '/app')} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
