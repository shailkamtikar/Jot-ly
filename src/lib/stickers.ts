import type { Sticker } from './types'

/** Where a block row sits inside the page canvas (px, relative to the canvas). */
export interface RowRect {
  id: string
  top: number
  height: number
}

/** Pick the block a dropped sticker should attach to: the row it lands on, else the nearest one. */
export function anchorFor(rows: RowRect[], y: number): { anchorId: string | null; dy: number } {
  if (rows.length === 0) return { anchorId: null, dy: y }
  let best = rows[0]
  let bestDist = Infinity
  for (const r of rows) {
    const dist = y < r.top ? r.top - y : y > r.top + r.height ? y - (r.top + r.height) : 0
    if (dist < bestDist) {
      best = r
      bestDist = dist
    }
    if (dist === 0) break
  }
  return { anchorId: best.id, dy: y - best.top }
}

/** Absolute top (px, relative to the canvas) of a sticker given the measured rows. */
export function stickerTop(s: Pick<Sticker, 'anchorId' | 'dy'>, rows: RowRect[]): number {
  const row = s.anchorId ? rows.find((r) => r.id === s.anchorId) : undefined
  return (row?.top ?? 0) + s.dy
}

/** Keep a sticker's left edge inside the canvas for its current width. */
export function stickerLeft(x: number, canvasWidth: number, stickerWidth: number): number {
  return Math.max(0, Math.min(x * canvasWidth, canvasWidth - stickerWidth))
}

/**
 * A block is about to be removed. Stickers attached to it keep their visual position
 * by moving to `targetId` (or to the page when there is none).
 */
export function reanchorStickers(stickers: Sticker[], removedId: string, rows: RowRect[], targetId: string | null): Sticker[] {
  if (!stickers.some((s) => s.anchorId === removedId)) return stickers
  const removed = rows.find((r) => r.id === removedId)
  const target = targetId ? rows.find((r) => r.id === targetId) : undefined
  return stickers.map((s) => {
    if (s.anchorId !== removedId) return s
    const absolute = (removed?.top ?? 0) + s.dy
    return target ? { ...s, anchorId: target.id, dy: absolute - target.top } : { ...s, anchorId: null, dy: absolute }
  })
}

/** Small, stable tilt and tint per sticker so a page of them feels hand-placed, not stamped. */
export function stickerLook(id: string): { tint: 1 | 2 | 3 | 4; tilt: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return { tint: ((h % 4) + 1) as 1 | 2 | 3 | 4, tilt: ((h >>> 3) % 5) - 2 }
}
