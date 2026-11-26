import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { validatePage } from '../lib/schema'
import type { AudioRecord, Page } from '../lib/types'
import { toStorageError } from './errors'
import type { Store } from './store'

interface JotlyDB extends DBSchema {
  pages: { key: string; value: Page; indexes: { updatedAt: string } }
  audio: { key: string; value: AudioRecord; indexes: { pageId: string } }
}

export const DB_NAME = 'jotly'

export async function openJotlyDB(name = DB_NAME): Promise<IDBPDatabase<JotlyDB>> {
  return openDB<JotlyDB>(name, 1, {
    upgrade(db) {
      const pages = db.createObjectStore('pages', { keyPath: 'id' })
      pages.createIndex('updatedAt', 'updatedAt')
      const audio = db.createObjectStore('audio', { keyPath: 'id' })
      audio.createIndex('pageId', 'pageId')
    },
  })
}

export function createIdbStore(db: IDBPDatabase<JotlyDB>): Store {
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (e) {
      throw toStorageError(e)
    }
  }

  return {
    mode: 'indexeddb',

    listPages: () =>
      wrap(async () => {
        const raw = await db.getAll('pages')
        const pages: Page[] = []
        let skipped = 0
        for (const r of raw) {
          try {
            pages.push(validatePage(r))
          } catch {
            skipped++
          }
        }
        return { pages, skipped }
      }),

    savePage: (page) => wrap(async () => void (await db.put('pages', page))),

    deletePage: (id) =>
      wrap(async () => {
        const tx = db.transaction(['pages', 'audio'], 'readwrite')
        const keys = await tx.objectStore('audio').index('pageId').getAllKeys(id)
        await Promise.all([...keys.map((k) => tx.objectStore('audio').delete(k)), tx.objectStore('pages').delete(id), tx.done])
      }),

    savePageWithAudio: (page, audio) =>
      wrap(async () => {
        const tx = db.transaction(['pages', 'audio'], 'readwrite')
        tx.done.catch(() => {}) // aborts are reported through the thrown error below
        try {
          await Promise.all([tx.objectStore('audio').put(audio), tx.objectStore('pages').put(page), tx.done])
        } catch (e) {
          try {
            tx.abort()
          } catch {
            /* transaction already finished */
          }
          throw e
        }
      }),

    saveAudio: (audio) => wrap(async () => void (await db.put('audio', audio))),
    getAudio: (id) => wrap(() => db.get('audio', id)),
    deleteAudio: (id) => wrap(() => db.delete('audio', id)),

    cleanupOrphans: (referenced) =>
      wrap(async () => {
        const keys = await db.getAllKeys('audio')
        const orphans = keys.filter((k) => !referenced.has(k))
        await Promise.all(orphans.map((k) => db.delete('audio', k)))
        return orphans.length
      }),
  }
}
