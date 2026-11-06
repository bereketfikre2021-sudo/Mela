import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationProvider } from './design-system/Notification'
import { AppShell } from './layouts/AppShell'
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
      <AppShell brand={brand}>
        <WelcomePage />
      </AppShell>
    </NotificationProvider>
  )
}
