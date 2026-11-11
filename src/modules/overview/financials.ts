/**
 * Financial calculation service — Phase 3.2 / 3.3.
 *
 * Profit model (F1 — correct daily profit):
 *  - Revenue     = Σ sale.total for PAID sales in the period (scoped by sold_at).
 *  - COGS        = Σ sale_items.unit_cost * quantity for PAID sales where
 *                  unit_cost IS NOT NULL (the cost snapshot from migration 0006).
 *  - Gross profit = revenue − COGS (when COGS is known).
 *  - Operating expenses = Σ expenses.amount in the period (scoped by expense_date).
 *  - Net profit  = gross profit − operating expenses
 *                  (falls back to revenue − expenses when no COGS exists).
 *
 * Honesty rules (enforced here, not just in the UI):
 *  - Only PAID sales count as revenue. PENDING sales are tracked separately and
 *    never added to revenue; CANCELLED sales are excluded entirely.
 *  - sale.total already holds any per-sale adjustment the DB records. Today
 *    total === subtotal (no discount/tax fields exist yet), so revenue is
 *    discount-correct by construction and stays correct if discounts are added.
 *  - Refunds are modelled as sale cancellation (payment_status = 'cancelled'),
 *    excluded above; there is no partial-refund state.
 *  - COGS uses only the unit_cost snapshot on sale_items — current product cost is
 *    never substituted in, so historical cost snapshots are preserved and COGS is
 *    never double-counted with inventory purchases (separate `purchases` table).
 *  - Operating expenses come only from the `expenses` table; inventory purchases
 *    are never counted as expenses.
 *  - Gross profit is NULL when no cost data exists (service businesses, pre-0006
 *    sales) — costs are never invented. Net profit is always a number
 *    (revenue − expenses in that case). cogsIncomplete flags partial cost data.
 *  - Revenue is scoped by sold_at, so marking a prior pending sale paid on a
 *    later day never adds to that later day's revenue: debt repayments are not
 *    counted as new revenue, and sales revenue stays distinct from cash collected.
 *  - No percentages, trends or comparisons are derived here — incomplete history
 *    makes such figures misleading.
 *
 * Timezone:
 *  Date boundaries are expressed with the caller's UTC offset so "today" refers
 *  to the device's local calendar day, not UTC. The caller supplies ISO timestamps
 *  with an explicit offset (e.g. "2024-01-15T00:00:00+03:00"); expenses are scoped
 *  by their expense_date (YYYY-MM-DD) in the same local day.
 */
import { supabase } from '../../lib/supabase'
import type { Expense } from '../expenses/types'
import type { Product, SaleWithItems } from '../retail/types'

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
  /** (grossProfit − totalExpenses) when COGS is known, else revenue − expenses. Always set. */
  netProfit: number
  /**
   * F4 — Inventory Cost Value.
   * Σ stock_quantity × cost_price for products with stock_quantity > 0 AND
   * cost_price IS NOT NULL.
   * null = no products have a cost_price set (cost data entirely absent).
   * null for service-based businesses (no physical inventory).
   * costValueIncomplete = true when at least one stocked product has no cost_price.
   */
  inventoryCostValue: number | null
  /** true when stocked products exist but at least one has no cost_price. */
  inventoryCostIncomplete: boolean
  /**
   * F4 — Inventory Retail Value.
   * Σ stock_quantity × selling_price for products with stock_quantity > 0.
   * null for service-based businesses.
   */
  inventoryRetailValue: number | null
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

  const [salesRes, expensesRes, productsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('sold_at', range.fromTs)
      .lte('sold_at', range.toTs)
      .neq('payment_status', 'cancelled')
      .order('sold_at', { ascending: false })
      .limit(10000),
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', range.fromDate)
      .lte('expense_date', range.toDate)
      .order('expense_date', { ascending: false })
      .limit(10000),
    // F4: fetch only stocked products for inventory valuation.
    // stock_quantity > 0 excludes sold-out and zero-qty products.
    // We only need four fields; no need to pull all columns.
    supabase
      .from('products')
      .select('id, stock_quantity, cost_price, selling_price')
      .gte('stock_quantity', 1)
      .limit(10000),
  ])

  if (salesRes.error)    return { data: null, error: { message: salesRes.error.message } }
  if (expensesRes.error) return { data: null, error: { message: expensesRes.error.message } }
  // productsRes error is non-fatal — inventory values become null

  const allSales    = (salesRes.data   as SaleWithItems[]) ?? []
  const allExpenses = (expensesRes.data as Expense[])      ?? []

  const paidSales    = allSales.filter(s => s.payment_status === 'paid')
  const pendingSales = allSales.filter(s => s.payment_status === 'pending' || s.payment_status === 'partial')

  const paidRevenue    = paidSales.reduce((acc, s) => acc + s.total, 0)
  // Pending revenue = outstanding balances across unpaid + partially paid sales.
  // Use (total - amount_paid) for partial sales; fall back to total for pre-F3 rows.
  const pendingRevenue = pendingSales.reduce((acc, s) => {
    const outstanding = s.total - (s.amount_paid ?? 0)
    return acc + outstanding
  }, 0)
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
  // Net profit subtracts the cost of goods when cost data is known, so the
  // headline "what I actually made" is honest for product businesses. When no
  // cost data exists (service businesses, or products without cost prices),
  // it falls back to revenue − expenses so a meaningful figure still shows.
  const netProfit   = (grossProfit !== null ? grossProfit : paidRevenue) - totalExpenses

  // F4 — Inventory valuation (last-purchase-cost method, same as receive_purchase() sets cost_price).
  // Only for product businesses; service businesses have no physical stock to value.
  // A product with stock_quantity > 0 but cost_price IS NULL contributes to retail
  // value but not to cost value — that gap is flagged by inventoryCostIncomplete.
  let inventoryCostValue: number | null = null
  let inventoryRetailValue: number | null = null
  let inventoryCostIncomplete = false

  if (!productsRes.error && productsRes.data && productsRes.data.length > 0) {
    const stockedProducts = productsRes.data as Pick<Product, 'id' | 'stock_quantity' | 'cost_price' | 'selling_price'>[]
    let costSum  = 0
    let retailSum = 0
    let hasAnyCostPrice = false

    for (const p of stockedProducts) {
      // Retail value: always accumulate (selling_price is always set)
      retailSum += p.stock_quantity * p.selling_price

      if (p.cost_price !== null && p.cost_price !== undefined) {
        costSum += p.stock_quantity * p.cost_price
        hasAnyCostPrice = true
      } else {
        // At least one stocked product has no cost — flag as incomplete
        inventoryCostIncomplete = true
      }
    }

    inventoryRetailValue = retailSum
    // Cost value is null when no product has a cost price at all (never invent costs).
    // When some but not all have cost prices, we return the partial sum and flag it.
    inventoryCostValue = hasAnyCostPrice ? costSum : null
  }

  return {
    data: {
      paidRevenue,
      pendingRevenue,
      cogs,
      grossProfit,
      cogsIncomplete: missingCost,
      totalExpenses,
      netProfit,
      inventoryCostValue,
      inventoryCostIncomplete,
      inventoryRetailValue,
      sales:    paidSales,
      expenses: allExpenses,
    },
    error: null,
  }
}
