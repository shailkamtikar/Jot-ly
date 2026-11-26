import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { normalize } from '../lib/search'
import { useWorkspace } from '../state/workspace'
import { ConfirmDialog } from './ConfirmDialog'
import { ArchiveIcon, ArrowIcon, TrashIcon } from './icons'
import CountUp from './reactbits/CountUp'
import Magnet from './reactbits/Magnet'
import ShinyText from './reactbits/ShinyText'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '../state/theme'

const pad = (n: number) => String(n).padStart(2, '0')

export function Sidebar({ onNavigate, onOpenBackup }: { onNavigate: () => void; onOpenBackup: () => void }) {
  const { pages, activeId, createPage, selectPage, deletePage, storageMode } = useWorkspace()
  const { resolved } = useTheme()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150)
    return () => clearTimeout(t)
  }, [query])

  const visible = useMemo(() => {
    const q = normalize(debounced.trim())
    return q ? pages.filter((p) => normalize(p.title || 'Untitled').includes(q)) : pages
  }, [pages, debounced])

  const stickerCount = useMemo(() => pages.reduce((n, p) => n + p.stickers.length, 0), [pages])
  const deleting = pages.find((p) => p.id === toDelete)

  // ShinyText parses concrete colours, so CSS variables can't be used here.
  const base = resolved === 'dark' ? '#ece4d3' : '#1a1611'
  const shine = resolved === 'dark' ? '#d7a043' : '#c18a22'

  return (
    <div className="flex h-full flex-col px-5 pb-4 pt-5">
      <div className="mb-6">
        <ShinyText text="Jotly" color={base} shineColor={shine} speed={5} disabled={!!reduce} className="font-display block text-[2.6rem] leading-none" />
        <p className="label mt-1.5 text-muted">Notes, with a voice</p>
      </div>

      <Magnet magnetStrength={6} maxOffset={6} padding={30} wrapperClassName="mb-5" innerClassName="w-full">
        <button
          type="button"
          onClick={() => {
            createPage()
            onNavigate()
          }}
          className="arrow-link label flex w-full items-center justify-between rounded-[3px] bg-accent px-4 py-3 text-accent-fg transition-[filter] hover:brightness-105 active:brightness-95"
        >
          New page <ArrowIcon className="arrow" width={16} height={16} />
        </button>
      </Magnet>

      <label className="sr-only" htmlFor="page-filter">
        Filter pages by title
      </label>
      <input
        id="page-filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="FILTER PAGES"
        className="label mb-3 border-b border-line bg-transparent pb-2 text-fg outline-none transition-colors placeholder:text-muted focus:border-accent-ink"
      />

      <nav aria-label="Pages" className="scroll-thin -mx-2 min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {visible.map((p, i) => {
              const active = p.id === activeId
              return (
                <motion.li
                  key={p.id}
                  layout="position"
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i, 8) * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
                  exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
                  className="group relative border-b border-line"
                >
                  {active && <motion.span layoutId="active-bar" className="absolute inset-y-0 left-0 w-[3px] bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      selectPage(p.id)
                      onNavigate()
                    }}
                    title={p.title || 'Untitled'}
                    className={`flex w-full items-baseline gap-3 py-3 pl-3 pr-9 text-left transition-[padding,color] duration-200 hover:pl-4 ${active ? 'text-fg' : 'text-muted hover:text-fg'}`}
                  >
                    <span className={`label shrink-0 tabular-nums ${active ? 'text-accent-ink' : ''}`}>{pad(pages.indexOf(p) + 1)}</span>
                    <span className="truncate text-[0.95rem] font-medium">{p.title || 'Untitled'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete page ${p.title || 'Untitled'}`}
                    onClick={() => setToDelete(p.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
        {pages.length === 0 && <p className="py-4 text-sm text-muted">Create your first page to get started.</p>}
        {pages.length > 0 && visible.length === 0 && <p className="py-4 text-sm text-muted">No pages found.</p>}
      </nav>

      {storageMode === 'memory' && (
        <p role="alert" className="mb-3 rounded-[3px] border border-danger/50 p-2.5 text-xs text-danger">
          Storage is blocked in this browser. Notes won’t be kept after you close this tab.
        </p>
      )}

      <div className="mt-3 border-t border-line pt-4">
        <p className="label mb-3 flex gap-3 text-muted" aria-label={`${pages.length} pages, ${stickerCount} stickers`}>
          <span>
            <CountUp to={pages.length} trigger="load" duration={0.8} className="tabular-nums text-fg" /> {pages.length === 1 ? "page" : "pages"}
          </span>
          <span>
            <CountUp to={stickerCount} trigger="load" duration={0.8} className="tabular-nums text-fg" /> {stickerCount === 1 ? "sticker" : "stickers"}
          </span>
        </p>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onOpenBackup} className="label flex items-center gap-1.5 rounded px-1 py-1.5 text-muted transition-colors hover:text-fg">
            <ArchiveIcon width={15} height={15} /> Backup
          </button>
          <ThemeToggle />
        </div>
      </div>

      <AnimatePresence>
        {deleting && (
          <ConfirmDialog
            title="Delete this page?"
            message={`“${deleting.title || 'Untitled'}” and all of its audio stickers will be permanently deleted from this device.`}
            confirmLabel="Delete"
            danger
            onCancel={() => setToDelete(null)}
            onConfirm={() => {
              void deletePage(deleting.id)
              setToDelete(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
