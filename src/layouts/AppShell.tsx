import { type ReactNode } from 'react'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { BottomNav, type NavItem } from '../design-system/BottomNav'
import { cn } from '../design-system/cn'
import { TopBar } from '../design-system/TopBar'

export interface AppShellProps {
  brand: ReactNode
  navItems: NavItem[]
  activeId: string
  onNavigate: (id: string) => void
  children: ReactNode
}

/**
 * The application shell: a sticky top bar (brand, desktop nav, language
 * switcher), a centered content region, and a bottom nav on mobile.
 */
export function AppShell({ brand, navItems, activeId, onNavigate, children }: AppShellProps) {
  const desktopNav = (
    <ul className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = item.id === activeId
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-background hover:text-text'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="min-h-dvh bg-background text-text">
      <TopBar brand={brand} nav={desktopNav} trailing={<LanguageSwitcher />} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-12 md:pt-10">{children}</main>
      <BottomNav items={navItems} activeId={activeId} onSelect={onNavigate} className="md:hidden" />
    </div>
  )
}
