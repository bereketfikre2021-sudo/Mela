/**
 * Sales data access — Phase 2.3.
 *
 * Checkout always goes through the complete_sale() Postgres RPC so stock
 * deduction and sale creation are atomic and server-validated.
 * Direct inserts into sales/sale_items are intentionally not exposed here.
 */
import { supabase } from '../../lib/supabase'
import type { CheckoutPayload, SaleWithItems } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/**
 * Atomic checkout via the complete_sale() RPC.
 * Returns { sale_id, total } on success.
 */
export async function completeSale(
  payload: CheckoutPayload
): Result<{ sale_id: string; total: number; payment_status: string; already_exists: boolean }> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.rpc('complete_sale', {
    p_owner_id:        payload.owner_id,
    p_sale_number:     payload.sale_number,
    p_payment_method:  payload.payment_method,
    p_idempotency_key: payload.idempotency_key,
    p_items:           payload.items,
    p_customer_name:   payload.customer_name ?? null,
    p_customer_id:     payload.customer_id ?? null,
    p_notes:           payload.notes ?? null,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as { sale_id: string; total: number; payment_status: string; already_exists: boolean }, error: null }
}

/**
 * Fetch sales history for the owner, newest first.
 * Defaults to 500 rows (the sales history page). Use higher limits for
 * analytical queries — see getFinancialSummary and getReportData.
 */
export async function getSales(
  limit = 500,
  offset = 0
): Result<SaleWithItems[]> {
  if (!supabase) return noClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('owner_id', user.id)
    .order('sold_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as SaleWithItems[]) ?? [], error: null }
}

/**
 * Fetch a single sale with its items.
 */
export async function getSale(id: string): Result<SaleWithItems> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('id', id)
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as SaleWithItems, error: null }
}

/**
 * Mark a pending sale as paid.
 * Only updates sales that belong to the owner (RLS enforced).
 */
export async function markSaleAsPaid(
  saleId: string
): Result<{ id: string; payment_status: string }> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('sales')
    .update({ payment_status: 'paid' })
    .eq('id', saleId)
    .eq('payment_status', 'pending')   // safety: only pending → paid
    .select('id, payment_status')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as { id: string; payment_status: string }, error: null }
}

/**
 * Fetch all sales for a given customer_id, newest first.
 */
export async function getSalesByCustomer(
  customerId: string,
  limit = 50
): Result<SaleWithItems[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('customer_id', customerId)
    .order('sold_at', { ascending: false })
    .limit(limit)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as SaleWithItems[]) ?? [], error: null }
}

export interface CustomerOutstanding {
  customerId: string
  amount: number
}

/**
 * Fetch the outstanding (pending) balance for every customer linked to at
 * least one pending sale — one row per customer with their total pending
 * amount. Powers "who owes me money?" on the Customers page without
 * per-customer queries. RLS restricts to the owner's sales.
 *
 * F3: now also counts 'partial' status rows using amount_paid.
 */
export async function getOutstandingBalances(): Result<CustomerOutstanding[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('sales')
    .select('customer_id, total, amount_paid')
    .in('payment_status', ['pending', 'partial'])
    .not('customer_id', 'is', null)
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  const rows = (data as { customer_id: string; total: number; amount_paid: number }[]) ?? []
  const map = new Map<string, number>()
  for (const row of rows) {
    const balance = (row.total ?? 0) - (row.amount_paid ?? 0)
    if (balance > 0) {
      map.set(row.customer_id, (map.get(row.customer_id) ?? 0) + balance)
    }
  }
  return { data: [...map.entries()].map(([customerId, amount]) => ({ customerId, amount })), error: null }
}

// ── Sale payments (F3) ────────────────────────────────────────────────────────

import type { RecordSalePaymentPayload, RecordSalePaymentResult, SalePayment } from './types'

/**
 * Atomically record a full or partial payment against a sale.
 * The server derives the new payment_status — the frontend never controls it.
 */
export async function recordSalePayment(
  payload: RecordSalePaymentPayload
): Result<RecordSalePaymentResult> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.rpc('record_sale_payment', {
    p_owner_id:        payload.owner_id,
    p_sale_id:         payload.sale_id,
    p_amount:          payload.amount,
    p_payment_method:  payload.payment_method,
    p_payment_date:    payload.payment_date,
    p_note:            payload.note,
    p_idempotency_key: payload.idempotency_key,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as RecordSalePaymentResult, error: null }
}

/** Fetch the full payment history for a single sale, newest first. */
export async function getSalePayments(saleId: string): Result<SalePayment[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('sale_payments')
    .select('*')
    .eq('sale_id', saleId)
    .order('payment_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(500)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as SalePayment[]) ?? [], error: null }
}
