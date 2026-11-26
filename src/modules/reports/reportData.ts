/**
 * Report aggregation service.
 * For personal accounts, revenue comes from income_entries (not sales).
 * For all other business types, revenue comes from the sales table.
 */
import { supabase } from '../../lib/supabase'
import type { Expense, ExpenseCategory } from '../expenses/types'
import type { DateRange } from '../overview/financials'
import type { SaleWithItems } from '../retail/types'
import type { IncomeEntry, IncomeSource } from '../income/types'

export interface DailySalesSummary {
  date: string
  revenue: number
  pending: number
  transactionCount: number
}

export interface MonthlySalesSummary {
  month: string
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
  totalRevenue: number
  totalCogs: number | null
  cogsIncomplete: boolean
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory
  totalAmount: number
  transactionCount: number
}

export interface MonthlyExpenseSummary {
  month: string
  totalAmount: number
}

export interface IncomeSourceSummary {
  source: IncomeSource
  totalAmount: number
  transactionCount: number
}

export interface DailyIncomeSummary {
  date: string
  totalAmount: number
  transactionCount: number
}

export interface MonthlyIncomeSummary {
  month: string
  totalAmount: number
  transactionCount: number
}

export interface ReportData {
  paidRevenue: number
  pendingRevenue: number
  totalExpenses: number
  cogs: number | null
  grossProfit: number | null
  netProfit: number
  cogsIncomplete: boolean
  totalSaleTransactions: number
  pendingTransactions: number
  dailySales: DailySalesSummary[]
  monthlySales: MonthlySalesSummary[]
  salesByPaymentMethod: PaymentMethodSummary[]
  topProductsByQuantity: ProductSummary[]
  topProductsByRevenue: ProductSummary[]
  expensesByCategory: ExpenseCategorySummary[]
  monthlyExpenses: MonthlyExpenseSummary[]
  incomeBySource: IncomeSourceSummary[]
  dailyIncome: DailyIncomeSummary[]
  monthlyIncome: MonthlyIncomeSummary[]
  incomeEntries: IncomeEntry[]
  sales: SaleWithItems[]
  expenses: Expense[]
}

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

function isoToLocalDate(isoTs: string): string {
  const d = new Date(isoTs)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToLocalMonth(isoTs: string): string {
  return isoToLocalDate(isoTs).slice(0, 7)
}

export async function getReportData(range: DateRange, isPersonal = false, businessId?: string): Result<ReportData> {
  if (!supabase) return noClient()

  let incomeEntries: IncomeEntry[] = []
  if (isPersonal) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      let q = supabase
        .from('income_entries')
        .select('*')
        .eq('owner_id', user.id)
        .gte('received_at', range.fromTs)
        .lte('received_at', range.toTs)
        .order('received_at', { ascending: false })
        .limit(10000)
      if (businessId) q = q.eq('business_id', businessId)
      const { data } = await q
      incomeEntries = (data as IncomeEntry[]) ?? []
    }
  }

  let salesQ = supabase.from('sales').select('*, sale_items(*)')
    .gte('sold_at', range.fromTs).lte('sold_at', range.toTs)
    .neq('payment_status', 'cancelled')
    .order('sold_at', { ascending: false }).limit(10000)
  if (businessId) salesQ = salesQ.eq('business_id', businessId)

  let expensesQ = supabase.from('expenses').select('*')
    .gte('expense_date', range.fromDate).lte('expense_date', range.toDate)
    .order('expense_date', { ascending: false }).limit(10000)
  if (businessId) expensesQ = expensesQ.eq('business_id', businessId)

  const [salesRes, expensesRes] = await Promise.all([salesQ, expensesQ])

  if (salesRes.error)    return { data: null, error: { message: salesRes.error.message } }
  if (expensesRes.error) return { data: null, error: { message: expensesRes.error.message } }

  const allSales    = (salesRes.data   as SaleWithItems[]) ?? []
  const allExpenses = (expensesRes.data as Expense[])      ?? []
  const paidSales    = allSales.filter(s => s.payment_status === 'paid')
  const pendingSales = allSales.filter(s => s.payment_status === 'pending' || s.payment_status === 'partial')

  const paidRevenue    = isPersonal
    ? incomeEntries.reduce((a, e) => a + e.amount, 0)
    : paidSales.reduce((a, s) => a + s.total, 0)
  const pendingRevenue = pendingSales.reduce((a, s) => a + (s.total - (s.amount_paid ?? 0)), 0)
  const totalExpenses  = allExpenses.reduce((a, e) => a + e.amount, 0)

  let cogsKnown = 0, hasAnyCost = false, missingCost = false
  if (!isPersonal) {
    for (const sale of paidSales)
      for (const item of sale.sale_items)
        if (item.unit_cost != null) { cogsKnown += item.unit_cost * item.quantity; hasAnyCost = true }
        else missingCost = true
  }
  const cogs        = hasAnyCost ? cogsKnown : null
  const grossProfit = cogs !== null ? paidRevenue - cogs : null
  const netProfit   = (grossProfit !== null ? grossProfit : paidRevenue) - totalExpenses

  // ── Daily sales ───────────────────────────────────────────────────────────
  const dailyMap = new Map<string, DailySalesSummary>()
  for (const sale of allSales) {
    const date = isoToLocalDate(sale.sold_at)
    const row = dailyMap.get(date) ?? { date, revenue: 0, pending: 0, transactionCount: 0 }
    if (sale.payment_status === 'paid') { row.revenue += sale.total; row.transactionCount++ }
    else { row.pending += sale.total; row.transactionCount++ }
    dailyMap.set(date, row)
  }
  const dailySales = [...dailyMap.values()].sort((a, b) => b.date.localeCompare(a.date))

  // ── Monthly sales ─────────────────────────────────────────────────────────
  const monthSalesMap = new Map<string, MonthlySalesSummary>()
  for (const sale of paidSales) {
    const month = isoToLocalMonth(sale.sold_at)
    const row = monthSalesMap.get(month) ?? { month, revenue: 0, transactionCount: 0 }
    row.revenue += sale.total; row.transactionCount++
    monthSalesMap.set(month, row)
  }
  const monthlySales = [...monthSalesMap.values()].sort((a, b) => b.month.localeCompare(a.month))

  // ── Payment methods ───────────────────────────────────────────────────────
  const pmMap = new Map<string, PaymentMethodSummary>()
  for (const sale of paidSales) {
    const row = pmMap.get(sale.payment_method) ?? { method: sale.payment_method as PaymentMethodSummary['method'], revenue: 0, transactionCount: 0 }
    row.revenue += sale.total; row.transactionCount++
    pmMap.set(sale.payment_method, row)
  }
  const salesByPaymentMethod = [...pmMap.values()].sort((a, b) => b.revenue - a.revenue)

  // ── Products ──────────────────────────────────────────────────────────────
  const productCostKnown = new Map<string, boolean>()
  const productMap = new Map<string, ProductSummary>()
  for (const sale of paidSales) {
    for (const item of sale.sale_items) {
      const row = productMap.get(item.product_name) ?? { productName: item.product_name, totalQuantity: 0, totalRevenue: 0, totalCogs: 0, cogsIncomplete: false }
      row.totalQuantity += item.quantity
      row.totalRevenue  += item.line_total
      if (item.unit_cost != null) { row.totalCogs = (row.totalCogs ?? 0) + item.unit_cost * item.quantity; productCostKnown.set(item.product_name, true) }
      else row.cogsIncomplete = true
      productMap.set(item.product_name, row)
    }
  }
  for (const [key, row] of productMap)
    if (row.cogsIncomplete && !productCostKnown.get(key)) row.totalCogs = null
  const products = [...productMap.values()]
  const topProductsByQuantity = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10)
  const topProductsByRevenue  = [...products].sort((a, b) => b.totalRevenue  - a.totalRevenue).slice(0, 10)

  // ── Expenses by category ──────────────────────────────────────────────────
  const catMap = new Map<string, ExpenseCategorySummary>()
  for (const exp of allExpenses) {
    const row = catMap.get(exp.category) ?? { category: exp.category as ExpenseCategory, totalAmount: 0, transactionCount: 0 }
    row.totalAmount += exp.amount; row.transactionCount++
    catMap.set(exp.category, row)
  }
  const expensesByCategory = [...catMap.values()].sort((a, b) => b.totalAmount - a.totalAmount)

  // ── Monthly expenses ──────────────────────────────────────────────────────
  const monthExpMap = new Map<string, MonthlyExpenseSummary>()
  for (const exp of allExpenses) {
    const month = exp.expense_date.slice(0, 7)
    const row = monthExpMap.get(month) ?? { month, totalAmount: 0 }
    row.totalAmount += exp.amount
    monthExpMap.set(month, row)
  }
  const monthlyExpenses = [...monthExpMap.values()].sort((a, b) => b.month.localeCompare(a.month))

  // ── Income by source (personal) ───────────────────────────────────────────
  const sourceMap = new Map<string, IncomeSourceSummary>()
  for (const e of incomeEntries) {
    const row = sourceMap.get(e.source) ?? { source: e.source, totalAmount: 0, transactionCount: 0 }
    row.totalAmount += e.amount; row.transactionCount++
    sourceMap.set(e.source, row)
  }
  const incomeBySource = [...sourceMap.values()].sort((a, b) => b.totalAmount - a.totalAmount)

  // ── Daily income (personal) ───────────────────────────────────────────────
  const dailyIncMap = new Map<string, DailyIncomeSummary>()
  for (const e of incomeEntries) {
    const date = isoToLocalDate(e.received_at)
    const row = dailyIncMap.get(date) ?? { date, totalAmount: 0, transactionCount: 0 }
    row.totalAmount += e.amount; row.transactionCount++
    dailyIncMap.set(date, row)
  }
  const dailyIncome = [...dailyIncMap.values()].sort((a, b) => b.date.localeCompare(a.date))

  // ── Monthly income (personal) ─────────────────────────────────────────────
  const monthIncMap = new Map<string, MonthlyIncomeSummary>()
  for (const e of incomeEntries) {
    const month = isoToLocalMonth(e.received_at)
    const row = monthIncMap.get(month) ?? { month, totalAmount: 0, transactionCount: 0 }
    row.totalAmount += e.amount; row.transactionCount++
    monthIncMap.set(month, row)
  }
  const monthlyIncome = [...monthIncMap.values()].sort((a, b) => b.month.localeCompare(a.month))

  return {
    data: {
      paidRevenue, pendingRevenue, totalExpenses,
      cogs, grossProfit, netProfit, cogsIncomplete: missingCost,
      totalSaleTransactions: paidSales.length,
      pendingTransactions: pendingSales.length,
      dailySales, monthlySales, salesByPaymentMethod,
      topProductsByQuantity, topProductsByRevenue,
      expensesByCategory, monthlyExpenses,
      incomeBySource, dailyIncome, monthlyIncome, incomeEntries,
      sales: paidSales, expenses: allExpenses,
    },
    error: null,
  }
}
