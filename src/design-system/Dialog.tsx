import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from './cn'
import { Button } from './Button'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children?: ReactNode
  /** Footer content, typically action buttons. */
  footer?: ReactNode
  /** Accessible label for the close button. */
  closeLabel?: string
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog. Renders in a portal, traps focus, closes on Escape
 * and on overlay click, locks body scroll while open, and restores focus to
 * the previously focused element on close.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  className
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }
      if (e.key === 'Tab') {
        const focusables = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      // Prefer the first input/select/textarea over buttons (avoids focusing close button)
      const target =
        containerRef.current?.querySelector<HTMLElement>('[autofocus]') ??
        containerRef.current?.querySelector<HTMLElement>('input, select, textarea') ??
        containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus()
    }, 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusTimer)
      previouslyFocused.current?.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-lg bg-surface shadow-layer sm:rounded-lg',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-sm text-secondary">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="-mr-2 shrink-0 px-2" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
