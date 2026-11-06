import { Loader2 } from 'lucide-react'

import { cn } from './cn'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label announced to screen readers. */
  label?: string
  className?: string
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center text-secondary', className)}>
      <Loader2 className={cn('animate-spin', spinnerSizes[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** A non-interactive placeholder block; pair with an sr-only loading label. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/20', className)} aria-hidden="true" />
}
