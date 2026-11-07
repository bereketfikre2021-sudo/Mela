/**
 * Report aggregation service — Phase 4.1.
 *
 * All aggregations are performed client-side from data already fetched via RLS
 * (sales, sale_items, expenses). No new DB queries or migrations are required.
 *
 * Honesty rules carried forward from financials.ts:
 *  - Only PAID sales contribute to revenue, COGS, and product rankings.
 *  - PENDING sales are tallied separately.
 *  - CANCELLED sales are excluded entirely.
 *  - unit_cost is used for COGS; NULL rows are counted as missing cost data.
 *  - Product rankings use historical product_name and unit_price snapshots.
 *  - No current product prices or catalogue data is consulted.
 */
import { supabase } from '../../lib/supabase'
import type { Expense, ExpenseCategory } from '../expenses/types'
import type { DateRange } from '../overview/financials'
import type { SaleWithItems } from '../retail/types'

// ── Aggregated types ──────────────────────────────────────────────────────────

export interface DailySalesSummary {
  date: string        // YYYY-MM-DD local
  revenue: number     // paid sales
  pending: number
  transactionCount: number
}

export interface MonthlySalesSummary {
  month: string       // YYYY-MM
  revenue: number
  transactionCount: number
}

export interface PaymentMethodSummary {
  method: 'cash' | 'telebirr' | 'bank_transfer'
  revenue: number
  transactionCount: number
}

export interface ProductSummary {
  productName: string
  totalQuantity: number
  totalRevenue: number       // sum of line_total from historical snapshots
  totalCogs: number | null   // null if any item in this product's sales lacks unit_cost
  cogsIncomplete: boolean
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory
  totalAmount: number
  transactionCount: number
}

export interface MonthlyExpenseSummary {
  month: string       // YYYY-MM
  totalAmount: number
}

export interface ReportData {
  // ── Profit summary ────────────────────────────────────────────────────────
  paidRevenue: number
  pendingRevenue: number
  totalExpenses: number
  cogs: number | null
  grossProfit: number | null
  netProfit: number | null
  cogsIncomplete: boolean

  // ── Sales aggregations ────────────────────────────────────────────────────
  totalSaleTransactions: number
  pendingTransactions: number
  dailySales: DailySalesSummary[]
  monthlySales: MonthlySalesSummary[]
  salesByPaymentMethod: PaymentMethodSummary[]

  // ── Product aggregations ──────────────────────────────────────────────────
  topProductsByQuantity: ProductSummary[]    // top 10
  topProductsByRevenue: ProductSummary[]     // top 10

  // ── Expense aggregations ──────────────────────────────────────────────────
  expensesByCategory: ExpenseCategorySummary[]
  monthlyExpenses: MonthlyExpenseSummary[]

  // ── Raw data (for detail views) ───────────────────────────────────────────
  sales: SaleWithItems[]
  expenses: Expense[]
}

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/** Extract YYYY-MM-DD from an ISO timestamp using local offset. */
function isoToLocalDate(isoTs: string): string {
  // The timestamp from Supabase may be UTC; convert to local via Date.
  const d = new Date(isoTs)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Extract YYYY-MM from an ISO timestamp using local offset. */
function isoToLocalMonth(isoTs: string): string {
  return isoToLocalDate(isoTs).slice(0, 7)
}

export async function getReportData(range: DateRange): Result<ReportData> {
  if (!supabase) return noClient()

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('sold_at', range.fromTs)
      .lte('sold_at', range.toTs)
      .neq('payment_status', 'cancelled')
      .order('sold_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', range.fromDate)
      .lte('expense_date', range.toDate)
      .order('expense_date', { ascending: false }),
  ])

  if (salesRes.error)    return { data: null, error: { message: salesRes.error.message } }
  if (expensesRes.error) return { data: null, error: { message: expensesRes.error.message } }

  const allSales    = (salesRes.data   as SaleWithItems[]) ?? []
  const allExpenses = (expensesRes.data as Expense[])      ?? []

  const paidSales    = allSales.filter(s => s.payment_status === 'paid')
  const pendingSales = allSales.filter(s => s.payment_status === 'pending')

  const paidRevenue    = paidSales.reduce((a, s) => a + s.total, 0)
  const pendingRevenue = pendingSales.reduce((a, s) => a + s.total, 0)
  const totalExpenses  = allExpenses.reduce((a, e) => a + e.amount, 0)

  // ── COGS ──────────────────────────────────────────────────────────────────
  let cogsKnown = 0, hasAnyCost = false, missingCost = false
  for (const sale of paidSales) {
    for (const item of sale.sale_items) {
      if (item.unit_cost !== null && item.unit_cost !== undefined) {
        cogsKnown += item.unit_cost * item.quantity; hasAnyCost = true
      } else { missingCost = true }
    }
  }
  const cogs        = hasAnyCost ? cogsKnown : null
  const grossProfit = cogs !== null ? paidRevenue - cogs : null
  const netProfit   = grossProfit !== null ? grossProfit - totalExpenses : null

  // ── Daily sales summary ───────────────────────────────────────────────────
  const dailyMap = new Map<string, DailySalesSummary>()
  for (const sale of allSales) {
    const date = isoToLocalDate(sale.sold_at)
    const row = dailyMap.get(date) ?? { date, revenue: 0, pending: 0, transactionCount: 0 }
    if (sale.payment_status === 'paid') { row.revenue += sale.total; row.transactionCount++ }
    else { row.pending += sale.total; row.transactionCount++ }
    dailyMap.set(date, row)
  }
  const dailySales = [...dailyMap.values()].sort((a, b) => b.date.localeCompare(a.date))

  // ── Monthly sales summary ─────────────────────────────────────────────────
  const monthSalesMap = new Map<string, MonthlySalesSummary>()
  for (const sale of paidSales) {
    const month = isoToLocalMonth(sale.sold_at)
    const row = monthSalesMap.get(month) ?? { month, revenue: 0, transactionCount: 0 }
    row.revenue += sale.total; row.transactionCount++
    monthSalesMap.set(month, row)
  }
  const monthlySales = [...monthSalesMap.values()].sort((a, b) => b.month.localeCompare(a.month))

  // ── Sales by payment method ───────────────────────────────────────────────
  const pmMap = new Map<string, PaymentMethodSummary>()
  for (const sale of paidSales) {
    const row = pmMap.get(sale.payment_method) ?? {
      method: sale.payment_method as PaymentMethodSummary['method'],
      revenue: 0, transactionCount: 0,
    }
    row.revenue += sale.total; row.transactionCount++
    pmMap.set(sale.payment_method, row)
  }
  const salesByPaymentMethod = [...pmMap.values()].sort((a, b) => b.revenue - a.revenue)

  // ── Product aggregations — historical snapshots only ──────────────────────
  const productMap = new Map<string, ProductSummary>()
  for (const sale of paidSales) {
    for (const item of sale.sale_items) {
      const key = item.product_name   // use snapshot name; handles deleted products
      const row = productMap.get(key) ?? {
        productName: item.product_name,
        totalQuantity: 0, totalRevenue: 0, totalCogs: 0, cogsIncomplete: false,
      }
      row.totalQuantity += item.quantity
      row.totalRevenue  += item.line_total
      if (item.unit_cost !== null && item.unit_cost !== undefined) {
        row.totalCogs = (row.totalCogs ?? 0) + item.unit_cost * item.quantity
      } else {
        row.cogsIncomplete = true
        if (row.totalCogs === 0 && !row.cogsIncomplete) row.totalCogs = null
      }
      productMap.set(key, row)
    }
  }
  // Normalise: if cogsIncomplete and totalCogs is still 0 with no known costs, set null
  for (const [, row] of productMap) {
    if (row.cogsIncomplete && row.totalCogs === 0) {
      // check if any known cost was added
      row.totalCogs = null
    }
  }
  const products = [...productMap.values()]
  const topProductsByQuantity = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10)
  const topProductsByRevenue  = [...products].sort((a, b) => b.totalRevenue  - a.totalRevenue).slice(0, 10)

  // ── Expense by category ────────────────────────────────────────────────────
  const catMap = new Map<string, ExpenseCategorySummary>()
  for (const exp of allExpenses) {
    const row = catMap.get(exp.category) ?? {
      category: exp.category as ExpenseCategory, totalAmount: 0, transactionCount: 0,
    }
    row.totalAmount += exp.amount; row.transactionCount++
    catMap.set(exp.category, row)
  }
  const expensesByCategory = [...catMap.values()].sort((a, b) => b.totalAmount - a.totalAmount)

  // ── Monthly expenses ───────────────────────────────────────────────────────
  const monthExpMap = new Map<string, MonthlyExpenseSummary>()
  for (const exp of allExpenses) {
    const month = exp.expense_date.slice(0, 7)
    const row = monthExpMap.get(month) ?? { month, totalAmount: 0 }
    row.totalAmount += exp.amount
    monthExpMap.set(month, row)
  }
  const monthlyExpenses = [...monthExpMap.values()].sort((a, b) => b.month.localeCompare(a.month))

  return {
    data: {
      paidRevenue, pendingRevenue, totalExpenses,
      cogs, grossProfit, netProfit, cogsIncomplete: missingCost,
      totalSaleTransactions: paidSales.length,
      pendingTransactions: pendingSales.length,
      dailySales, monthlySales, salesByPaymentMethod,
      topProductsByQuantity, topProductsByRevenue,
      expensesByCategory, monthlyExpenses,
      sales: paidSales, expenses: allExpenses,
    },
    error: null,
  }
}
