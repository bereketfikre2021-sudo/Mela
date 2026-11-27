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
  footer?: ReactNode
  closeLabel?: string
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog.
 *
 * Keeps the portal mounted when closed (display:none) so inputs inside the
 * dialog are never unmounted mid-interaction — this prevents keyboard
 * dismissal on mobile when parent state changes while the dialog is open.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  className,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleId      = useId()
  const descId       = useId()
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onOpenChange(false); return }
      if (e.key === 'Tab') {
        const focusables = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last  = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus first input, not close button — avoids keyboard popping open
    // unexpectedly on mobile when a button gets focus
    const focusTimer = window.setTimeout(() => {
      const target =
        containerRef.current?.querySelector<HTMLElement>('[autofocus]') ??
        containerRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
      // Only auto-focus non-button elements to avoid keyboard issues on mobile
      if (target) target.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusTimer)
      previouslyFocused.current?.focus()
    }
  }, [open, onOpenChange])

  // Always render the portal — use visibility/pointer-events to hide it.
  // This prevents unmounting inputs mid-keystroke when parent state changes.
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center',
        open ? 'pointer-events-auto' : 'pointer-events-none invisible'
      )}
      role="presentation"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-layer',
          'transition-transform duration-200 sm:rounded-2xl',
          open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          className
        )}
      >
        {/* Header */}
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
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 shrink-0 px-2"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
