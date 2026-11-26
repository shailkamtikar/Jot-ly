import type { RowRect } from '../../lib/stickers'

/** Offset of `el` from the top-left of `root`, ignoring CSS transforms (so animations don't skew it). */
export function offsetWithin(el: HTMLElement, root: HTMLElement): { top: number; left: number } {
  let top = 0
  let left = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    top += n.offsetTop
    left += n.offsetLeft
    n = n.offsetParent as HTMLElement | null
  }
  return { top, left }
}

/** Measure every block row inside the page canvas. */
export function measureRows(canvas: HTMLElement | null): RowRect[] {
  if (!canvas) return []
  return Array.from(canvas.querySelectorAll<HTMLElement>('[data-row-id]')).map((el) => ({
    id: el.dataset.rowId as string,
    top: offsetWithin(el, canvas).top,
    height: el.offsetHeight,
  }))
}

export const STICKER_WIDTH = 156
