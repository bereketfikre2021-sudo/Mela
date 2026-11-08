import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — supabase mock must be declared before imports that use it.
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

describe('sync flushQueue', () => {
  let flushQueue:  (onProgress?: (n: number) => void) => Promise<{ synced: number; failed: number }>
  let queueAdd:    (item: import('../lib/db').QueueItem) => Promise<void>
  let queueGetAll: () => Promise<import('../lib/db').QueueItem[]>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Give each test a completely fresh IndexedDB instance so data never leaks.
    globalThis.indexedDB = new IDBFactory()

    vi.resetModules()

    const syncMod = await import('../lib/sync')
    const dbMod   = await import('../lib/db')

    flushQueue  = syncMod.flushQueue
    queueAdd    = dbMod.queueAdd
    queueGetAll = dbMod.queueGetAll
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  function makeSaleItem(): import('../lib/db').QueueItem {
    return {
      id:   crypto.randomUUID(),
      type: 'sale',
      payload: {
        owner_id:        crypto.randomUUID(),
        sale_number:     'S-001',
        payment_method:  'cash',
        idempotency_key: crypto.randomUUID(),
        items: [{ product_id: crypto.randomUUID(), quantity: 1 }],
      },
      status:       'pending',
      error:        null,
      created_at:   Date.now(),
      attempted_at: null,
    }
  }

  // ── Tests ───────────────────────────────────────────────────────────────────

  it('concurrent guard — second call returns {synced:0, failed:0} while first is in flight', async () => {
    const { supabase: mockSupa } = await import('../lib/supabase')

    await queueAdd(makeSaleItem())

    // First call stalls — rpc never resolves
    ;(mockSupa!.rpc as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}))

    const first = flushQueue()

    // Second call should be rejected immediately due to _syncing guard
    const secondResult = await flushQueue()
    expect(secondResult).toEqual({ synced: 0, failed: 0 })

    // Don't await `first` — it stalls forever; the test ends before it resolves
    void first
  })

  it('success — item is deleted from queue after successful rpc', async () => {
    const { supabase: mockSupa } = await import('../lib/supabase')
    ;(mockSupa!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    await queueAdd(makeSaleItem())
    await flushQueue()

    const remaining = await queueGetAll()
    expect(remaining).toEqual([])
  })

  it('failure — item remains in queue with status===failed and the error message', async () => {
    const { supabase: mockSupa } = await import('../lib/supabase')
    ;(mockSupa!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ error: { message: 'network error' } })

    await queueAdd(makeSaleItem())
    await flushQueue()

    const remaining = await queueGetAll()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('failed')
    expect(remaining[0].error).toBe('network error')
  })

  it('unknown type — item remains with status===failed and error containing "Unknown queue item type"', async () => {
    const unknownItem: import('../lib/db').QueueItem = {
      ...makeSaleItem(),
      type: 'unknown' as unknown as import('../lib/db').QueueItem['type'],
    }
    await queueAdd(unknownItem)
    await flushQueue()

    const remaining = await queueGetAll()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('failed')
    expect(remaining[0].error).toContain('Unknown queue item type')
  })
})
