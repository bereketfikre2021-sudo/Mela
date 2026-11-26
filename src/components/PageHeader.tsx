/**
 * PageHeader
 *
 * Responsive page header used across all pages.
 *
 * Mobile:  title + subtitle stacked full-width, actions below as a row
 * Desktop: title + subtitle on left, actions on right (flex justify-between)
 *
 * Usage:
 *   <PageHeader
 *     title="Products"
 *     subtitle="Manage your stock"
 *     actions={<><Button>Add</Button></>}
 *   />
 */
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Extra row shown below title/actions (e.g. filter chips) */
  below?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, below, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="heading truncate text-2xl md:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-secondary">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {/* Optional row below (filters, tabs, etc.) */}
      {below && <div className="mt-3">{below}</div>}
    </div>
  )
}
