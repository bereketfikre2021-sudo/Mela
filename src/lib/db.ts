/**
 * Minimal IndexedDB wrapper — no dependencies.
 *
 * Stores:
 *  - "cache"  : keyed read-cache (products, profile, recent sales/expenses)
 *  - "queue"  : offline write queue (pending transactions)
 */

const DB_NAME    = 'mela_offline'
const DB_VERSION = 1

export type QueueStatus = 'pending' | 'syncing' | 'done' | 'failed'

export interface QueueItem {
  id: string            // client-generated UUID — also used as idempotency key
  type: 'sale' | 'expense' | 'stock_adjust' | 'purchase'
  payload: unknown      // the full payload sent to the RPC/API
  status: QueueStatus
  error: string | null
  created_at: number    // Date.now()
  attempted_at: number | null
}

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache')                         // key-value
      }
      if (!db.objectStoreNames.contains('queue')) {
        const qs = db.createObjectStore('queue', { keyPath: 'id' })
        qs.createIndex('by_status', 'status', { unique: false })
      }
    }
    req.onsuccess = e => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('cache', 'readonly')
    const req = tx.objectStore('cache').get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror   = () => reject(req.error)
  })
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

export async function queueAdd(item: QueueItem): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').add(item)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function queueGetAll(): Promise<QueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('queue', 'readonly')
    const req = tx.objectStore('queue').getAll()
    req.onsuccess = () => resolve((req.result as QueueItem[]) ?? [])
    req.onerror   = () => reject(req.error)
  })
}

export async function queueUpdate(item: QueueItem): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').put(item)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function queueDelete(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function queueCountPending(): Promise<number> {
  const items = await queueGetAll()
  return items.filter(i => i.status === 'pending' || i.status === 'failed').length
}
