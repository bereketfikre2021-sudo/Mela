import { type ReactNode } from 'react'
import { cn } from './cn'

export interface TopBarProps {
  brand?: ReactNode
  trailing?: ReactNode
  nav?: ReactNode
  className?: string
}

/** Sticky app top bar — overflow-safe on all screen sizes. */
export function TopBar({ brand, trailing, nav, className }: TopBarProps) {
  return (
    <header className={cn('sticky top-0 z-20 border-b border-border bg-surface', className)}>
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-4">
        {/* Brand — never shrinks */}
        <div className="flex shrink-0 items-center">{brand}</div>

        {/* Desktop nav — takes remaining space, hidden on mobile */}
        {nav && (
          <nav className="hidden flex-1 md:flex md:items-center md:justify-center" aria-label="Primary">
            {nav}
          </nav>
        )}

        {/* Spacer on mobile so trailing stays right */}
        <div className="flex-1 md:hidden" />

        {/* Trailing actions — shrink text if needed */}
        {trailing && (
          <div className="flex shrink-0 items-center gap-1.5">
            {trailing}
          </div>
        )}
      </div>
    </header>
  )
}
