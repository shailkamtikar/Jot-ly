import { SCHEMA_VERSION, type Block, type Page, type TextBlock, type TextBlockType } from './types'

export const uid = (): string => crypto.randomUUID()

export function createBlock(type: TextBlockType = 'paragraph', content = ''): TextBlock {
  return { id: uid(), type, content }
}

export function createPage(title = ''): Page {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title,
    blocks: [createBlock()],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  }
}

/** Insert after the block with `afterId`; append when `afterId` is null/unknown. */
export function insertAfter(blocks: Block[], afterId: string | null, block: Block): Block[] {
  const idx = afterId ? blocks.findIndex((b) => b.id === afterId) : -1
  if (idx === -1) return [...blocks, block]
  return [...blocks.slice(0, idx + 1), block, ...blocks.slice(idx + 1)]
}

/** Remove a block. A page never has zero blocks: the last removal leaves one empty paragraph. */
export function removeBlock(blocks: Block[], id: string): Block[] {
  const next = blocks.filter((b) => b.id !== id)
  return next.length === 0 ? [createBlock()] : next
}

export function moveBlock(blocks: Block[], from: number, to: number): Block[] {
  if (from === to || from < 0 || from >= blocks.length) return blocks
  const clamped = Math.max(0, Math.min(blocks.length - 1, to))
  if (clamped === from) return blocks
  const next = [...blocks]
  const [item] = next.splice(from, 1)
  next.splice(clamped, 0, item)
  return next
}

export function updateBlock<T extends Block>(blocks: Block[], id: string, patch: Partial<T>): Block[] {
  return blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b))
}

export function isText(b: Block): b is TextBlock {
  return b.type === 'paragraph' || b.type === 'heading' || b.type === 'bullet'
}

/** Split a text block at a caret offset into two blocks. The second inherits list type. */
export function splitBlock(blocks: Block[], id: string, caret: number): { blocks: Block[]; newId: string } | null {
  const idx = blocks.findIndex((b) => b.id === id)
  const b = blocks[idx]
  if (!b || !isText(b)) return null
  const head = b.content.slice(0, caret)
  const tail = b.content.slice(caret)
  const next = createBlock(b.type === 'bullet' ? 'bullet' : 'paragraph', tail)
  const out = [...blocks]
  out[idx] = { ...b, content: head }
  out.splice(idx + 1, 0, next)
  return { blocks: out, newId: next.id }
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
