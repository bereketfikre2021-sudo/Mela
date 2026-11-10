/**
 * Offline write queue helpers.
 *
 * When the app is offline (or Supabase is unavailable), write operations
 * are stored here instead of sent directly to the server. The sync engine
 * drains this queue when connectivity returns.
 *
 * IMPORTANT: queued items are NOT confirmed server transactions.
 * Never show them as confirmed in the UI.
 * Stock is NOT deducted until the queue item syncs successfully.
 */
import { queueAdd, type QueueItem } from './db'
import type { CheckoutPayload } from '../modules/retail/types'
import type { ExpenseInput } from '../modules/expenses/types'
import type { AdjustStockPayload } from '../modules/retail/inventoryTypes'
import type { ReceivePurchasePayload } from '../modules/purchases/types'

function makeItem(
  type: QueueItem['type'],
  payload: unknown
): QueueItem {
  return {
    id:           crypto.randomUUID(),
    type,
    payload,
    status:       'pending',
    error:        null,
    created_at:   Date.now(),
    attempted_at: null,
  }
}

export async function enqueueSale(
  payload: CheckoutPayload
): Promise<string> {
  const item = makeItem('sale', payload)
  // Preserve the caller's idempotency_key so the RPC deduplicates on sync
  ;(item.payload as CheckoutPayload).idempotency_key = payload.idempotency_key
  item.id = payload.idempotency_key  // use idempotency_key as queue item id too
  await queueAdd(item)
  return item.id
}

export async function enqueueExpense(
  payload: ExpenseInput & { owner_id: string }
): Promise<string> {
  const item = makeItem('expense', payload)
  await queueAdd(item)
  return item.id
}

export async function enqueueStockAdjust(
  payload: AdjustStockPayload
): Promise<string> {
  const item = makeItem('stock_adjust', payload)
  await queueAdd(item)
  return item.id
}

export async function enqueuePurchase(
  payload: ReceivePurchasePayload
): Promise<string> {
  const item = makeItem('purchase', payload)
  item.id = payload.idempotency_key
  await queueAdd(item)
  return item.id
}
