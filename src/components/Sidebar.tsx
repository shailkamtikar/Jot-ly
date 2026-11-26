import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { normalize } from '../lib/search'
import { useWorkspace } from '../state/workspace'
import { ConfirmDialog } from './ConfirmDialog'
import { ArchiveIcon, PlusIcon, TrashIcon } from './icons'
import ShinyText from './reactbits/ShinyText'
import { ThemeToggle } from './ThemeToggle'
import { useReducedMotion } from 'motion/react'
import { useTheme } from '../state/theme'

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

  const deleting = pages.find((p) => p.id === toDelete)
  // ShinyText parses concrete colours, so CSS variables can't be used here.
  const base = resolved === 'dark' ? '#b8b8c2' : '#1c1917'
  const shine = resolved === 'dark' ? '#ffffff' : '#7c6dff'

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" width={24} height={24} className="rounded-md" />
          <ShinyText
            text="Jotly"
            color={base}
            shineColor={shine}
            speed={4}
            disabled={!!reduce}
            className="text-lg font-semibold tracking-tight"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          createPage()
          onNavigate()
        }}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-fg shadow-sm transition-transform active:scale-[0.98]"
      >
        <PlusIcon width={16} height={16} /> New page
      </button>

      <label className="sr-only" htmlFor="page-filter">
        Filter pages by title
      </label>
      <input
        id="page-filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter pages"
        className="rounded-lg border border-line bg-sunken px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
      />

      <nav aria-label="Pages" className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <ul className="flex flex-col gap-0.5">
          <AnimatePresence initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p.id}
                layout="position"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="group relative"
              >
                <button
                  type="button"
                  aria-current={p.id === activeId ? 'page' : undefined}
                  onClick={() => {
                    selectPage(p.id)
                    onNavigate()
                  }}
                  className={`block w-full truncate rounded-lg px-3 py-2 pr-9 text-left text-sm transition-colors ${p.id === activeId ? 'bg-accent-soft font-medium text-fg' : 'text-fg/80 hover:bg-sunken'}`}
                  title={p.title || 'Untitled'}
                >
                  {p.title || 'Untitled'}
                </button>
                <button
                  type="button"
                  aria-label={`Delete page ${p.title || 'Untitled'}`}
                  onClick={() => setToDelete(p.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {pages.length === 0 && <p className="px-3 py-4 text-sm text-muted">Create your first page to get started.</p>}
        {pages.length > 0 && visible.length === 0 && <p className="px-3 py-4 text-sm text-muted">No pages found.</p>}
      </nav>

      {storageMode === 'memory' && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-sunken p-2.5 text-xs text-danger">
          Storage is blocked in this browser. Notes won’t be kept after you close this tab.
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <button type="button" onClick={onOpenBackup} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg">
          <ArchiveIcon width={16} height={16} /> Backup
        </button>
        <ThemeToggle />
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
