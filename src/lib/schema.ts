import { SCHEMA_VERSION, type Block, type Page, type Sticker, type TextBlock } from './types'

const TEXT_TYPES = new Set(['paragraph', 'heading', 'bullet'])

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`Invalid page: "${field}" must be a string`)
  return v
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function validateBlock(raw: unknown): Block {
  if (!isObj(raw)) throw new Error('Invalid page: block must be an object')
  const id = str(raw.id, 'block.id')
  const type = raw.type
  if (typeof type === 'string' && TEXT_TYPES.has(type)) {
    return { id, type: type as TextBlock['type'], content: str(raw.content ?? '', 'block.content') }
  }
  if (type === 'unsupported') return { id, type: 'unsupported', raw: raw.raw }
  // Unknown block types are preserved, never dropped.
  return { id, type: 'unsupported', raw }
}

function validateSticker(raw: unknown, blockIds: Set<string>): Sticker {
  if (!isObj(raw)) throw new Error('Invalid page: sticker must be an object')
  const audioId = raw.audioId
  if (typeof audioId !== 'string' || !audioId) throw new Error('Invalid page: sticker requires "audioId"')
  const anchor = typeof raw.anchorId === 'string' && blockIds.has(raw.anchorId) ? raw.anchorId : null
  return {
    id: str(raw.id, 'sticker.id'),
    audioId,
    title: typeof raw.title === 'string' ? raw.title : 'Voice note',
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : 0,
    peaks: Array.isArray(raw.peaks) ? raw.peaks.filter((p): p is number => typeof p === 'number') : [],
    x: typeof raw.x === 'number' ? clamp(raw.x, 0, 1) : 0.7,
    anchorId: anchor,
    dy: typeof raw.dy === 'number' && Number.isFinite(raw.dy) ? raw.dy : 0,
  }
}

/** Upgrade older stored shapes to the current schema. Pure. */
export function migrate(raw: unknown): unknown {
  if (!isObj(raw)) return raw
  let doc: Record<string, unknown> = raw
  let version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0

  if (version < 1) {
    // v0 stored text blocks as { text } rather than { content }.
    const blocks = Array.isArray(doc.blocks)
      ? doc.blocks.map((b) => (isObj(b) && 'text' in b && !('content' in b) ? { ...b, content: b.text } : b))
      : []
    doc = { ...doc, blocks, schemaVersion: 1 }
    version = 1
  }

  if (version < 2) {
    // v1 kept audio as blocks in the flow. v2 floats them as stickers attached to the block before them.
    const blocks: unknown[] = []
    const stickers: unknown[] = Array.isArray(doc.stickers) ? [...doc.stickers] : []
    let prevId: string | null = null
    let n = 0
    for (const b of Array.isArray(doc.blocks) ? doc.blocks : []) {
      if (isObj(b) && b.type === 'audio') {
        stickers.push({
          id: b.id,
          audioId: b.audioId,
          title: b.title,
          durationMs: b.durationMs,
          peaks: b.peaks,
          x: clamp(0.62 + 0.06 * (n % 3), 0, 1),
          anchorId: prevId,
          dy: 28,
        })
        n++
        continue
      }
      blocks.push(b)
      if (isObj(b) && typeof b.id === 'string') prevId = b.id
    }
    doc = { ...doc, blocks, stickers, schemaVersion: 2 }
  }
  return doc
}

export function validatePage(input: unknown): Page {
  const raw = migrate(input)
  if (!isObj(raw)) throw new Error('Invalid page: expected an object')
  const blocks = Array.isArray(raw.blocks) ? raw.blocks.map(validateBlock) : []
  const safeBlocks = blocks.length ? blocks : [{ id: crypto.randomUUID(), type: 'paragraph' as const, content: '' }]
  const ids = new Set(safeBlocks.map((b) => b.id))
  return {
    id: str(raw.id, 'id'),
    title: str(raw.title ?? '', 'title'),
    blocks: safeBlocks,
    stickers: Array.isArray(raw.stickers) ? raw.stickers.map((s) => validateSticker(s, ids)) : [],
    createdAt: str(raw.createdAt, 'createdAt'),
    updatedAt: str(raw.updatedAt, 'updatedAt'),
    schemaVersion: SCHEMA_VERSION,
  }
}
