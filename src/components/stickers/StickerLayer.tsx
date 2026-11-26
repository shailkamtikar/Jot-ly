import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { RowRect } from '../../lib/stickers'
import type { Page } from '../../lib/types'
import { measureRows } from './geometry'
import { StickerView } from './StickerView'

/**
 * Floating layer on top of the page. Stickers are positioned relative to the block rows
 * they are attached to, so they travel with their text when it reflows or is reordered.
 */
export function StickerLayer({ page, canvasRef }: { page: Page; canvasRef: React.RefObject<HTMLElement | null> }) {
  const [geo, setGeo] = useState<{ rows: RowRect[]; width: number }>({ rows: [], width: 0 })

  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rows = measureRows(canvas)
    const width = canvas.clientWidth
    setGeo((prev) => {
      const same =
        prev.width === width &&
        prev.rows.length === rows.length &&
        prev.rows.every((r, i) => r.id === rows[i].id && r.top === rows[i].top && r.height === rows[i].height)
      return same ? prev : { rows, width }
    })
  }, [canvasRef])

  const orderKey = page.blocks.map((b) => b.id).join('|')
  useLayoutEffect(measure)

  // Rows can move without the page changing size (reorders), and animate for a moment: measure again once settled.
  useEffect(() => {
    const t = setTimeout(measure, 280)
    return () => clearTimeout(t)
  }, [orderKey, measure])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(measure)
    ro.observe(canvas)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [canvasRef, measure])

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-label="Audio stickers" data-testid="sticker-layer">
      <AnimatePresence>
        {geo.width > 0 &&
          page.stickers.map((s) => <StickerView key={s.id} sticker={s} pageId={page.id} rows={geo.rows} canvasWidth={geo.width} canvasRef={canvasRef} />)}
      </AnimatePresence>
    </div>
  )
}
