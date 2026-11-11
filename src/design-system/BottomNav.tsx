import { type ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from './cn'

export interface NavItem {
  id: string
  label: string
  icon: ComponentType<LucideProps>
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
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon
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
                className="flex w-full flex-col items-center gap-0.5 py-2 transition-colors"
              >
                {/* Icon with pill indicator */}
                <span className={cn(
                  'flex items-center justify-center rounded-full px-4 py-1 transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary hover:text-text'
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {/* Label */}
                <span className={cn(
                  'text-[10px] font-medium leading-tight transition-colors',
                  active ? 'text-primary font-semibold' : 'text-secondary'
                )}>
                  {item.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
