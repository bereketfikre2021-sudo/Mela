import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationProvider } from './design-system/Notification'
import { AppShell } from './layouts/AppShell'
import { WelcomePage } from './pages/WelcomePage'

const brand = (
  <div className="flex items-center gap-2">
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white" aria-hidden="true">
      <span className="text-sm font-semibold">M</span>
    </span>
    <span className="text-base font-semibold tracking-tight text-text">MELA</span>
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
