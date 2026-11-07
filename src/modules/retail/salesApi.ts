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
): Result<{ sale_id: string; total: number }> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.rpc('complete_sale', {
    p_owner_id:       payload.owner_id,
    p_sale_number:    payload.sale_number,
    p_payment_method: payload.payment_method,
    p_items:          payload.items,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as { sale_id: string; total: number }, error: null }
}

/**
 * Fetch paginated sales for the owner, newest first.
 */
export async function getSales(
  limit = 50,
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
