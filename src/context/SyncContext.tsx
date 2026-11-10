/**
 * SyncContext — Phase 8.
 *
 * Provides:
 *  - isOnline       : navigator.onLine, kept in sync with events
 *  - pendingCount   : number of items in the offline queue awaiting sync
 *  - isSyncing      : true while flushQueue() is running
 *  - lastSyncError  : message from the most recent failed sync item
 *  - triggerSync    : call to attempt an immediate flush
 *  - refreshCount   : call to re-read queue length without syncing
 *
 * Auto-sync fires:
 *  - On app mount (if online)
 *  - Whenever the browser goes from offline → online
 *  - On a 30-second interval when online and there are pending items
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushQueue } from '../lib/sync'
import { queueCountPending, queueGetAll } from '../lib/db'

interface SyncContextValue {
  isOnline:      boolean
  pendingCount:  number
  isSyncing:     boolean
  lastSyncError: string | null
  triggerSync:   () => Promise<void>
  refreshCount:  () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline,      setIsOnline]      = useState(() => navigator.onLine)
  const [pendingCount,  setPendingCount]  = useState(0)
  const [isSyncing,     setIsSyncing]     = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const syncLock = useRef(false)

  const refreshCount = useCallback(async () => {
    const n = await queueCountPending()
    setPendingCount(n)
  }, [])

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || syncLock.current) return
    syncLock.current = true
    setIsSyncing(true)
    setLastSyncError(null)

    try {
      const { failed } = await flushQueue(async () => {
        setPendingCount(await queueCountPending())
      })
      if (failed > 0) {
        // Surface the first failure message for the UI
        const items = await queueGetAll()
        const firstFailed = items.find(i => i.status === 'failed' && i.error)
        if (firstFailed?.error) setLastSyncError(firstFailed.error)
      }
    } finally {
      syncLock.current = false
      setIsSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  // ── Online / offline event listeners ──────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  void triggerSync() }
    const onOffline = () => { setIsOnline(false) }
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [triggerSync])

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    void refreshCount()
    if (navigator.onLine) void triggerSync()
  }, [refreshCount, triggerSync])

  // ── Periodic sync every 30 s when online ──────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (navigator.onLine) {
        const n = await queueCountPending()
        if (n > 0) void triggerSync()
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [triggerSync])

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, isSyncing, lastSyncError, triggerSync, refreshCount }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncContext must be used inside SyncProvider')
  return ctx
}
