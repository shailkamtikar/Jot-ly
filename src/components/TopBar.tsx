import { downloadBlob, slugify, toMarkdown } from '../lib/export'
import { useWorkspace } from '../state/workspace'
import { FileIcon, MenuIcon, SearchIcon } from './icons'
import { SaveStatus } from './SaveStatus'

export function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { activePage } = useWorkspace()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
      <button type="button" onClick={onMenu} aria-label="Open pages menu" className="rounded-lg p-2 text-muted hover:bg-sunken md:hidden">
        <MenuIcon />
      </button>
      <div className="min-w-0 flex-1 truncate text-sm text-muted">{activePage ? activePage.title || 'Untitled' : 'Jotly'}</div>
      <SaveStatus />
      <button type="button" onClick={onSearch} aria-label="Search notes" title={`Search (${isMac ? '⌘' : 'Ctrl'} K)`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg">
        <SearchIcon width={16} height={16} />
        <kbd className="hidden rounded border border-line px-1.5 text-[11px] md:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
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
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-fg"
      >
        <FileIcon width={16} height={16} /> <span className="max-sm:hidden">Export</span>
      </button>
    </header>
  )
}
