import type { AudioRecord, Page } from '../lib/types'
import type { Store } from './store'

/** Fallback used when IndexedDB is unavailable. Nothing survives a reload. */
export function createMemoryStore(): Store {
  const pages = new Map<string, Page>()
  const audio = new Map<string, AudioRecord>()
  return {
    mode: 'memory',
    async listPages() {
      return { pages: [...pages.values()], skipped: 0 }
    },
    async savePage(p) {
      pages.set(p.id, p)
    },
    async deletePage(id) {
      pages.delete(id)
      for (const [k, v] of audio) if (v.pageId === id) audio.delete(k)
    },
    async savePageWithAudio(p, a) {
      audio.set(a.id, a)
      pages.set(p.id, p)
    },
    async saveAudio(a) {
      audio.set(a.id, a)
    },
    async getAudio(id) {
      return audio.get(id)
    },
    async deleteAudio(id) {
      audio.delete(id)
    },
    async cleanupOrphans(ref) {
      let n = 0
      for (const k of [...audio.keys()]) {
        if (!ref.has(k)) {
          audio.delete(k)
          n++
        }
      }
      return n
    },
  }
}
