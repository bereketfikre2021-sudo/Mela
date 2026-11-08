import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { localISODate, startOfDay, endOfDay, periodRange } from '../modules/overview/dateRange'

describe('dateRange helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix "now" to 2024-06-15 12:00:00 UTC
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000+00:00'))
    // Mock timezone offset to 0 (UTC) so all tests are deterministic
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('localISODate(new Date()) returns 2024-06-15', () => {
    expect(localISODate(new Date())).toBe('2024-06-15')
  })

  it("periodRange('today') has correct fromDate, toDate, fromTs, toTs", () => {
    const r = periodRange('today')
    expect(r.fromDate).toBe('2024-06-15')
    expect(r.toDate).toBe('2024-06-15')
    expect(r.fromTs).toBe('2024-06-15T00:00:00+00:00')
    expect(r.toTs).toBe('2024-06-15T23:59:59+00:00')
  })

  it("periodRange('week') fromDate='2024-06-09', toDate='2024-06-15'", () => {
    const r = periodRange('week')
    expect(r.fromDate).toBe('2024-06-09')
    expect(r.toDate).toBe('2024-06-15')
  })

  it("periodRange('month') fromDate='2024-06-01', toDate='2024-06-15'", () => {
    const r = periodRange('month')
    expect(r.fromDate).toBe('2024-06-01')
    expect(r.toDate).toBe('2024-06-15')
  })

  it('startOfDay and endOfDay both contain +00:00', () => {
    const today = new Date()
    expect(startOfDay(today)).toContain('+00:00')
    expect(endOfDay(today)).toContain('+00:00')
  })

  it('endOfDay(today) string-compares less than startOfDay(tomorrow) confirming non-overlap', () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    expect(endOfDay(today) < startOfDay(tomorrow)).toBe(true)
  })
})
