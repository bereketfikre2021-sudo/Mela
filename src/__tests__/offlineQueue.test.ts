import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CheckoutPayload } from '../modules/retail/types'
import type { ExpenseInput } from '../modules/expenses/types'
import type { ReceivePurchasePayload } from '../modules/purchases/types'

describe('offlineQueue', () => {
  let enqueueSale:      (p: CheckoutPayload) => Promise<string>
  let enqueuePurchase:  (p: ReceivePurchasePayload) => Promise<string>
  let enqueueExpense:   (p: ExpenseInput & { owner_id: string }) => Promise<string>
  let queueCountPending: () => Promise<number>

  beforeEach(async () => {
    // Give each test a completely fresh IndexedDB instance so data never leaks.
    globalThis.indexedDB = new IDBFactory()

    vi.resetModules()
    const q = await import('../lib/offlineQueue')
    const d = await import('../lib/db')
    enqueueSale       = q.enqueueSale
    enqueuePurchase   = q.enqueuePurchase
    enqueueExpense    = q.enqueueExpense
    queueCountPending = d.queueCountPending
  })

  // ── Fixtures ────────────────────────────────────────────────────────────────

  function makeSalePayload(): CheckoutPayload {
    return {
      owner_id:        crypto.randomUUID(),
      sale_number:     'S-001',
      payment_method:  'cash',
      idempotency_key: crypto.randomUUID(),
      items: [{ product_id: crypto.randomUUID(), quantity: 1 }],
    }
  }

  function makeExpensePayload(): ExpenseInput & { owner_id: string } {
    return {
      owner_id:     crypto.randomUUID(),
      title:        'Office Rent',
      amount:       500,
      category:     'rent',
      description:  null,
      expense_date: '2024-06-15',
    }
  }

  function makePurchasePayload(): ReceivePurchasePayload {
    return {
      owner_id:        crypto.randomUUID(),
      supplier_id:     null,
      purchase_date:   '2024-06-15',
      notes:           null,
      idempotency_key: crypto.randomUUID(),
      items: [{ product_id: crypto.randomUUID(), quantity: 1, unit_cost: 10 }],
    }
  }

  // ── Tests ───────────────────────────────────────────────────────────────────

  it('enqueueSale resolves to salePayload.idempotency_key', async () => {
    const payload = makeSalePayload()
    const id = await enqueueSale(payload)
    expect(id).toBe(payload.idempotency_key)
  })

  it('enqueuePurchase resolves to purchasePayload.idempotency_key', async () => {
    const payload = makePurchasePayload()
    const id = await enqueuePurchase(payload)
    expect(id).toBe(payload.idempotency_key)
  })

  it('enqueueExpense queued item has type===expense and status===pending', async () => {
    const d = await import('../lib/db')
    const payload = makeExpensePayload()
    await enqueueExpense(payload)
    const items = await d.queueGetAll()
    const item = items.find(i => i.type === 'expense')
    expect(item).toBeDefined()
    expect(item!.type).toBe('expense')
    expect(item!.status).toBe('pending')
  })

  it('queueCountPending on fresh DB returns 0', async () => {
    const count = await queueCountPending()
    expect(count).toBe(0)
  })

  it('after all three enqueues, queueCountPending returns 3', async () => {
    await enqueueSale(makeSalePayload())
    await enqueuePurchase(makePurchasePayload())
    await enqueueExpense(makeExpensePayload())
    const count = await queueCountPending()
    expect(count).toBe(3)
  })
})
