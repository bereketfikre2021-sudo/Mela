/**
 * Shared timezone-aware date-range helpers.
 * Used by both OverviewPage and ReportsPage.
 */
import type { DateRange } from './financials'

export type Period = 'today' | 'week' | 'month' | 'custom'

export function localISODate(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function utcOffsetString(d: Date): string {
  const off  = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const h    = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const min  = String(Math.abs(off) % 60).padStart(2, '0')
  return `${sign}${h}:${min}`
}

export function startOfDay(d: Date): string {
  return `${localISODate(d)}T00:00:00${utcOffsetString(d)}`
}

export function endOfDay(d: Date): string {
  return `${localISODate(d)}T23:59:59${utcOffsetString(d)}`
}

export function periodRange(p: Period, customFrom?: string, customTo?: string): DateRange {
  const today = new Date()
  if (p === 'today') {
    const iso = localISODate(today)
    return { fromTs: startOfDay(today), toTs: endOfDay(today), fromDate: iso, toDate: iso }
  }
  if (p === 'week') {
    const from = new Date(today); from.setDate(today.getDate() - 6)
    return { fromTs: startOfDay(from), toTs: endOfDay(today),
             fromDate: localISODate(from), toDate: localISODate(today) }
  }
  if (p === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { fromTs: startOfDay(from), toTs: endOfDay(today),
             fromDate: localISODate(from), toDate: localISODate(today) }
  }
  // custom — caller provides YYYY-MM-DD strings
  const f = customFrom ? new Date(customFrom + 'T00:00:00') : today
  const t = customTo   ? new Date(customTo   + 'T00:00:00') : today
  return { fromTs: startOfDay(f), toTs: endOfDay(t),
           fromDate: localISODate(f), toDate: localISODate(t) }
}
