import { type ReactNode } from 'react'

import { cn } from './cn'

export interface TopBarProps {
  brand?: ReactNode
  /** Right-aligned actions (e.g. the language switcher). */
  trailing?: ReactNode
  /** Desktop navigation; hidden on small screens. */
  nav?: ReactNode
  className?: string
}

/** Sticky app top bar with a brand, optional desktop nav, and trailing actions. */
export function TopBar({ brand, trailing, nav, className }: TopBarProps) {
  return (
    <header className={cn('sticky top-0 z-20 border-b border-border bg-surface', className)}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">{brand}</div>
        {nav && (
          <nav className="hidden md:block" aria-label="Primary">
            {nav}
          </nav>
        )}
        {trailing && <div className="flex items-center gap-2">{trailing}</div>}
      </div>
    </header>
  )
}
