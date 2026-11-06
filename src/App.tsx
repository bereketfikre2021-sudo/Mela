import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { NotificationProvider } from './design-system/Notification'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './modules/auth/AuthContext'
import { PublicOnly, RequireBusiness, RequireProfile } from './modules/auth/RouteGuards'
import { AppPlaceholder } from './pages/AppPlaceholder'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { EditBusinessProfilePage } from './pages/EditBusinessProfilePage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
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
          <AppShell brand={brand}>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="/login"
                element={
                  <PublicOnly>
                    <LoginPage />
                  </PublicOnly>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnly>
                    <RegisterPage />
                  </PublicOnly>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <RequireProfile>
                    <OnboardingPage />
                  </RequireProfile>
                }
              />
              <Route
                path="/app"
                element={
                  <RequireBusiness>
                    <AppPlaceholder />
                  </RequireBusiness>
                }
              />
              <Route
                path="/app/profile"
                element={
                  <RequireBusiness>
                    <EditBusinessProfilePage />
                  </RequireBusiness>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  )
}
