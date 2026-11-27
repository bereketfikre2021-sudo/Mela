/**
 * Local-timezone date helpers.
 *
 * NEVER use new Date().toISOString().slice(0,10) for user-facing dates —
 * toISOString() returns UTC, which is 3 hours behind Ethiopia (UTC+3).
 * Between midnight and 3am local time it gives yesterday's date.
 *
 * These helpers use the device's local calendar, which is correct for
 * recording expenses, purchases, sales dates etc.
 */

/** Returns the current local date as YYYY-MM-DD. */
export function localDateISO(date: Date = new Date()): string {
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  return localDateISO(new Date())
}
