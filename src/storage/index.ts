import { createIdbStore, openJotlyDB } from './idbStore'
import { createMemoryStore } from './memoryStore'
import type { Store } from './store'

export type { Store }
export { StorageError, toStorageError } from './errors'

/** Opens durable storage, falling back to memory (with a visible warning upstream) if blocked. */
export async function initStorage(): Promise<Store> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable')
    const db = await openJotlyDB()
    return createIdbStore(db)
  } catch {
    return createMemoryStore()
  }
}

/** Asks the browser to keep our data even under storage pressure. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    if (!e || e.usage == null || e.quota == null) return null
    return { usage: e.usage, quota: e.quota }
  } catch {
    return null
  }
}
