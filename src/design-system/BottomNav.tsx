import { type ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from './cn'

export interface NavItem {
  id: string
  label: string
  icon: ComponentType<LucideProps>
}

export interface BottomNavProps {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}

/** Fixed bottom navigation, shown on small screens (md:hidden). */
export function BottomNav({ items, activeId, onSelect, className }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn('fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]', className)}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === activeId
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 py-2.5 text-xs transition-colors',
                  active ? 'text-primary' : 'text-secondary hover:text-text'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
