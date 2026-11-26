import { IDBFactory } from 'fake-indexeddb'
import { zipSync, strToU8 } from 'fflate'
import { createBlock, createPage } from './blocks'
import { applyImport, createBackup, readBackup } from './backup'
import { escapeMd, slugify, toMarkdown } from './export'
import { hashForPage, pageIdFromHash } from './hash'
import { searchPages } from './search'
import { createMemoryStore } from '../storage/memoryStore'
import { createIdbStore, openJotlyDB } from '../storage/idbStore'
import type { AudioRecord, Page, Sticker } from './types'

function pageWithAudio(title = 'Plan'): { page: Page; rec: AudioRecord } {
  const page = createPage(title)
  const rec: AudioRecord = {
    id: 'aud-1',
    pageId: page.id,
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }),
    mimeType: 'audio/webm',
    byteSize: 4,
    durationMs: 65_000,
  }
  const first = createBlock('paragraph', 'Intro text')
  const sticker: Sticker = { id: 'st-1', audioId: rec.id, title: 'Idea', durationMs: 65_000, peaks: [0.5], x: 0.6, anchorId: first.id, dy: 4 }
  page.blocks = [first, createBlock('bullet', 'Do the thing')]
  page.stickers = [sticker]
  return { page, rec }
}

describe('markdown export', () => {
  it('renders a mixed page', () => {
    const { page } = pageWithAudio()
    page.blocks.splice(1, 0, createBlock('heading', 'Follow-up'))
    // the sticker is attached to the first block, so it follows that block's text
    expect(toMarkdown(page)).toBe('# Plan\n\nIntro text\n\n> 🎙 Audio: Idea (1:05)\n\n## Follow-up\n\n- Do the thing\n')
  })
  it('exports an empty page as just a title', () => {
    expect(toMarkdown(createPage('Only'))).toBe('# Only\n')
    expect(toMarkdown(createPage(''))).toBe('# Untitled\n')
  })
  it('escapes markdown-significant characters', () => {
    expect(escapeMd('a * b_c [x]')).toBe('a \\* b\\_c \\[x\\]')
    expect(escapeMd('# not a heading')).toBe('\\# not a heading')
  })
  it('makes safe filenames and keeps unicode', () => {
    expect(slugify('a/b:c*?')).toBe('a-b-c')
    expect(slugify('???')).toBe('untitled')
    expect(slugify('नमस्ते दुनिया')).not.toBe('untitled')
  })
})

describe('search', () => {
  const a = { ...createPage('Meeting notes'), updatedAt: '2025-01-01' }
  a.blocks = [createBlock('paragraph', 'We drink café every day')]
  const b = { ...createPage('Ideas'), updatedAt: '2025-01-02' }
  b.blocks = [createBlock('paragraph', 'Plan the meeting agenda')]
  const pages = [a, b]

  it('ranks title matches above body matches', () => {
    const r = searchPages(pages, 'meeting')
    expect(r.map((x) => x.page.title)).toEqual(['Meeting notes', 'Ideas'])
  })
  it('returns a snippet with a match range', () => {
    const [r] = searchPages(pages, 'agenda')
    expect(r.snippet).toContain('agenda')
    expect(r.snippet.slice(...r.matchRange!)).toBe('agenda')
  })
  it('ignores diacritics and case', () => {
    expect(searchPages(pages, 'CAFE')).toHaveLength(1)
  })
  it('treats regex characters literally and handles no matches', () => {
    expect(searchPages(pages, '(.*[')).toEqual([])
    expect(searchPages(pages, 'qqqq')).toEqual([])
    expect(searchPages(pages, '   ')).toEqual([])
  })
  it('searches 1,000 pages quickly', () => {
    const many = Array.from({ length: 1000 }, (_, i) => {
      const p = createPage('Page ' + i)
      p.blocks = [createBlock('paragraph', 'lorem ipsum dolor sit amet ' + i)]
      return p
    })
    const t = performance.now()
    searchPages(many, 'dolor')
    expect(performance.now() - t).toBeLessThan(200)
  })
})

describe('hash routing', () => {
  it('round-trips ids and rejects junk', () => {
    expect(pageIdFromHash(hashForPage('abc-123'))).toBe('abc-123')
    expect(pageIdFromHash('#/nope')).toBeNull()
    expect(pageIdFromHash('#/p/')).toBeNull()
  })
})

describe('backup', () => {
  it('round-trips pages and audio', async () => {
    const { page, rec } = pageWithAudio()
    const src = createMemoryStore()
    await src.savePageWithAudio(page, rec)
    const zip = await createBackup(src, [page])

    const dst = createMemoryStore()
    const plan = readBackup(zip, new Set())
    expect(plan.missingAudio).toBe(0)
    expect(plan.conflicts).toEqual([])
    await applyImport(dst, plan, 'keep-both')
    const got = (await dst.listPages()).pages[0]
    expect(got).toEqual(page)
    const audio = await dst.getAudio('aud-1')
    expect(audio?.byteSize).toBe(4)
    expect(audio?.durationMs).toBe(65_000)
  })

  it('exports pages stored in a real IndexedDB store', async () => {
    globalThis.indexedDB = new IDBFactory()
    const page = createPage('From IDB')
    const idb = createIdbStore(await openJotlyDB('b-' + Math.random()))
    await idb.savePage(page)
    const stored = (await idb.listPages()).pages
    const plan = readBackup(await createBackup(idb, stored), new Set())
    expect(plan.pages).toEqual([page])
  })

  it('rejects garbage and non-jotly zips', () => {
    expect(() => readBackup(new Uint8Array([1, 2, 3]), new Set())).toThrow(/valid Jotly backup/)
    expect(() => readBackup(zipSync({ 'x.txt': strToU8('hi') }), new Set())).toThrow(/manifest/)
  })

  it('refuses a backup from a newer version', () => {
    const zip = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'jotly', schemaVersion: 99, pages: [], audio: [] })) })
    expect(() => readBackup(zip, new Set())).toThrow(/newer version/)
  })

  it('flags missing audio but still imports the page', async () => {
    const { page, rec } = pageWithAudio()
    const src = createMemoryStore()
    await src.savePageWithAudio(page, rec)
    const zip = await createBackup(src, [page])
    // rebuild the zip without the audio file
    const { unzipSync } = await import('fflate')
    const files = unzipSync(zip)
    delete files['audio/aud-1.webm']
    const plan = readBackup(zipSync(files), new Set())
    expect(plan.pages).toHaveLength(1)
    expect(plan.missingAudio).toBeGreaterThan(0)
  })

  it('ignores hostile paths and ids', () => {
    const { page } = pageWithAudio()
    const manifest = {
      app: 'jotly',
      schemaVersion: 1,
      pages: [page.id, '../../evil'],
      audio: [{ id: 'x', pageId: page.id, mimeType: 'audio/webm', durationMs: 1, file: '../../evil.webm' }],
    }
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify(manifest)),
      [`pages/${page.id}.json`]: strToU8(JSON.stringify(page)),
      '../../evil.webm': new Uint8Array([9]),
    })
    const plan = readBackup(zip, new Set())
    expect(plan.audio).toHaveLength(0)
    expect(plan.pages).toHaveLength(1)
  })

  it('detects conflicts and keeps both copies without overwriting', async () => {
    const { page, rec } = pageWithAudio()
    const store = createMemoryStore()
    await store.savePageWithAudio(page, rec)
    const plan = readBackup(await createBackup(store, [page]), new Set([page.id]))
    expect(plan.conflicts).toEqual([page.id])
    await applyImport(store, plan, 'keep-both')
    const { pages } = await store.listPages()
    expect(pages).toHaveLength(2)
    const copy = pages.find((p) => p.id !== page.id)!
    const ab = copy.stickers[0]
    expect(ab.audioId).not.toBe('aud-1')
    expect(await store.getAudio(ab.audioId)).toBeDefined()
    expect(await store.getAudio('aud-1')).toBeDefined()
  })

  it('skip and replace strategies behave', async () => {
    const { page, rec } = pageWithAudio()
    const store = createMemoryStore()
    await store.savePageWithAudio(page, rec)
    const plan = readBackup(await createBackup(store, [page]), new Set([page.id]))
    expect(await applyImport(store, plan, 'skip')).toHaveLength(0)
    expect(await applyImport(store, plan, 'replace')).toHaveLength(1)
    expect((await store.listPages()).pages).toHaveLength(1)
  })
})
