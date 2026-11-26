import { motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { easeOut } from '../lib/motion'
import type { Page } from '../lib/types'
import { useWorkspace } from '../state/workspace'
import { PageEditor } from './editor/PageEditor'
import { StickerLayer } from './stickers/StickerLayer'

export function PageView({ page }: { page: Page }) {
  const { updatePage } = useWorkspace()
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // A brand-new, untitled page puts the cursor in the title.
  useEffect(() => {
    if (!page.title && page.blocks.length === 1 && page.blocks[0].type === 'paragraph' && page.blocks[0].content === '' && page.stickers.length === 0) {
      titleRef.current?.focus()
    }
    // only when switching pages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id])

  // The display title wraps, so it grows with its content.
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [page.title, page.id])

  const words = useMemo(
    () => page.blocks.reduce((n, b) => (b.type === 'unsupported' ? n : n + (b.content.trim() ? b.content.trim().split(/\s+/).length : 0)), 0),
    [page.blocks],
  )
  const edited = new Date(page.updatedAt)

  return (
    <div ref={canvasRef} className="relative mx-auto w-full max-w-[1200px] px-5 pb-48 pt-10 md:px-12 md:pt-14" data-testid="canvas">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="mx-auto max-w-[44rem]"
      >
        <label htmlFor="page-title" className="sr-only">
          Page title
        </label>
        <textarea
          id="page-title"
          ref={titleRef}
          rows={1}
          value={page.title}
          maxLength={300}
          placeholder="Untitled"
          onChange={(e) => updatePage(page.id, (p) => ({ ...p, title: e.target.value.replace(/\n/g, ' ') }))}
          onBlur={() => updatePage(page.id, (p) => p, { immediate: true })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              document.querySelector<HTMLTextAreaElement>('[data-block-id]')?.focus()
            }
          }}
          className="font-display block w-full resize-none overflow-hidden bg-transparent text-[clamp(2.6rem,7vw,4.75rem)] leading-[0.98] outline-none placeholder:text-muted/40"
        />
        <div className="label mb-9 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-line py-2.5 text-muted">
          <span>
            Edited {edited.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {edited.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
          <span>{words} words</span>
          <span>
            {page.stickers.length} sticker{page.stickers.length === 1 ? '' : 's'}
          </span>
        </div>
      </motion.header>

      <div className="mx-auto max-w-[44rem]">
        <PageEditor page={page} canvasRef={canvasRef} />
      </div>

      <StickerLayer page={page} canvasRef={canvasRef} />
    </div>
  )
}
