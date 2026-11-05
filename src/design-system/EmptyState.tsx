import { type ComponentType, type ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

import { cn } from './cn'

export interface EmptyStateProps {
  icon?: ComponentType<LucideProps>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Centered empty state: a restrained icon mark, title, description, and action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
