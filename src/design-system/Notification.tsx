import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

import { cn } from './cn'

type Tone = 'success' | 'warning' | 'danger' | 'info'

interface ToastInput {
  title: string
  description?: string
  tone?: Tone
  /** Auto-dismiss delay in ms. Set to 0 to keep it until closed. Defaults to 4500. */
  duration?: number
}

interface Toast extends ToastInput {
  id: number
}

interface NotificationContextValue {
  notify: (toast: ToastInput) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}

const toneStyles: Record<Tone, { accent: string; icon: ComponentType<LucideProps> }> = {
  success: { accent: 'text-success', icon: CheckCircle2 },
  warning: { accent: 'text-warning', icon: AlertTriangle },
  danger: { accent: 'text-danger', icon: AlertTriangle },
  info: { accent: 'text-info', icon: Info }
}

/**
 * Toast notifications. Renders an aria-live region so new toasts are announced
 * to assistive technology without stealing focus.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = ++idRef.current
      const duration = toast.duration ?? 4500
      setToasts((prev) => [...prev, { ...toast, id }])
      if (duration > 0) window.setTimeout(() => remove(id), duration)
    },
    [remove]
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
      >
        {toasts.map((t) => {
          const { accent, icon: Icon } = toneStyles[t.tone ?? 'info']
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto w-full rounded-lg border border-border bg-surface shadow-layer"
            >
              <div className="flex items-start gap-3 p-3.5">
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', accent)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="-mr-1 -mt-1 rounded p-1 text-muted hover:text-text"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}
