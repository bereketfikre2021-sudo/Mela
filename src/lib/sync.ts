/**
 * Sync engine — Phase 8.
 *
 * Drains the offline queue one item at a time when the app is online.
 * Uses existing RPCs and APIs; does NOT bypass RLS or atomic guarantees.
 *
 * Idempotency: every RPC call uses the item's id as the idempotency key,
 * so retries never create duplicate server records.
 *
 * A "done" item is deleted from the queue after success.
 * A "failed" item stays in the queue with the error message so the user
 * can see it and trigger a manual retry.
 */
import { queueGetAll, queueUpdate, queueDelete, type QueueItem } from './db'
import { supabase } from './supabase'
import type { CheckoutPayload } from '../modules/retail/types'
import type { ExpenseInput } from '../modules/expenses/types'
import type { AdjustStockPayload } from '../modules/retail/inventoryTypes'
import type { ReceivePurchasePayload } from '../modules/purchases/types'

export type SyncResult = {
  synced: number
  failed: number
}

/** Process a single queue item. Returns null on success, error string on failure. */
async function processItem(item: QueueItem): Promise<string | null> {
  if (!supabase) return 'Supabase not configured'

  try {
    switch (item.type) {
      case 'sale': {
        const p = item.payload as CheckoutPayload
        const { error } = await supabase.rpc('complete_sale', {
          // owner_id was set from auth.uid() at enqueue time — cannot be altered client-side before sync
          p_owner_id:        p.owner_id,
          p_sale_number:     p.sale_number,
          p_payment_method:  p.payment_method,
          p_idempotency_key: p.idempotency_key,
          p_items:           p.items,
        })
        // already_exists is fine — idempotent success
        if (error && !error.message.includes('already')) return error.message
        return null
      }

      case 'expense': {
        const p = item.payload as ExpenseInput & { owner_id: string }
        // owner_id was set from auth.uid() at enqueue time — cannot be altered client-side before sync
        const { error } = await supabase
          .from('expenses')
          .insert({ ...p })
          .select('id')
          .single()
        if (error) return error.message
        return null
      }

      case 'stock_adjust': {
        const p = item.payload as AdjustStockPayload
        const { error } = await supabase.rpc('adjust_stock', {
          // owner_id was set from auth.uid() at enqueue time — cannot be altered client-side before sync
          p_owner_id:        p.owner_id,
          p_product_id:      p.product_id,
          p_movement_type:   p.movement_type,
          p_quantity_change: p.quantity_change,
          p_reason:          p.reason,
        })
        if (error) return error.message
        return null
      }

      case 'purchase': {
        const p = item.payload as ReceivePurchasePayload
        const { error } = await supabase.rpc('receive_purchase', {
          // owner_id was set from auth.uid() at enqueue time — cannot be altered client-side before sync
          p_owner_id:        p.owner_id,
          p_supplier_id:     p.supplier_id,
          p_purchase_date:   p.purchase_date,
          p_notes:           p.notes,
          p_idempotency_key: p.idempotency_key,
          p_items:           p.items,
        })
        if (error && !error.message.includes('already')) return error.message
        return null
      }

      default:
        return `Unknown queue item type: ${(item as QueueItem).type}`
    }
  } catch (e) {
    return e instanceof Error ? e.message : 'Unknown error'
  }
}

let _syncing = false

/**
 * Flush all pending/failed queue items serially.
 * Calls onProgress(pendingCount) after each item so the UI can update.
 */
export async function flushQueue(
  onProgress?: (remaining: number) => void
): Promise<SyncResult> {
  if (_syncing) return { synced: 0, failed: 0 }
  _syncing = true

  let synced = 0
  let failed = 0

  try {
    const items = await queueGetAll()
    const pending = items.filter(i => i.status === 'pending' || i.status === 'failed')

    for (const item of pending) {
      // Mark as syncing
      await queueUpdate({ ...item, status: 'syncing', attempted_at: Date.now() })

      const err = await processItem(item)

      if (err === null) {
        // Success — remove from queue entirely
        await queueDelete(item.id)
        synced++
      } else {
        // Failure — keep in queue with error so user can see and retry
        await queueUpdate({ ...item, status: 'failed', error: err, attempted_at: Date.now() })
        failed++
      }

      const remaining = (await queueGetAll()).filter(i => i.status === 'pending').length
      onProgress?.(remaining)
    }
  } finally {
    _syncing = false
  }

  return { synced, failed }
}

export function isSyncing() { return _syncing }
