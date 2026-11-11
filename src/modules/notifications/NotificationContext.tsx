/**
 * NotificationContext — Phase 14.
 *
 * Manages in-app notifications stored in IndexedDB.
 * Checks the business closing time and generates a daily summary when the
 * time matches. Also surfaces low-stock and pending payment alerts.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  notifAdd,
  notifDelete,
  notifGetAll,
  notifMarkAllRead,
  notifMarkRead,
} from './db'
import type { AppNotification } from './types'
import { useAuth } from '../auth/AuthContext'
import { getFinancialSummary } from '../overview/financials'
import { periodRange } from '../overview/dateRange'

// ── Context value ─────────────────────────────────────────────────────────────

export interface AppNotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  addNotification: (n: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const AppNotificationContext = createContext<AppNotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  addNotification: async () => { /* no-op */ },
  markRead: async () => { /* no-op */ },
  markAllRead: async () => { /* no-op */ },
  deleteNotification: async () => { /* no-op */ },
  refresh: async () => { /* no-op */ },
})

export function useAppNotifications(): AppNotificationContextValue {
  return useContext(AppNotificationContext)
}

// ── Daily summary key ─────────────────────────────────────────────────────────

function todayKey(): string {
  return `daily_summary_${new Date().toISOString().slice(0, 10)}`
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppNotificationProvider({ children }: { children: ReactNode }) {
  const { profile, status } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading,       setLoading]       = useState(false)
  const intervalRef                        = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const all = await notifGetAll()
    setNotifications(all)
    setLoading(false)
  }, [])

  const addNotification = useCallback(async (
    n: Omit<AppNotification, 'id' | 'created_at' | 'read'>
  ) => {
    const item: AppNotification = {
      ...n,
      id:         crypto.randomUUID(),
      created_at: Date.now(),
      read:       false,
    }
    await notifAdd(item)
    await refresh()
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    await notifMarkRead(id)
    await refresh()
  }, [refresh])

  const markAllRead = useCallback(async () => {
    await notifMarkAllRead()
    await refresh()
  }, [refresh])

  const deleteNotification = useCallback(async (id: string) => {
    await notifDelete(id)
    await refresh()
  }, [refresh])

  // Generate daily summary — always at end of day (22:00) regardless of closing time,
  // OR at the user's closing time if set. Summary is generated once per day.
  const checkDailySummary = useCallback(async () => {
    const now = new Date()
    const hh  = now.getHours()
    const mm  = now.getMinutes()

    // Determine trigger time: use closing_time if set, otherwise 22:00
    let triggerH = 22, triggerM = 0
    if (profile?.closing_time) {
      const parts = profile.closing_time.split(':').map(Number)
      triggerH = parts[0]; triggerM = parts[1]
    }

    if (hh !== triggerH || mm !== triggerM) return

    const key = todayKey()
    const existing = await notifGetAll()
    if (existing.some(n => n.id === key)) return

    const { data, error } = await getFinancialSummary(periodRange('today'))
    if (error || !data) return

    const { paidRevenue, totalExpenses, netProfit, sales } = data
    const fmtETB = (n: number) =>
      `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const item: AppNotification = {
      id:         key,
      kind:       'daily_summary',
      title:      `Daily summary — ${now.toLocaleDateString('en-ET', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      body:       `${sales.length} sale${sales.length !== 1 ? 's' : ''} · Revenue ${fmtETB(paidRevenue)} · Expenses ${fmtETB(totalExpenses)} · Net ${fmtETB(netProfit)}`,
      read:       false,
      created_at: Date.now(),
      data:       { revenue: paidRevenue, expenses: totalExpenses, netProfit, saleCount: sales.length },
    }

    await notifAdd(item)
    await refresh()
  }, [profile?.closing_time, refresh])

  // Load notifications on auth
  useEffect(() => {
    if (status === 'authenticated') {
      void refresh()
    } else if (status === 'unauthenticated') {
      setNotifications([])
    }
  }, [status, refresh])

  // Poll every minute to check if it's time for the daily summary
  useEffect(() => {
    if (status !== 'authenticated') return
    intervalRef.current = setInterval(() => { void checkDailySummary() }, 60_000)
    void checkDailySummary()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status, profile?.closing_time, checkDailySummary])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  )

  const value = useMemo<AppNotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      addNotification,
      markRead,
      markAllRead,
      deleteNotification,
      refresh,
    }),
    [notifications, unreadCount, loading, addNotification, markRead, markAllRead, deleteNotification, refresh]
  )

  return (
    <AppNotificationContext.Provider value={value}>
      {children}
    </AppNotificationContext.Provider>
  )
}
