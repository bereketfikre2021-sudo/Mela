/**
 * Financial calculation service — Phase 3.2 / 3.3.
 *
 * Honesty rules (enforced here, not just in the UI):
 *  - Only PAID sales count as revenue.
 *  - PENDING sales are tracked separately and never added to revenue.
 *  - CANCELLED sales are excluded entirely from every calculation.
 *  - COGS uses only sale_items where unit_cost IS NOT NULL (pre-0006 rows are NULL).
 *  - Gross / net profit are NULL when no cost data exists; partial when some items
 *    lack cost data. cogsIncomplete distinguishes the two cases.
 *  - No percentages, trends or comparisons are derived here — incomplete history
 *    makes such figures misleading.
 *
 * Timezone:
 *  Date boundaries are expressed with the caller's UTC offset so "today" refers
 *  to the device's local calendar day, not UTC. The caller supplies ISO timestamps
 *  with an explicit offset (e.g. "2024-01-15T00:00:00+03:00").
 */
import { supabase } from '../../lib/supabase'
import type { Expense } from '../expenses/types'
import type { SaleWithItems } from '../retail/types'

export interface DateRange {
  /** ISO timestamp with UTC offset, start of local day (inclusive). */
  fromTs: string
  /** ISO timestamp with UTC offset, end of local day (inclusive). */
  toTs: string
  /** YYYY-MM-DD of the start date in local time (for expense_date filter). */
  fromDate: string
  /** YYYY-MM-DD of the end date in local time (for expense_date filter). */
  toDate: string
}

export interface FinancialSummary {
  paidRevenue: number
  pendingRevenue: number
  /**
   * COGS from paid sales where unit_cost is known.
   * null  = no paid sales had any cost data in this period.
   * 0     = products were sold but all had cost_price = 0.
   */
  cogs: number | null
  /**
   * paidRevenue − cogs. null when cogs is null.
   * May be partial when cogsIncomplete is true.
   */
  grossProfit: number | null
  /** true when at least one paid-sale item has unit_cost = NULL. */
  cogsIncomplete: boolean
  totalExpenses: number
  /** grossProfit − totalExpenses. null when grossProfit is null. */
  netProfit: number | null
  /** Paid sales only (for recent-activity display). */
  sales: SaleWithItems[]
  /** All expenses in the period (for recent-activity display). */
  expenses: Expense[]
}

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getFinancialSummary(range: DateRange): Result<FinancialSummary> {
  if (!supabase) return noClient()

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('sold_at', range.fromTs)
      .lte('sold_at', range.toTs)
      .neq('payment_status', 'cancelled')
      .order('sold_at', { ascending: false })
      .limit(10000), // guard against PostgREST 1000-row default; small businesses won't hit 10k/period
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', range.fromDate)
      .lte('expense_date', range.toDate)
      .order('expense_date', { ascending: false })
      .limit(10000),
  ])

  if (salesRes.error)    return { data: null, error: { message: salesRes.error.message } }
  if (expensesRes.error) return { data: null, error: { message: expensesRes.error.message } }

  const allSales    = (salesRes.data   as SaleWithItems[]) ?? []
  const allExpenses = (expensesRes.data as Expense[])      ?? []

  const paidSales    = allSales.filter(s => s.payment_status === 'paid')
  const pendingSales = allSales.filter(s => s.payment_status === 'pending')

  const paidRevenue    = paidSales.reduce((acc, s) => acc + s.total, 0)
  const pendingRevenue = pendingSales.reduce((acc, s) => acc + s.total, 0)
  const totalExpenses  = allExpenses.reduce((acc, e) => acc + e.amount, 0)

  let cogsKnown   = 0
  let hasAnyCost  = false
  let missingCost = false

  for (const sale of paidSales) {
    for (const item of sale.sale_items) {
      if (item.unit_cost !== null && item.unit_cost !== undefined) {
        cogsKnown += item.unit_cost * item.quantity
        hasAnyCost = true
      } else {
        missingCost = true
      }
    }
  }

  const cogs        = hasAnyCost ? cogsKnown : null
  const grossProfit = cogs !== null ? paidRevenue - cogs : null
  const netProfit   = grossProfit !== null ? grossProfit - totalExpenses : null

  return {
    data: {
      paidRevenue,
      pendingRevenue,
      cogs,
      grossProfit,
      cogsIncomplete: missingCost,
      totalExpenses,
      netProfit,
      sales:    paidSales,
      expenses: allExpenses,
    },
    error: null,
  }
}
