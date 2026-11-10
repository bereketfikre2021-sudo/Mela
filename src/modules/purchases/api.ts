import { supabase } from '../../lib/supabase'
import type { Purchase, PurchaseWithItems, ReceivePurchasePayload } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getPurchases(): Result<Purchase[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('purchase_date', { ascending: false })
    .order('created_at',    { ascending: false })
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Purchase[]) ?? [], error: null }
}

export async function getPurchase(id: string): Result<PurchaseWithItems> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('*, purchase_items(*)')
    .eq('id', id)
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as PurchaseWithItems, error: null }
}

export async function receivePurchase(
  payload: ReceivePurchasePayload
): Result<{ purchase_id: string; total_cost: number; already_exists: boolean }> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.rpc('receive_purchase', {
    p_owner_id:        payload.owner_id,
    p_supplier_id:     payload.supplier_id,
    p_purchase_date:   payload.purchase_date,
    p_notes:           payload.notes,
    p_idempotency_key: payload.idempotency_key,
    p_items:           payload.items,
  })
  if (error) return { data: null, error: { message: error.message } }
  return {
    data: data as { purchase_id: string; total_cost: number; already_exists: boolean },
    error: null,
  }
}
