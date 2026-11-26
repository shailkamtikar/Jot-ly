import { createPage, createBlock, insertAfter, moveBlock, neighborTextId, removeBlock, splitBlock, updateBlock, formatDuration } from './blocks'
import { migrate, validatePage } from './schema'
import type { AudioBlock, Block } from './types'

const audio = (id = 'a1'): AudioBlock => ({ id, type: 'audio', audioId: 'aud-' + id, title: 'T', durationMs: 1000, peaks: [0.1] })

describe('blocks', () => {
  it('creates a page with one empty paragraph', () => {
    const p = createPage()
    expect(p.blocks).toHaveLength(1)
    expect(p.blocks[0]).toMatchObject({ type: 'paragraph', content: '' })
    expect(p.schemaVersion).toBe(1)
  })

  it('inserts after a block and appends when null', () => {
    const [a, b, c] = [createBlock(), createBlock(), createBlock()]
    const x = createBlock('heading')
    expect(insertAfter([a, b, c], b.id, x).map((v) => v.id)).toEqual([a.id, b.id, x.id, c.id])
    expect(insertAfter([a, b], null, x).at(-1)).toBe(x)
  })

  it('moves blocks keeping audio references', () => {
    const blocks: Block[] = [createBlock(), createBlock(), createBlock(), audio()]
    const out = moveBlock(blocks, 3, 0)
    expect(out[0]).toMatchObject({ type: 'audio', audioId: 'aud-a1' })
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

  it('finds neighbouring text blocks, skipping audio', () => {
    const [a, c] = [createBlock(), createBlock()]
    const blocks: Block[] = [a, audio(), c]
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

  it('rejects audio block without audioId', () => {
    const p = { ...createPage(), blocks: [{ id: 'x', type: 'audio' }] }
    expect(() => validatePage(p)).toThrow(/audioId/)
  })

  it('keeps unknown block types instead of dropping them', () => {
    const p = { ...createPage(), blocks: [{ id: 'x', type: 'foo', z: 1 }] }
    const out = validatePage(p)
    expect(out.blocks[0]).toMatchObject({ type: 'unsupported' })
    // and it survives a second round trip
    expect(validatePage(out).blocks[0]).toMatchObject({ type: 'unsupported', raw: { type: 'foo', z: 1 } })
  })

  it('migrates v0 documents without losing text', () => {
    const v0 = { id: 'p', title: 'T', blocks: [{ id: 'b', type: 'paragraph', text: 'hi' }], createdAt: 'c', updatedAt: 'u' }
    expect((migrate(v0) as { schemaVersion: number }).schemaVersion).toBe(1)
    expect(validatePage(v0).blocks[0]).toMatchObject({ content: 'hi' })
  })

  it('keeps audio metadata through validation', () => {
    const p = { ...createPage(), blocks: [audio()] }
    expect(validatePage(p).blocks[0]).toEqual(audio())
  })
})
