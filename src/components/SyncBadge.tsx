/**
 * SyncBadge — top-bar online/offline indicator.
 *
 * Shows:
 *  - A green dot when online and synced.
 *  - An amber spinner + count when syncing or there are pending items.
 *  - A red dot + "Offline" label when offline.
 *  - A red badge when there are failed sync items.
 *
 * Clicking the badge when online triggers an immediate sync.
 * Never displayed as green when there are pending items.
 */
import { useTranslation } from 'react-i18next'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useSyncContext } from '../context/SyncContext'

export function SyncBadge() {
  const { t } = useTranslation()
  const { isOnline, pendingCount, isSyncing, lastSyncError, triggerSync } = useSyncContext()

  // Offline
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('sync.offline')}</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </div>
    )
  }

  // Syncing
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>{t('sync.syncing')}</span>
      </div>
    )
  }

  // Failed items
  if (lastSyncError && pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void triggerSync()}
        title={lastSyncError}
        aria-label={t('sync.retryLabel')}
        className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/20"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('sync.failed', { count: pendingCount })}</span>
      </button>
    )
  }

  // Pending items (not yet attempted)
  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void triggerSync()}
        aria-label={t('sync.pendingLabel', { count: pendingCount })}
        className="flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/20"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t('sync.pending', { count: pendingCount })}</span>
      </button>
    )
  }

  // Online, synced — subtle green dot
  return (
    <div className="flex items-center gap-1.5 px-1" aria-label={t('sync.online')} title={t('sync.online')}>
      <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
    </div>
  )
}
