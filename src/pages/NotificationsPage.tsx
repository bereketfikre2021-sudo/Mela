/**
 * NotificationsPage — Phase 14.
 * Shows all in-app notifications with mark-as-read and delete actions.
 */
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { useAppNotifications } from '../modules/notifications/NotificationContext'
import type { AppNotification } from '../modules/notifications/types'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

function kindIcon(kind: AppNotification['kind']): string {
  switch (kind) {
    case 'daily_summary':  return '📊'
    case 'low_stock':      return '⚠️'
    case 'pending_payment': return '💰'
    default: return '🔔'
  }
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const { notifications, loading, markRead, markAllRead, deleteNotification, unreadCount } =
    useAppNotifications()

  if (loading) {
    return (
      <div className="py-6 space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{t('notifications.title')}</h1>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" leadingIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => void markAllRead()}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('notifications.empty.title')}
          description={t('notifications.empty.desc')}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={[
                'flex items-start gap-3 rounded-xl border p-4 transition-colors',
                n.read ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft',
              ].join(' ')}
            >
              <span className="text-xl shrink-0" aria-hidden="true">{kindIcon(n.kind)}</span>
              <div className="flex-1 min-w-0" onClick={() => { if (!n.read) void markRead(n.id) }}>
                <p className={`text-sm ${n.read ? 'text-text' : 'font-semibold text-text'}`}>{n.title}</p>
                <p className="mt-0.5 text-xs text-secondary">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{fmtTime(n.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteNotification(n.id)}
                aria-label={t('notifications.delete')}
                className="shrink-0 rounded p-1 text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
