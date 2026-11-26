import { AnimatePresence, motion } from 'motion/react'
import { useWorkspace } from '../state/workspace'

export function SaveStatus() {
  const { saveStatus, storageMode } = useWorkspace()
  let text = ''
  let tone = 'text-muted'
  if (storageMode === 'memory') {
    text = 'Not saved — storage unavailable'
    tone = 'text-danger'
  } else if (saveStatus === 'saving') text = 'Saving…'
  else if (saveStatus === 'saved') text = 'Saved on this device'
  else if (saveStatus === 'retrying') {
    text = 'Couldn’t save — retrying'
    tone = 'text-danger'
  } else if (saveStatus === 'error') {
    text = 'Couldn’t save'
    tone = 'text-danger'
  }

  return (
    <div role="status" aria-live="polite" className={`label flex min-h-5 items-center gap-2 max-sm:hidden ${tone}`} data-testid="save-status">
      <AnimatePresence mode="wait" initial={false}>
        {text && (
          <motion.span key={text} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${saveStatus === 'saving' ? 'animate-pulse bg-accent' : tone === 'text-danger' ? 'bg-danger' : 'bg-accent-ink'}`} />
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
