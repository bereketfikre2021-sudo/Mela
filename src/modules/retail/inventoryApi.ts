/**
 * Inventory movement data access — Phase 6.2.
 * Stock adjustments go through adjust_stock() RPC (atomic, server-validated).
 * Direct writes to products.stock_quantity are not exposed here.
 */
import { supabase } from '../../lib/supabase'
import type { AdjustStockPayload, InventoryMovement } from './inventoryTypes'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/**
 * Fetch inventory movements for the owner, newest first.
 * Optional filters: product_id, movement_type, date range (ISO strings).
 */
export async function getMovements(filters?: {
  productId?: string
  movementType?: string
  fromTs?: string
  toTs?: string
}): Result<InventoryMovement[]> {
  if (!supabase) return noClient()

  let q = supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (filters?.productId)    q = q.eq('product_id', filters.productId)
  if (filters?.movementType) q = q.eq('movement_type', filters.movementType)
  if (filters?.fromTs)       q = q.gte('created_at', filters.fromTs)
  if (filters?.toTs)         q = q.lte('created_at', filters.toTs)

  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as InventoryMovement[]) ?? [], error: null }
}

/**
 * Atomically adjust stock via the adjust_stock() RPC.
 * Returns stock_before and stock_after on success.
 */
export async function adjustStock(
  payload: AdjustStockPayload
): Result<{ product_id: string; stock_before: number; stock_after: number }> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.rpc('adjust_stock', {
    p_owner_id:        payload.owner_id,
    p_product_id:      payload.product_id,
    p_movement_type:   payload.movement_type,
    p_quantity_change: payload.quantity_change,
    p_reason:          payload.reason,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as { product_id: string; stock_before: number; stock_after: number }, error: null }
}
