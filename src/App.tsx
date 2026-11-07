import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Package } from 'lucide-react'

import { NotificationProvider } from './design-system/Notification'
import type { NavItem } from './design-system/BottomNav'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './modules/auth/AuthContext'
import { PublicOnly, RequireBusiness, RequireProfile } from './modules/auth/RouteGuards'
import { AppPlaceholder } from './pages/AppPlaceholder'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { EditBusinessProfilePage } from './pages/EditBusinessProfilePage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProductsPage } from './pages/ProductsPage'
import { RegisterPage } from './pages/RegisterPage'
import { WelcomePage } from './pages/WelcomePage'

const brand = (
  <div className="flex items-center">
    <img src="/Logo.svg" alt="MELA" className="h-9 w-9" />
  </div>
)

export function App() {
  const { i18n } = useTranslation()

  // Keep <html lang> in sync with the active language (helps fonts + AT).
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

/**
 * Inner route tree — rendered inside BrowserRouter so hooks like
 * useNavigate and useTranslation are available.
 */
function AppRoutes() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const appNav: NavItem[] = [
    { id: '/app',          label: t('nav.home'),     icon: Home    },
    { id: '/app/products', label: t('nav.products'), icon: Package },
  ]

  /** Bare public shell (no nav). */
  const publicShell = (children: React.ReactNode) => (
    <AppShell brand={brand}>{children}</AppShell>
  )

  /** Authenticated shell with nav. */
  const appShell = (children: React.ReactNode, activeId: string) => (
    <AppShell brand={brand} navItems={appNav} activeId={activeId} onNavigate={navigate}>
      {children}
    </AppShell>
  )

  return (
    <Routes>
      {/* Public */}
      <Route path="/"               element={publicShell(<WelcomePage />)} />
      <Route path="/auth/callback"  element={publicShell(<AuthCallbackPage />)} />
      <Route path="/login"          element={publicShell(<PublicOnly><LoginPage /></PublicOnly>)} />
      <Route path="/register"       element={publicShell(<PublicOnly><RegisterPage /></PublicOnly>)} />
      <Route path="/onboarding"     element={publicShell(<RequireProfile><OnboardingPage /></RequireProfile>)} />

      {/* Authenticated — shared nav shell */}
      <Route path="/app"
        element={appShell(<RequireBusiness><AppPlaceholder /></RequireBusiness>, '/app')}
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
