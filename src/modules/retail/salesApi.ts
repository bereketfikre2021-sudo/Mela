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
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
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
