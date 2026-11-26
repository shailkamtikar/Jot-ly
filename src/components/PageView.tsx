import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { fadeUp } from '../lib/motion'
import { useWorkspace } from '../state/workspace'
import type { Page } from '../lib/types'
import { PageEditor } from './editor/PageEditor'

export function PageView({ page }: { page: Page }) {
  const { updatePage } = useWorkspace()
  const titleRef = useRef<HTMLInputElement>(null)

  // A brand-new, untitled page puts the cursor in the title.
  useEffect(() => {
    if (!page.title && page.blocks.length === 1 && page.blocks[0].type === 'paragraph' && page.blocks[0].content === '') {
      titleRef.current?.focus()
    }
    // only when switching pages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id])

  return (
    <motion.article key={page.id} {...fadeUp} className="mx-auto w-full max-w-3xl px-5 pb-40 pt-10 md:px-10">
      <label htmlFor="page-title" className="sr-only">
        Page title
      </label>
      <input
        id="page-title"
        ref={titleRef}
        value={page.title}
        maxLength={300}
        placeholder="Untitled"
        onChange={(e) => updatePage(page.id, (p) => ({ ...p, title: e.target.value }))}
        onBlur={() => updatePage(page.id, (p) => p, { immediate: true })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            document.querySelector<HTMLTextAreaElement>('[data-block-id]')?.focus()
          }
        }}
        className="w-full truncate bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-muted/50"
      />
      <p className="mb-8 mt-1 pl-0.5 text-xs text-muted">Last edited {new Date(page.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <PageEditor page={page} />
    </motion.article>
  )
}
