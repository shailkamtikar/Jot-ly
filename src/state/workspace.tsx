import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createBlock, createPage, insertAfter, removeBlock, uid } from '../lib/blocks'
import { hashForPage, pageIdFromHash } from '../lib/hash'
import type { AudioBlock, AudioRecord, Block, Page } from '../lib/types'
import { initStorage, requestPersistence, toStorageError, type Store } from '../storage'
import { createSaveQueue, type SaveQueue, type SaveStatus } from './saveQueue'

export interface Toast {
  id: string
  message: string
  tone?: 'info' | 'error'
  undo?: () => void
}

export interface Workspace {
  ready: boolean
  storageMode: 'indexeddb' | 'memory'
  persisted: boolean | null
  skippedPages: number
  pages: Page[]
  activeId: string | null
  activePage: Page | null
  saveStatus: SaveStatus
  toast: Toast | null
  dismissToast: () => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  createPage: () => string
  selectPage: (id: string) => void
  deletePage: (id: string) => Promise<void>
  updatePage: (id: string, fn: (p: Page) => Page, opts?: { immediate?: boolean }) => void
  /** Persist the audio and its block together, then show it. Throws a StorageError on failure. */
  addSticker: (pageId: string, afterBlockId: string | null, record: AudioRecord, block: AudioBlock) => Promise<void>
  removeSticker: (pageId: string, blockId: string) => void
  getAudio: (id: string) => Promise<AudioRecord | undefined>
  importPages: (pages: Page[]) => void
  store: Store | null
  flush: () => Promise<void>
  /** Last text/audio block the user touched on the active page, used for insertion. */
  focusedBlockId: string | null
  setFocusedBlockId: (id: string | null) => void
}

const Ctx = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return v
}

const SEED_KEY = 'jotly-seeded'

function welcomePage(): Page {
  const p = createPage('Welcome to Jotly')
  p.blocks = [
    createBlock('paragraph', 'Jotly is a calm place for notes — with a twist: you can say things, not just write them.'),
    createBlock('heading', 'Try an audio sticker'),
    createBlock('bullet', 'Click the + below, choose Audio, and record a short voice note.'),
    createBlock('bullet', 'The sticker lands right here between your blocks. Play it, rename it, drag it anywhere.'),
    createBlock('heading', 'Good to know'),
    createBlock('bullet', 'Everything is saved automatically, on this device only. Use Backup in the sidebar to keep a copy.'),
    createBlock('bullet', 'Press Ctrl/⌘ K to search, and Alt + ↑ / ↓ to move a block.'),
    createBlock('paragraph', ''),
  ]
  return p
}

export function WorkspaceProvider({ children, storeFactory = initStorage }: { children: ReactNode; storeFactory?: () => Promise<Store> }) {
  const [ready, setReady] = useState(false)
  const [pages, setPagesState] = useState<Page[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [toast, setToast] = useState<Toast | null>(null)
  const [storageMode, setStorageMode] = useState<'indexeddb' | 'memory'>('indexeddb')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [skippedPages, setSkipped] = useState(0)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)

  const pagesRef = useRef<Page[]>([])
  const storeRef = useRef<Store | null>(null)
  const queueRef = useRef<SaveQueue | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setPages = useCallback((next: Page[]) => {
    pagesRef.current = next
    setPagesState(next)
  }, [])

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ ...t, id: uid() })
    toastTimer.current = setTimeout(() => setToast(null), t.undo ? 5000 : 6000)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  // ---- boot ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const store = await storeFactory()
      if (cancelled) return
      storeRef.current = store
      setStorageMode(store.mode)
      queueRef.current = createSaveQueue({
        save: (p) => store.savePage(p),
        onStatus: (s, err) => {
          setSaveStatus(s)
          if (s === 'error') {
            const e = toStorageError(err)
            pushToast({ message: e.message, tone: 'error' })
          }
        },
      })

      let list: Page[] = []
      try {
        const res = await store.listPages()
        list = res.pages
        setSkipped(res.skipped)
      } catch {
        /* start empty; the banner explains storage trouble */
      }

      let seeded = false
      try {
        seeded = localStorage.getItem(SEED_KEY) === '1'
      } catch {
        /* ignore */
      }
      if (list.length === 0 && !seeded) {
        const p = welcomePage()
        list = [p]
        try {
          await store.savePage(p)
          localStorage.setItem(SEED_KEY, '1')
        } catch {
          /* ignore */
        }
      }

      // Remove audio left behind by interrupted deletes.
      const referenced = new Set<string>()
      for (const p of list) for (const b of p.blocks) if (b.type === 'audio') referenced.add(b.audioId)
      store.cleanupOrphans(referenced).catch(() => {})

      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setPages(list)
      const fromHash = pageIdFromHash(location.hash)
      setActiveId(list.find((p) => p.id === fromHash)?.id ?? list[0]?.id ?? null)
      setReady(true)
      if (store.mode === 'indexeddb') requestPersistence().then((v) => !cancelled && setPersisted(v))
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- routing ----
  useEffect(() => {
    const onHash = () => {
      const id = pageIdFromHash(location.hash)
      if (id && pagesRef.current.some((p) => p.id === id)) setActiveId(id)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (activeId && pageIdFromHash(location.hash) !== activeId) history.replaceState(null, '', hashForPage(activeId))
  }, [activeId])

  // ---- flush when the tab is hidden or closing ----
  useEffect(() => {
    const flush = () => void queueRef.current?.flush()
    const onVis = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  const updatePage = useCallback<Workspace['updatePage']>(
    (id, fn, opts) => {
      const cur = pagesRef.current.find((p) => p.id === id)
      if (!cur) return
      const next = { ...fn(cur), updatedAt: new Date().toISOString() }
      setPages(pagesRef.current.map((p) => (p.id === id ? next : p)))
      queueRef.current?.schedule(next, opts?.immediate)
    },
    [setPages],
  )

  const selectPage = useCallback(
    (id: string) => {
      // Write pending edits of the page we are leaving before switching.
      void queueRef.current?.flush()
      setActiveId(id)
      setFocusedBlockId(null)
      history.replaceState(null, '', hashForPage(id))
    },
    [],
  )

  const createNewPage = useCallback(() => {
    const p = createPage()
    setPages([p, ...pagesRef.current])
    queueRef.current?.schedule(p, true)
    selectPage(p.id)
    return p.id
  }, [selectPage, setPages])

  const deletePage = useCallback<Workspace['deletePage']>(
    async (id) => {
      const store = storeRef.current
      if (!store) return
      try {
        await queueRef.current?.flush()
        await store.deletePage(id)
      } catch (e) {
        pushToast({ message: toStorageError(e).message, tone: 'error' })
        return
      }
      const next = pagesRef.current.filter((p) => p.id !== id)
      setPages(next)
      setActiveId((cur) => (cur === id ? (next[0]?.id ?? null) : cur))
    },
    [pushToast, setPages],
  )

  const addSticker = useCallback<Workspace['addSticker']>(
    async (pageId, afterBlockId, record, block) => {
      const store = storeRef.current
      const cur = pagesRef.current.find((p) => p.id === pageId)
      if (!store || !cur) throw new Error('Page not found')
      const next: Page = {
        ...cur,
        blocks: insertAfter(cur.blocks, afterBlockId, block),
        updatedAt: new Date().toISOString(),
      }
      // Audio and page are written in one transaction; the block only appears once that has committed.
      await store.savePageWithAudio(next, record)
      setPages(pagesRef.current.map((p) => (p.id === pageId ? next : p)))
      setSaveStatus('saved')
    },
    [setPages],
  )

  const removeSticker = useCallback<Workspace['removeSticker']>(
    (pageId, blockId) => {
      const page = pagesRef.current.find((p) => p.id === pageId)
      const idx = page?.blocks.findIndex((b) => b.id === blockId) ?? -1
      const block = page?.blocks[idx]
      if (!page || !block || block.type !== 'audio') return
      updatePage(pageId, (p) => ({ ...p, blocks: removeBlock(p.blocks, blockId) }), { immediate: true })
      // Keep the recording for a few seconds so Undo is lossless.
      const timer = setTimeout(() => {
        storeRef.current?.deleteAudio(block.audioId).catch(() => {})
      }, 5000)
      pushToast({
        message: 'Sticker deleted',
        undo: () => {
          clearTimeout(timer)
          updatePage(
            pageId,
            (p) => {
              const copy: Block[] = [...p.blocks]
              copy.splice(Math.min(idx, copy.length), 0, block)
              return { ...p, blocks: copy }
            },
            { immediate: true },
          )
          dismissToast()
        },
      })
    },
    [dismissToast, pushToast, updatePage],
  )

  const getAudio = useCallback<Workspace['getAudio']>((id) => storeRef.current?.getAudio(id) ?? Promise.resolve(undefined), [])

  const importPages = useCallback(
    (imported: Page[]) => {
      const map = new Map(pagesRef.current.map((p) => [p.id, p]))
      for (const p of imported) map.set(p.id, p)
      const list = [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setPages(list)
    },
    [setPages],
  )

  const flush = useCallback(() => queueRef.current?.flush() ?? Promise.resolve(), [])

  const value = useMemo<Workspace>(
    () => ({
      ready,
      storageMode,
      persisted,
      skippedPages,
      pages,
      activeId,
      activePage: pages.find((p) => p.id === activeId) ?? null,
      saveStatus,
      toast,
      dismissToast,
      pushToast,
      createPage: createNewPage,
      selectPage,
      deletePage,
      updatePage,
      addSticker,
      removeSticker,
      getAudio,
      importPages,
      store: storeRef.current,
      flush,
      focusedBlockId,
      setFocusedBlockId,
    }),
    [ready, storageMode, persisted, skippedPages, pages, activeId, saveStatus, toast, dismissToast, pushToast, createNewPage, selectPage, deletePage, updatePage, addSticker, removeSticker, getAudio, importPages, flush, focusedBlockId],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
