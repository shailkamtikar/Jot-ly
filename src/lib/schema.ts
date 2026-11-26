import { SCHEMA_VERSION, type AudioBlock, type Block, type Page, type TextBlock } from './types'

const TEXT_TYPES = new Set(['paragraph', 'heading', 'bullet'])

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`Invalid page: "${field}" must be a string`)
  return v
}

function validateBlock(raw: unknown): Block {
  if (!isObj(raw)) throw new Error('Invalid page: block must be an object')
  const id = str(raw.id, 'block.id')
  const type = raw.type
  if (typeof type === 'string' && TEXT_TYPES.has(type)) {
    return { id, type: type as TextBlock['type'], content: str(raw.content ?? '', 'block.content') }
  }
  if (type === 'audio') {
    const audioId = raw.audioId
    if (typeof audioId !== 'string' || !audioId) throw new Error('Invalid page: audio block requires "audioId"')
    const peaks = Array.isArray(raw.peaks) ? raw.peaks.filter((p): p is number => typeof p === 'number') : []
    const block: AudioBlock = {
      id,
      type: 'audio',
      audioId,
      title: typeof raw.title === 'string' ? raw.title : 'Voice note',
      durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : 0,
      peaks,
    }
    return block
  }
  if (type === 'unsupported') return { id, type: 'unsupported', raw: raw.raw }
  // Unknown block types are preserved, never dropped.
  return { id, type: 'unsupported', raw }
}

/** Upgrade older stored shapes to the current schema. Pure. */
export function migrate(raw: unknown): unknown {
  if (!isObj(raw)) return raw
  let doc: Record<string, unknown> = raw
  const version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0
  if (version < 1) {
    // v0 stored text blocks as { text } rather than { content }.
    const blocks = Array.isArray(doc.blocks)
      ? doc.blocks.map((b) => (isObj(b) && 'text' in b && !('content' in b) ? { ...b, content: b.text } : b))
      : []
    doc = { ...doc, blocks, schemaVersion: 1 }
  }
  return doc
}

export function validatePage(input: unknown): Page {
  const raw = migrate(input)
  if (!isObj(raw)) throw new Error('Invalid page: expected an object')
  const blocks = Array.isArray(raw.blocks) ? raw.blocks.map(validateBlock) : []
  return {
    id: str(raw.id, 'id'),
    title: str(raw.title ?? '', 'title'),
    blocks: blocks.length ? blocks : [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }],
    createdAt: str(raw.createdAt, 'createdAt'),
    updatedAt: str(raw.updatedAt, 'updatedAt'),
    schemaVersion: SCHEMA_VERSION,
  }
}
