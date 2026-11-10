import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DateRange } from '../modules/overview/financials'

// ── Mock supabase ─────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file. The factory must not reference
// variables declared later in the file. Use vi.hoisted() to declare the mock
// object before the hoist point so the factory can close over it.

const { mockSupabase, mockSalesDataRef, mockExpensesDataRef, mockErrorRef } =
  vi.hoisted(() => {
    const mockSalesDataRef:    { value: unknown[] }                           = { value: [] }
    const mockExpensesDataRef: { value: unknown[] }                           = { value: [] }
    const mockErrorRef:        { value: { message: string } | null }          = { value: null }

    function makeChain(table: string) {
      const chain: Record<string, (...args: unknown[]) => unknown> = {
        select: () => chain,
        gte:    () => chain,
        lte:    () => chain,
        neq:    () => chain,
        order:  () => chain,
        limit:  () => {
          if (mockErrorRef.value) {
            return Promise.resolve({ data: null, error: mockErrorRef.value })
          }
          const data = table === 'sales' ? mockSalesDataRef.value : mockExpensesDataRef.value
          return Promise.resolve({ data, error: null })
        },
      }
      return chain
    }

    const mockSupabase = { from: vi.fn((table: string) => makeChain(table)) }

    return { mockSupabase, mockSalesDataRef, mockExpensesDataRef, mockErrorRef }
  })

vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }))

import { getFinancialSummary } from '../modules/overview/financials'

// ── Helpers ───────────────────────────────────────────────────────────────────

const range: DateRange = {
  fromTs:   '2024-06-01T00:00:00+00:00',
  toTs:     '2024-06-30T23:59:59+00:00',
  fromDate: '2024-06-01',
  toDate:   '2024-06-30',
}

function makeSale(
  status: 'paid' | 'pending' | 'cancelled',
  total: number,
  items: { unit_cost: number | null; quantity: number }[]
) {
  return {
    id:             crypto.randomUUID(),
    owner_id:       'owner-1',
    sale_number:    'S-001',
    subtotal:       total,
    total,
    payment_method: 'cash' as const,
    payment_status: status,
    sold_at:        '2024-06-15T10:00:00+00:00',
    created_at:     '2024-06-15T10:00:00+00:00',
    updated_at:     '2024-06-15T10:00:00+00:00',
    sale_items: items.map(i => ({
      id:           crypto.randomUUID(),
      sale_id:      'sale-1',
      product_id:   'prod-1',
      product_name: 'Test Product',
      unit_price:   10,
      unit_cost:    i.unit_cost,
      quantity:     i.quantity,
      line_total:   10 * i.quantity,
      created_at:   '2024-06-15T10:00:00+00:00',
    })),
  }
}

function makeExpense(amount: number) {
  return {
    id:           crypto.randomUUID(),
    owner_id:     'owner-1',
    title:        'Test Expense',
    amount,
    category:     'rent' as const,
    description:  null,
    expense_date: '2024-06-15',
    created_at:   '2024-06-15T10:00:00+00:00',
    updated_at:   '2024-06-15T10:00:00+00:00',
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getFinancialSummary', () => {
  beforeEach(() => {
    mockSalesDataRef.value    = []
    mockExpensesDataRef.value = []
    mockErrorRef.value        = null
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, (...args: unknown[]) => unknown> = {
        select: () => chain,
        gte:    () => chain,
        lte:    () => chain,
        neq:    () => chain,
        order:  () => chain,
        limit:  () => {
          if (mockErrorRef.value) {
            return Promise.resolve({ data: null, error: mockErrorRef.value })
          }
          const data = table === 'sales' ? mockSalesDataRef.value : mockExpensesDataRef.value
          return Promise.resolve({ data, error: null })
        },
      }
      return chain
    })
  })

  it('pending sale excluded from paidRevenue; cancelled excluded entirely', async () => {
    const paid    = makeSale('paid', 100, [{ unit_cost: 50, quantity: 1 }])
    const pending = makeSale('pending', 200, [{ unit_cost: 80, quantity: 1 }])
    // The financials function filters out cancelled via .neq('payment_status','cancelled')
    // so only paid+pending arrive. Cancelled would be absent from the dataset.
    mockSalesDataRef.value    = [paid, pending]
    mockExpensesDataRef.value = []

    const result = await getFinancialSummary(range)
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data!.paidRevenue).toBe(100)
    expect(result.data!.pendingRevenue).toBe(200)
  })

  it('all-null unit_cost → cogs=null, grossProfit=null, netProfit=paidRevenue-expenses', async () => {
    const sale = makeSale('paid', 100, [
      { unit_cost: null, quantity: 2 },
      { unit_cost: null, quantity: 1 },
    ])
    mockSalesDataRef.value    = [sale]
    mockExpensesDataRef.value = []

    const result = await getFinancialSummary(range)
    expect(result.data!.cogs).toBeNull()
    expect(result.data!.grossProfit).toBeNull()
    // netProfit is always revenue - expenses even when COGS unknown
    expect(result.data!.netProfit).toBe(100)
  })

  it('mixed cost → cogs is sum of known costs, cogsIncomplete=true', async () => {
    const sale = makeSale('paid', 100, [
      { unit_cost: 20, quantity: 2 },   // contributes 40
      { unit_cost: null, quantity: 1 }, // missing
    ])
    mockSalesDataRef.value    = [sale]
    mockExpensesDataRef.value = []

    const result = await getFinancialSummary(range)
    expect(result.data!.cogs).toBe(40)
    expect(result.data!.cogsIncomplete).toBe(true)
  })

  it('empty sales → paidRevenue=0, cogs=null', async () => {
    mockSalesDataRef.value    = []
    mockExpensesDataRef.value = []

    const result = await getFinancialSummary(range)
    expect(result.data!.paidRevenue).toBe(0)
    expect(result.data!.cogs).toBeNull()
  })

  it('empty expenses → totalExpenses=0', async () => {
    mockSalesDataRef.value    = []
    mockExpensesDataRef.value = []

    const result = await getFinancialSummary(range)
    expect(result.data!.totalExpenses).toBe(0)
  })

  it('known COGS + expenses → netProfit = paidRevenue - totalExpenses', async () => {
    const sale    = makeSale('paid', 200, [{ unit_cost: 80, quantity: 1 }])
    const expense = makeExpense(30)
    mockSalesDataRef.value    = [sale]
    mockExpensesDataRef.value = [expense]

    const result = await getFinancialSummary(range)
    // grossProfit = 200 - 80 = 120; netProfit = revenue(200) - expenses(30) = 170
    expect(result.data!.grossProfit).toBe(120)
    expect(result.data!.netProfit).toBe(170)
  })

  it('supabase error → returns { data: null, error: { message: ... } }', async () => {
    mockErrorRef.value = { message: 'connection refused' }

    const result = await getFinancialSummary(range)
    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.message).toBe('connection refused')
  })
})
