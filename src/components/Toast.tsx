import { AnimatePresence, motion } from 'motion/react'
import { fadeUp } from '../lib/motion'
import { useWorkspace } from '../state/workspace'

export function ToastHost() {
  const { toast, dismissToast } = useWorkspace()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            {...fadeUp}
            className={`pointer-events-auto flex items-center gap-3 rounded-[3px] border px-4 py-2.5 text-sm shadow-lg ${toast.tone === 'error' ? 'border-danger/40 bg-surface text-danger' : 'border-line bg-surface'}`}
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <button type="button" onClick={toast.undo} className="label text-accent-ink underline-offset-4 hover:underline">
                Undo
              </button>
            )}
            <button type="button" onClick={dismissToast} aria-label="Dismiss" className="text-muted hover:text-fg">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
