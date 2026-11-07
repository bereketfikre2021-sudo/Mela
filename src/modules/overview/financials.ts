/**
 * Financial calculation service — Phase 3.2.
 *
 * All data comes from the owner's own Supabase tables (sales, sale_items,
 * expenses) filtered by a date range. RLS ensures cross-owner isolation.
 *
 * Key honesty rules:
 *  - Only PAID sales count as revenue.
 *  - PENDING sales are tracked separately (not added to revenue).
 *  - CANCELLED sales are excluded entirely.
 *  - COGS is only calculable for items with a non-NULL unit_cost snapshot.
 *  - Gross profit is only shown when at least one sale item has a known cost.
 *  - When some items lack cost data the result is flagged as incomplete so
 *    the UI can warn the user rather than presenting a misleading figure.
 */
import { supabase } from '../../lib/supabase'
import type { Expense } from '../expenses/types'
import type { SaleWithItems } from '../retail/types'

export interface DateRange {
  from: string   // ISO date YYYY-MM-DD (inclusive)
  to: string     // ISO date YYYY-MM-DD (inclusive)
}

export interface FinancialSummary {
  /** Revenue from paid sales only. */
  paidRevenue: number
  /** Total of sales with payment_status = 'pending'. */
  pendingRevenue: number
  /**
   * Cost of goods sold — only from sale_items where unit_cost IS NOT NULL.
   * NULL means no sales with known costs exist in this period.
   */
  cogs: number | null
  /**
   * paidRevenue - cogs. NULL when cogs is NULL.
   * `cogsIncomplete` being true means some items lacked cost data.
   */
  grossProfit: number | null
  /** True when at least one sale_item in paid sales has NULL unit_cost. */
  cogsIncomplete: boolean
  /** Sum of all expenses in the date range. */
  totalExpenses: number
  /**
   * grossProfit - totalExpenses. NULL when grossProfit is NULL.
   * `cogsIncomplete` remains true in that case.
   */
  netProfit: number | null
  /** Raw paid sales for the period. */
  sales: SaleWithItems[]
  /** Raw expenses for the period. */
  expenses: Expense[]
}

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getFinancialSummary(range: DateRange): Result<FinancialSummary> {
  if (!supabase) return noClient()

  // Supabase date columns: sold_at is timestamptz, expense_date is date.
  // We compare sold_at against the start-of-day and end-of-day of the range.
  const fromTs = `${range.from}T00:00:00`
  const toTs   = `${range.to}T23:59:59`

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('sold_at', fromTs)
      .lte('sold_at', toTs)
      .neq('payment_status', 'cancelled')
      .order('sold_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', range.from)
      .lte('expense_date', range.to)
      .order('expense_date', { ascending: false }),
  ])

  if (salesRes.error)    return { data: null, error: { message: salesRes.error.message } }
  if (expensesRes.error) return { data: null, error: { message: expensesRes.error.message } }

  const allSales    = (salesRes.data   as SaleWithItems[]) ?? []
  const allExpenses = (expensesRes.data as Expense[])      ?? []

  const paidSales    = allSales.filter(s => s.payment_status === 'paid')
  const pendingSales = allSales.filter(s => s.payment_status === 'pending')

  const paidRevenue   = paidSales.reduce((s, sale) => s + sale.total, 0)
  const pendingRevenue = pendingSales.reduce((s, sale) => s + sale.total, 0)
  const totalExpenses  = allExpenses.reduce((s, e) => s + e.amount, 0)

  // COGS from paid sales — only items with known unit_cost.
  let cogsKnown    = 0
  let hasAnyCost   = false
  let missingCost  = false

  for (const sale of paidSales) {
    for (const item of sale.sale_items) {
      if (item.unit_cost !== null) {
        cogsKnown += item.unit_cost * item.quantity
        hasAnyCost = true
      } else {
        missingCost = true
      }
    }
  }

  // Gross and net profit are calculable only when at least one item has cost data.
  // We still compute partial figures but flag them as incomplete.
  const cogs        = hasAnyCost ? cogsKnown : null
  const grossProfit = cogs !== null ? paidRevenue - cogs : null
  const netProfit   = grossProfit !== null ? grossProfit - totalExpenses : null

  return {
    data: {
      paidRevenue,
      pendingRevenue,
      cogs,
      grossProfit,
      netProfit,
      cogsIncomplete: missingCost,
      totalExpenses,
      sales:    paidSales,
      expenses: allExpenses,
    },
    error: null,
  }
}
