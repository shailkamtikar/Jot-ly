import type { AudioRecord, Page } from '../lib/types'

export interface Store {
  /** `indexeddb` is durable; `memory` is a fallback that is lost when the tab closes. */
  readonly mode: 'indexeddb' | 'memory'
  listPages(): Promise<{ pages: Page[]; skipped: number }>
  savePage(page: Page): Promise<void>
  /** Deletes the page and every audio record that belongs to it, atomically. */
  deletePage(id: string): Promise<void>
  /** Writes audio and page together; if either fails neither is stored. */
  savePageWithAudio(page: Page, audio: AudioRecord): Promise<void>
  saveAudio(audio: AudioRecord): Promise<void>
  getAudio(id: string): Promise<AudioRecord | undefined>
  deleteAudio(id: string): Promise<void>
  /** Removes audio rows not in `referenced`. Returns how many were removed. */
  cleanupOrphans(referenced: Set<string>): Promise<number>
}
