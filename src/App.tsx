import Lenis from 'lenis'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { BackupDialog } from './components/BackupDialog'
import { EmptyState } from './components/EmptyState'
import { PageView } from './components/PageView'
import Noise from './components/reactbits/Noise'
import { SearchDialog } from './components/SearchDialog'
import { Sidebar } from './components/Sidebar'
import { ToastHost } from './components/Toast'
import { TopBar } from './components/TopBar'
import { ThemeProvider } from './state/theme'
import { useWorkspace, WorkspaceProvider } from './state/workspace'

/** Inertial scrolling for the page area. Skipped for reduced motion; native scrolling stays as the fallback. */
function useSmoothScroll(wrapper: React.RefObject<HTMLElement | null>, content: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const w = wrapper.current
    const c = content.current
    if (!enabled || !w || !c) return
    const lenis = new Lenis({ wrapper: w, content: c, lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true })
    let raf = 0
    const loop = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [wrapper, content, enabled])
}

function Shell() {
  const { ready, activePage, skippedPages } = useWorkspace()
  const reduce = useReducedMotion()
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const [backup, setBackup] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useSmoothScroll(mainRef, contentRef, !reduce)

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
    <div className="relative z-[1] flex h-full">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>

      {drawer && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-[18.5rem] border-r border-line bg-bg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:w-72 md:translate-x-0 md:transition-none ${drawer ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar
          onNavigate={() => setDrawer(false)}
          onOpenBackup={() => {
            setDrawer(false)
            setBackup(true)
          }}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawer(true)} onSearch={() => setSearch(true)} />
        {skippedPages > 0 && (
          <p role="alert" className="border-b border-line bg-sunken px-4 py-2 text-xs text-danger">
            {skippedPages} saved page{skippedPages === 1 ? ' was' : 's were'} unreadable and skipped. Your other notes are untouched.
          </p>
        )}
        <main id="main" ref={mainRef} tabIndex={-1} className="scroll-thin min-h-0 flex-1 overflow-y-auto outline-none">
          <div ref={contentRef} className="min-h-full">
            {!ready ? null : activePage ? <PageView key={activePage.id} page={activePage} /> : <EmptyState />}
          </div>
        </main>
      </div>

      <AnimatePresence>{search && <SearchDialog key="search" onClose={() => setSearch(false)} />}</AnimatePresence>
      <AnimatePresence>{backup && <BackupDialog key="backup" onClose={() => setBackup(false)} />}</AnimatePresence>
      <ToastHost />
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <WorkspaceProvider>
          <Shell />
        </WorkspaceProvider>
      </ThemeProvider>
      {!reduce && <Noise opacity={0.07} size={1} fps={8} fixed zIndex={50} className="pointer-events-none" />}
    </MotionConfig>
  )
}
