import { AnimatePresence, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { BackupDialog } from './components/BackupDialog'
import { EmptyState } from './components/EmptyState'
import { PageView } from './components/PageView'
import { SearchDialog } from './components/SearchDialog'
import { Sidebar } from './components/Sidebar'
import { ToastHost } from './components/Toast'
import { TopBar } from './components/TopBar'
import { ThemeProvider } from './state/theme'
import { useWorkspace, WorkspaceProvider } from './state/workspace'

function Shell() {
  const { ready, activePage, skippedPages } = useWorkspace()
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const [backup, setBackup] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="flex h-full">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>

      {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-surface transition-transform duration-200 ease-out md:static md:w-64 md:translate-x-0 md:transition-none ${drawer ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar onNavigate={() => setDrawer(false)} onOpenBackup={() => { setDrawer(false); setBackup(true) }} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawer(true)} onSearch={() => setSearch(true)} />
        {skippedPages > 0 && (
          <p role="alert" className="border-b border-line bg-sunken px-4 py-2 text-xs text-danger">
            {skippedPages} saved page{skippedPages === 1 ? ' was' : 's were'} unreadable and skipped. Your other notes are untouched.
          </p>
        )}
        <main id="main" tabIndex={-1} className="scroll-thin min-h-0 flex-1 overflow-y-auto outline-none">
          {!ready ? null : activePage ? <PageView key={activePage.id} page={activePage} /> : <EmptyState />}
        </main>
      </div>

      <AnimatePresence>{search && <SearchDialog key="search" onClose={() => setSearch(false)} />}</AnimatePresence>
      <AnimatePresence>{backup && <BackupDialog key="backup" onClose={() => setBackup(false)} />}</AnimatePresence>
      <ToastHost />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <WorkspaceProvider>
          <Shell />
        </WorkspaceProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
