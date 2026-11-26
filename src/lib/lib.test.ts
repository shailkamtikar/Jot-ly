import { createPage, createBlock, insertAfter, moveBlock, neighborTextId, removeBlock, splitBlock, updateBlock, formatDuration } from './blocks'
import { migrate, validatePage } from './schema'
import { anchorFor, reanchorStickers, stickerLeft, stickerLook, stickerTop } from './stickers'
import type { Block, Sticker } from './types'

const sticker = (id = 's1', over: Partial<Sticker> = {}): Sticker => ({
  id,
  audioId: 'aud-' + id,
  title: 'T',
  durationMs: 1000,
  peaks: [0.1],
  x: 0.5,
  anchorId: null,
  dy: 0,
  ...over,
})

describe('blocks', () => {
  it('creates a page with one empty paragraph and no stickers', () => {
    const p = createPage()
    expect(p.blocks).toHaveLength(1)
    expect(p.blocks[0]).toMatchObject({ type: 'paragraph', content: '' })
    expect(p.stickers).toEqual([])
    expect(p.schemaVersion).toBe(2)
  })

  it('inserts after a block and appends when null', () => {
    const [a, b, c] = [createBlock(), createBlock(), createBlock()]
    const x = createBlock('heading')
    expect(insertAfter([a, b, c], b.id, x).map((v) => v.id)).toEqual([a.id, b.id, x.id, c.id])
    expect(insertAfter([a, b], null, x).at(-1)).toBe(x)
  })

  it('moves blocks', () => {
    const blocks: Block[] = [createBlock(), createBlock(), createBlock(), createBlock()]
    const out = moveBlock(blocks, 3, 0)
    expect(out[0].id).toBe(blocks[3].id)
    expect(moveBlock(blocks, 0, 0)).toBe(blocks)
  })

  it('never leaves a page with zero blocks', () => {
    const only = createBlock()
    const out = removeBlock([only], only.id)
    expect(out).toHaveLength(1)
    expect(out[0].id).not.toBe(only.id)
  })

  it('does not mutate inputs', () => {
    const blocks: Block[] = [createBlock('paragraph', 'a')]
    const copy = JSON.stringify(blocks)
    updateBlock(blocks, blocks[0].id, { content: 'b' })
    insertAfter(blocks, null, createBlock())
    removeBlock(blocks, blocks[0].id)
    expect(JSON.stringify(blocks)).toBe(copy)
  })

  it('splits at caret and continues bullets', () => {
    const b = createBlock('bullet', 'hello world')
    const r = splitBlock([b], b.id, 5)!
    expect(r.blocks).toMatchObject([{ content: 'hello' }, { type: 'bullet', content: ' world' }])
  })

  it('drops a selected range when splitting', () => {
    const b = createBlock('paragraph', 'hello brave world')
    const r = splitBlock([b], b.id, 5, 'n1', 11)!
    expect(r.blocks).toMatchObject([{ content: 'hello' }, { id: 'n1', type: 'paragraph', content: ' world' }])
  })

  it('finds neighbouring text blocks', () => {
    const [a, c] = [createBlock(), createBlock()]
    const blocks: Block[] = [a, { id: 'u', type: 'unsupported', raw: {} }, c]
    expect(neighborTextId(blocks, a.id, 1)).toBe(c.id)
    expect(neighborTextId(blocks, c.id, -1)).toBe(a.id)
    expect(neighborTextId(blocks, a.id, -1)).toBeNull()
    expect(neighborTextId(blocks, 'nope', 1)).toBeNull()
  })

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_400)).toBe('1:05')
  })
})

describe('schema', () => {
  it('rejects garbage', () => {
    expect(() => validatePage({})).toThrow()
    expect(() => validatePage('x')).toThrow()
  })

  it('rejects a sticker without audioId', () => {
    const p = { ...createPage(), stickers: [{ id: 'x' }] }
    expect(() => validatePage(p)).toThrow(/audioId/)
  })

  it('keeps unknown block types instead of dropping them', () => {
    const p = { ...createPage(), blocks: [{ id: 'x', type: 'foo', z: 1 }] }
    const out = validatePage(p)
    expect(out.blocks[0]).toMatchObject({ type: 'unsupported' })
    expect(validatePage(out).blocks[0]).toMatchObject({ type: 'unsupported', raw: { type: 'foo', z: 1 } })
  })

  it('migrates v0 documents without losing text', () => {
    const v0 = { id: 'p', title: 'T', blocks: [{ id: 'b', type: 'paragraph', text: 'hi' }], createdAt: 'c', updatedAt: 'u' }
    expect((migrate(v0) as { schemaVersion: number }).schemaVersion).toBe(2)
    expect(validatePage(v0).blocks[0]).toMatchObject({ content: 'hi' })
  })

  it('migrates v1 audio blocks into stickers attached to the block before them', () => {
    const v1 = {
      id: 'p',
      title: 'T',
      schemaVersion: 1,
      createdAt: 'c',
      updatedAt: 'u',
      blocks: [
        { id: 'a', type: 'paragraph', content: 'first' },
        { id: 'au', type: 'audio', audioId: 'aud-1', title: 'Idea', durationMs: 5000, peaks: [0.5, 0.9] },
        { id: 'b', type: 'paragraph', content: 'second' },
      ],
    }
    const page = validatePage(v1)
    expect(page.blocks.map((b) => b.id)).toEqual(['a', 'b'])
    expect(page.stickers).toHaveLength(1)
    expect(page.stickers[0]).toMatchObject({ id: 'au', audioId: 'aud-1', title: 'Idea', durationMs: 5000, peaks: [0.5, 0.9], anchorId: 'a' })
  })

  it('repairs a sticker whose anchor block no longer exists', () => {
    const base = createPage()
    const page = validatePage({ ...base, stickers: [sticker('s', { anchorId: 'ghost', dy: 40 })] })
    expect(page.stickers[0].anchorId).toBeNull()
    expect(page.stickers[0].dy).toBe(40)
  })

  it('clamps out-of-range sticker positions', () => {
    const base = createPage()
    expect(validatePage({ ...base, stickers: [sticker('s', { x: 4 })] }).stickers[0].x).toBe(1)
    expect(validatePage({ ...base, stickers: [sticker('s', { x: -2 })] }).stickers[0].x).toBe(0)
  })

  it('round-trips stickers', () => {
    const base = createPage()
    const s = sticker('s', { anchorId: base.blocks[0].id, dy: 12, x: 0.25 })
    expect(validatePage({ ...base, stickers: [s] }).stickers).toEqual([s])
  })
})

describe('sticker geometry', () => {
  const rows = [
    { id: 'a', top: 0, height: 40 },
    { id: 'b', top: 50, height: 80 },
    { id: 'c', top: 140, height: 30 },
  ]

  it('anchors to the row the sticker lands on, with the offset inside it', () => {
    expect(anchorFor(rows, 70)).toEqual({ anchorId: 'b', dy: 20 })
  })
  it('anchors to the nearest row when dropped in a gap', () => {
    expect(anchorFor(rows, 44).anchorId).toBe('a')
    expect(anchorFor(rows, 47).anchorId).toBe('b')
  })
  it('handles drops above the first row and below the last', () => {
    expect(anchorFor(rows, -30)).toEqual({ anchorId: 'a', dy: -30 })
    expect(anchorFor(rows, 400)).toEqual({ anchorId: 'c', dy: 260 })
  })
  it('falls back to page-relative when there are no rows', () => {
    expect(anchorFor([], 90)).toEqual({ anchorId: null, dy: 90 })
  })
  it('computes the top from the anchor row, and from the page when unanchored', () => {
    expect(stickerTop({ anchorId: 'b', dy: 10 }, rows)).toBe(60)
    expect(stickerTop({ anchorId: null, dy: 25 }, rows)).toBe(25)
    expect(stickerTop({ anchorId: 'gone', dy: 5 }, rows)).toBe(5)
  })
  it('keeps the sticker inside the canvas horizontally', () => {
    expect(stickerLeft(0.5, 1000, 150)).toBe(500)
    expect(stickerLeft(0.99, 1000, 150)).toBe(850)
    expect(stickerLeft(0, 1000, 150)).toBe(0)
    expect(stickerLeft(0.5, 100, 150)).toBe(0)
  })
  it('follows its block when it moves: same dy, new row position', () => {
    const s = { anchorId: 'b', dy: 10 }
    expect(stickerTop(s, rows)).toBe(60)
    expect(stickerTop(s, [{ id: 'b', top: 200, height: 80 }])).toBe(210)
  })
  it('re-attaches stickers to a neighbour when their block is deleted, without moving them', () => {
    const list = [sticker('s1', { anchorId: 'b', dy: 10 }), sticker('s2', { anchorId: 'a', dy: 3 })]
    const out = reanchorStickers(list, 'b', rows, 'a')
    expect(out[0]).toMatchObject({ anchorId: 'a', dy: 60 }) // absolute 60 = 0 + 60
    expect(out[1]).toBe(list[1])
    const toPage = reanchorStickers(list, 'b', rows, null)
    expect(toPage[0]).toMatchObject({ anchorId: null, dy: 60 })
  })
  it('gives each sticker a stable look', () => {
    expect(stickerLook('abc')).toEqual(stickerLook('abc'))
    const { tint, tilt } = stickerLook('xyz-123')
    expect([1, 2, 3, 4]).toContain(tint)
    expect(Math.abs(tilt)).toBeLessThanOrEqual(2)
  })
})
