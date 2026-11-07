import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Package, Receipt, ShoppingCart, Wallet, BarChart2 } from 'lucide-react'

import { NotificationProvider } from './design-system/Notification'
import type { NavItem } from './design-system/BottomNav'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './modules/auth/AuthContext'
import { useAuth } from './modules/auth/AuthContext'
import { PublicOnly, RequireBusiness, RequireProfile } from './modules/auth/RouteGuards'
import { ProfileMenu } from './components/ProfileMenu'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { EditBusinessProfilePage } from './pages/EditBusinessProfilePage'
import { ExpensesPage } from './pages/ExpensesPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OverviewPage } from './pages/OverviewPage'
import { PosPage } from './pages/PosPage'
import { ProductsPage } from './pages/ProductsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesPage } from './pages/SalesPage'
import { WelcomePage } from './pages/WelcomePage'

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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  )
}

function AppRoutes() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status } = useAuth()

  const appNav: NavItem[] = [
    { id: '/app',          label: t('nav.home'),     icon: Home         },
    { id: '/app/pos',      label: t('nav.pos'),      icon: ShoppingCart },
    { id: '/app/sales',    label: t('nav.sales'),    icon: Receipt      },
    { id: '/app/expenses', label: t('nav.expenses'), icon: Wallet       },
    { id: '/app/reports',  label: t('nav.reports'),  icon: BarChart2    },
    { id: '/app/products', label: t('nav.products'), icon: Package      },
  ]

  const publicShell = (children: React.ReactNode) => (
    <AppShell brand={brand}>{children}</AppShell>
  )

  const profileMenu = status === 'authenticated' ? <ProfileMenu /> : null

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
      {/* Public */}
      <Route path="/"              element={publicShell(<WelcomePage />)} />
      <Route path="/auth/callback" element={publicShell(<AuthCallbackPage />)} />
      <Route path="/login"         element={publicShell(<PublicOnly><LoginPage /></PublicOnly>)} />
      <Route path="/register"      element={publicShell(<PublicOnly><RegisterPage /></PublicOnly>)} />
      <Route path="/onboarding"    element={publicShell(<RequireProfile><OnboardingPage /></RequireProfile>)} />

      {/* Authenticated */}
      <Route path="/app"
        element={appShell(<RequireBusiness><OverviewPage /></RequireBusiness>, '/app')}
      />
      <Route path="/app/pos"
        element={appShell(<RequireBusiness><PosPage /></RequireBusiness>, '/app/pos')}
      />
      <Route path="/app/sales"
        element={appShell(<RequireBusiness><SalesPage /></RequireBusiness>, '/app/sales')}
      />
      <Route path="/app/expenses"
        element={appShell(<RequireBusiness><ExpensesPage /></RequireBusiness>, '/app/expenses')}
      />
      <Route path="/app/reports"
        element={appShell(<RequireBusiness><ReportsPage /></RequireBusiness>, '/app/reports')}
      />
      <Route path="/app/products"
        element={appShell(<RequireBusiness><ProductsPage /></RequireBusiness>, '/app/products')}
      />
      <Route path="/app/profile"
        element={appShell(<RequireBusiness><EditBusinessProfilePage /></RequireBusiness>, '/app')}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
