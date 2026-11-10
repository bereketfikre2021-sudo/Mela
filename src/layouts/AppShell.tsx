import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { BottomNav, type NavItem } from '../design-system/BottomNav'
import { cn } from '../design-system/cn'
import { TopBar } from '../design-system/TopBar'

export interface AppShellProps {
  brand: ReactNode
  navItems?: NavItem[]
  activeId?: string
  onNavigate?: (id: string) => void
  trailingExtra?: ReactNode
  fullWidth?: boolean
  children: ReactNode
}

/** A single desktop nav button — plain or with a dropdown. */
function DesktopNavItem({
  item,
  activeId,
  onNavigate,
}: {
  item: NavItem
  activeId: string
  onNavigate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const Icon = item.icon

  const isActive =
    activeId === item.id ||
    (item.children?.some(c => c.id === activeId) ?? false)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Plain item — no dropdown
  if (!item.children) {
    return (
      <li ref={ref}>
        <button
          type="button"
          onClick={() => onNavigate(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            isActive ? 'bg-primary-soft text-primary' : 'text-secondary hover:bg-background hover:text-text'
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
        </button>
      </li>
    )
  }

  // Dropdown item
  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-primary-soft text-primary' : 'text-secondary hover:bg-background hover:text-text'
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {item.label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-surface shadow-layer"
        >
          {item.children.map(child => {
            const childActive = activeId === child.id
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                onClick={() => { onNavigate(child.id); setOpen(false) }}
                className={cn(
                  'flex w-full items-center px-4 py-2.5 text-sm transition-colors',
                  childActive ? 'bg-primary-soft font-medium text-primary' : 'text-text hover:bg-background'
                )}
              >
                {child.label}
              </button>
            )
          })}
        </div>
      )}
    </li>
  )
}

export function AppShell({
  brand,
  navItems = [],
  activeId = '',
  onNavigate,
  trailingExtra,
  fullWidth = false,
  children,
}: AppShellProps) {
  const hasNav = navItems.length > 0

  const desktopNav = hasNav ? (
    <ul className="flex items-center gap-1">
      {navItems.map(item => (
        <DesktopNavItem
          key={item.id}
          item={item}
          activeId={activeId}
          onNavigate={onNavigate ?? (() => {})}
        />
      ))}
    </ul>
  ) : null

  return (
    <div className="min-h-dvh bg-background text-text">
      {/* Skip to main content — keyboard/screen-reader navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text focus:shadow-layer focus:outline-none"
      >
        Skip to main content
      </a>
      <TopBar
        brand={brand}
        nav={desktopNav}
        trailing={
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {trailingExtra}
          </div>
        }
      />
      <main id="main-content" className={fullWidth ? 'w-full' : 'mx-auto w-full max-w-5xl px-4 pb-12 pt-6 md:pt-10'}>
        {children}
      </main>
      {hasNav && (
        <BottomNav
          items={navItems}
          activeId={activeId}
          onSelect={onNavigate ?? (() => {})}
          className="md:hidden"
        />
      )}
    </div>
  )
}
