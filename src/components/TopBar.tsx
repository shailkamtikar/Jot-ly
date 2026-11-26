import { downloadBlob, slugify, toMarkdown } from '../lib/export'
import { useWorkspace } from '../state/workspace'
import { FileIcon, MenuIcon, SearchIcon } from './icons'
import { SaveStatus } from './SaveStatus'

const pad = (n: number) => String(n).padStart(2, '0')

export function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { activePage, pages } = useWorkspace()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const index = activePage ? pages.findIndex((p) => p.id === activePage.id) + 1 : 0

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 md:px-8">
      <button type="button" onClick={onMenu} aria-label="Open pages menu" className="-ml-2 rounded p-2 text-muted hover:text-fg md:hidden">
        <MenuIcon />
      </button>
      <p className="label min-w-0 flex-1 truncate text-muted">
        {activePage ? (
          <>
            <span className="text-fg">Page {pad(index)}</span> <span aria-hidden="true">/</span> {pad(pages.length)}
          </>
        ) : (
          'Jotly'
        )}
      </p>
      <SaveStatus />
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search notes"
        title={`Search (${isMac ? '⌘' : 'Ctrl'} K)`}
        className="label flex items-center gap-2 rounded px-2 py-1.5 text-muted transition-colors hover:text-fg"
      >
        <SearchIcon width={15} height={15} />
        <kbd className="hidden rounded-[3px] border border-line-strong px-1.5 py-px md:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <button
        type="button"
        disabled={!activePage}
        onClick={() => {
          if (!activePage) return
          downloadBlob(new Blob([toMarkdown(activePage)], { type: 'text/markdown;charset=utf-8' }), `${slugify(activePage.title)}.md`)
        }}
        aria-label="Export page as Markdown"
        title="Export as Markdown"
        className="label flex items-center gap-1.5 rounded px-2 py-1.5 text-muted transition-colors hover:text-fg"
      >
        <FileIcon width={15} height={15} /> <span className="max-sm:hidden">Export</span>
      </button>
    </header>
  )
}
