import { type ReactNode } from 'react'

import { cn } from './cn'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface StatusBadgeProps {
  tone?: Tone
  /** Show a leading status dot. */
  dot?: boolean
  children: ReactNode
  className?: string
}

const tones: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'border border-border bg-background text-text'
}

const dotTones: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted'
}

/** Compact status pill with an optional leading dot. */
export function StatusBadge({ tone = 'neutral', dot = false, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} aria-hidden="true" />}
      {children}
    </span>
  )
}
