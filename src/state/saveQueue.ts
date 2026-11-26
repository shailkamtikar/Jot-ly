import type { Page } from '../lib/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error'

export interface SaveQueueOptions {
  save: (page: Page) => Promise<void>
  onStatus: (status: SaveStatus, error?: unknown) => void
  /** Delay before a text edit is written. Structural changes use `schedule(page, true)`. */
  debounceMs?: number
  /** Wait before each retry after a failed write. */
  retryDelaysMs?: number[]
}

export interface SaveQueue {
  /** Queue the latest state of a page. `immediate` skips the debounce. */
  schedule(page: Page, immediate?: boolean): void
  /** Write everything pending right now and resolve when the disk write is done. */
  flush(): Promise<void>
  dispose(): void
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Serial, latest-wins save queue.
 * - Only one write is in flight at a time, so an older write can never land after a newer one.
 * - "saved" is only reported once every pending page has actually been written.
 */
export function createSaveQueue(opts: SaveQueueOptions): SaveQueue {
  const { save, onStatus, debounceMs = 500, retryDelaysMs = [1000, 2000, 5000] } = opts
  const pending = new Map<string, Page>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let draining: Promise<void> | null = null
  let disposed = false

  async function writeWithRetry(page: Page): Promise<boolean> {
    for (let attempt = 0; ; attempt++) {
      try {
        await save(page)
        return true
      } catch (e) {
        if (attempt >= retryDelaysMs.length) {
          onStatus('error', e)
          return false
        }
        onStatus('retrying', e)
        await sleep(retryDelaysMs[attempt])
        // A newer edit supersedes the one we were retrying.
        const newer = pending.get(page.id)
        if (newer) {
          pending.delete(page.id)
          page = newer
        }
      }
    }
  }

  function drain(): Promise<void> {
    if (draining) return draining
    draining = (async () => {
      let ok = true
      while (pending.size > 0 && !disposed) {
        const [id, page] = pending.entries().next().value as [string, Page]
        pending.delete(id)
        onStatus('saving')
        if (!(await writeWithRetry(page))) ok = false
      }
      if (ok && !disposed) onStatus('saved')
    })().finally(() => {
      draining = null
      // Something may have been scheduled while the last write was finishing.
      if (pending.size > 0 && !disposed) void drain()
    })
    return draining
  }

  function clearTimer() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return {
    schedule(page, immediate = false) {
      if (disposed) return
      pending.set(page.id, page)
      onStatus('saving')
      clearTimer()
      if (immediate) void drain()
      else timer = setTimeout(() => void drain(), debounceMs)
    },
    async flush() {
      clearTimer()
      while (pending.size > 0 || draining) {
        await drain()
      }
    },
    dispose() {
      disposed = true
      clearTimer()
    },
  }
}
