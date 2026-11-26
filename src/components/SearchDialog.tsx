import { useEffect, useMemo, useState } from 'react'
import { searchPages } from '../lib/search'
import { useWorkspace } from '../state/workspace'
import { SearchIcon } from './icons'
import { Modal } from './Modal'

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const { pages, selectPage } = useWorkspace()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120)
    return () => clearTimeout(t)
  }, [query])

  const results = useMemo(() => searchPages(pages, debounced), [pages, debounced])
  useEffect(() => setIndex(0), [debounced])

  function open(i: number) {
    const r = results[i]
    if (!r) return
    selectPage(r.page.id)
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      open(index)
    }
  }

  return (
    <Modal title="Search notes" onClose={onClose} align="top" labelHidden>
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <SearchIcon className="text-muted" />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={results[index] ? `result-${index}` : undefined}
          aria-label="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search titles and text…"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
      </div>
      <ul id="search-results" role="listbox" aria-label="Results" className="scroll-thin mt-2 max-h-80 overflow-y-auto">
        {results.map((r, i) => (
          <li key={r.page.id} id={`result-${i}`} role="option" aria-selected={i === index}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => open(i)}
              onMouseMove={() => setIndex(i)}
              className={`block w-full rounded-[3px] px-3 py-2 text-left ${i === index ? 'bg-accent-soft' : ''}`}
            >
              <div className="truncate text-sm font-medium">{r.page.title || 'Untitled'}</div>
              {r.snippet && r.matchRange && (
                <div className="truncate text-xs text-muted">
                  {r.snippet.slice(0, r.matchRange[0])}
                  <mark className="rounded bg-accent/25 px-0.5 text-fg">{r.snippet.slice(...r.matchRange)}</mark>
                  {r.snippet.slice(r.matchRange[1])}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
      {debounced.trim() && results.length === 0 && <p className="px-3 py-4 text-sm text-muted">No results for “{debounced}”.</p>}
      {!debounced.trim() && <p className="px-3 py-4 text-sm text-muted">Type to search every page. ↑ ↓ to move, Enter to open.</p>}
    </Modal>
  )
}
