/**
 * Breadcrumb — shows the current page path.
 * Used at the top of every secondary/inner page.
 */
import { ChevronRight, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate()

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-secondary">
      <button
        type="button"
        onClick={() => navigate('/app')}
        className="flex items-center gap-1 hover:text-primary transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted" aria-hidden="true" />
          {item.href && i < items.length - 1 ? (
            <button
              type="button"
              onClick={() => navigate(item.href!)}
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className={i === items.length - 1 ? 'font-medium text-text' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
