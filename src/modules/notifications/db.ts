/**
 * Notification storage — IndexedDB via the existing mela_offline DB.
 * Notifications are stored locally, never sent to Supabase.
 */
import type { AppNotification } from './types'

const DB_NAME    = 'mela_offline'
const DB_VERSION = 2   // bump from v1 to add 'notifications' store
const STORE      = 'notifications'

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      // Preserve existing stores
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache')
      }
      if (!db.objectStoreNames.contains('queue')) {
        const qs = db.createObjectStore('queue', { keyPath: 'id' })
        qs.createIndex('by_status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const ns = db.createObjectStore(STORE, { keyPath: 'id' })
        ns.createIndex('by_created', 'created_at', { unique: false })
        ns.createIndex('by_read', 'read', { unique: false })
      }
    }
    req.onsuccess = e => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function notifAdd(n: AppNotification): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(n)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function notifGetAll(): Promise<AppNotification[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const all = (req.result as AppNotification[]) ?? []
      // Sort newest first
      resolve(all.sort((a, b) => b.created_at - a.created_at))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function notifMarkRead(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get   = store.get(id)
    get.onsuccess = () => {
      const item = get.result as AppNotification | undefined
      if (item) { item.read = true; store.put(item) }
      tx.oncomplete = () => resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function notifMarkAllRead(): Promise<void> {
  const db   = await openDB()
  const all  = await notifGetAll()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    all.forEach(n => { n.read = true; store.put(n) })
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function notifDelete(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function notifCountUnread(): Promise<number> {
  const all = await notifGetAll()
  return all.filter(n => !n.read).length
}
