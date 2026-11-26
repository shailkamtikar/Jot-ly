import { IDBFactory } from 'fake-indexeddb'
import { createPage } from '../lib/blocks'
import type { AudioRecord } from '../lib/types'
import { createIdbStore, openJotlyDB } from './idbStore'
import { createMemoryStore } from './memoryStore'
import type { Store } from './store'

const rec = (id: string, pageId: string, size = 1024): AudioRecord => ({
  id,
  pageId,
  blob: new Blob([new Uint8Array(size)], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  byteSize: size,
  durationMs: 1000,
})

async function fresh(): Promise<Store> {
  globalThis.indexedDB = new IDBFactory()
  return createIdbStore(await openJotlyDB(`t-${Math.random()}`))
}

describe.each([
  ['indexeddb', fresh],
  ['memory', async () => createMemoryStore()],
])('%s store', (_name, make) => {
  it('round-trips a page', async () => {
    const s = await make()
    const p = createPage('Hello')
    await s.savePage(p)
    const { pages } = await s.listPages()
    expect(pages).toEqual([p])
  })

  it('round-trips an audio record', async () => {
    const s = await make()
    await s.saveAudio(rec('a', 'p', 2048))
    const got = await s.getAudio('a')
    expect(got?.byteSize).toBe(2048)
    expect(got?.mimeType).toBe('audio/webm')
  })

  it('deleting a page cascades to its audio only', async () => {
    const s = await make()
    const p = createPage()
    const other = createPage()
    await s.savePageWithAudio(p, rec('a1', p.id))
    await s.savePageWithAudio(p, rec('a2', p.id))
    await s.savePageWithAudio(other, rec('b1', other.id))
    await s.deletePage(p.id)
    expect(await s.getAudio('a1')).toBeUndefined()
    expect(await s.getAudio('a2')).toBeUndefined()
    expect(await s.getAudio('b1')).toBeDefined()
    expect((await s.listPages()).pages.map((x) => x.id)).toEqual([other.id])
  })

  it('removes orphaned audio', async () => {
    const s = await make()
    await s.saveAudio(rec('keep', 'p'))
    await s.saveAudio(rec('drop', 'p'))
    expect(await s.cleanupOrphans(new Set(['keep']))).toBe(1)
    expect(await s.getAudio('drop')).toBeUndefined()
    expect(await s.getAudio('keep')).toBeDefined()
  })
})

describe('indexeddb specifics', () => {
  it('skips corrupt records and reports them', async () => {
    globalThis.indexedDB = new IDBFactory()
    const db = await openJotlyDB(`c-${Math.random()}`)
    const s = createIdbStore(db)
    const good = createPage('ok')
    await s.savePage(good)
    await db.put('pages', { id: 'bad' } as never)
    const { pages, skipped } = await s.listPages()
    expect(pages.map((p) => p.id)).toEqual([good.id])
    expect(skipped).toBe(1)
  })

  it('is atomic: a failed audio write does not save the page', async () => {
    globalThis.indexedDB = new IDBFactory()
    const db = await openJotlyDB(`x-${Math.random()}`)
    const s = createIdbStore(db)
    const p = createPage('should not persist')
    // a function is not structured-cloneable, so the audio put throws inside the transaction
    const bad = { ...rec('bad', p.id), blob: (() => 1) as unknown as Blob }
    await expect(s.savePageWithAudio(p, bad)).rejects.toBeTruthy()
    expect((await s.listPages()).pages).toHaveLength(0)
  })
})
