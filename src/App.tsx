import { useEffect, useState } from 'react'
import { Home, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { NotificationProvider } from './design-system/Notification'
import type { NavItem } from './design-system/BottomNav'
import { AppShell } from './layouts/AppShell'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { WelcomePage } from './pages/WelcomePage'

type View = 'home' | 'design'

const brand = (
  <div className="flex items-center gap-2">
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white" aria-hidden="true">
      <span className="text-sm font-semibold">M</span>
    </span>
    <span className="text-base font-semibold tracking-tight text-text">MELA</span>
  </div>
)

export function App() {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<View>('home')

  const navItems: NavItem[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'design', label: t('nav.design'), icon: Palette }
  ]

  // Keep <html lang> in sync with the active language (helps fonts + AT).
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  }, [i18n.resolvedLanguage, i18n.language])

  return (
    <NotificationProvider>
      <AppShell brand={brand} navItems={navItems} activeId={view} onNavigate={(id) => setView(id as View)}>
        {view === 'home' ? <WelcomePage onExplore={() => setView('design')} /> : <DesignSystemPage />}
      </AppShell>
    </NotificationProvider>
  )
}
