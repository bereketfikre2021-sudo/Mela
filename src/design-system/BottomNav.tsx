import { type ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from './cn'

export interface NavItem {
  id: string
  label: string
  icon: ComponentType<LucideProps>
  /** Desktop dropdown children — if present, clicking this item on desktop
   *  opens a menu instead of navigating directly. Mobile always navigates
   *  to the first child's id (or `id` if no children). */
  children?: { id: string; label: string }[]
}

export interface BottomNavProps {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}

/** Fixed bottom navigation — shown on small screens (md:hidden). */
export function BottomNav({ items, activeId, onSelect, className }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon
          // On mobile, a group item navigates to its first child
          const targetId = item.children ? item.children[0].id : item.id
          const active =
            activeId === item.id ||
            (item.children?.some(c => c.id === activeId) ?? false)

          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(targetId)}
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
