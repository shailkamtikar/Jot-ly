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
    <div role="status" aria-live="polite" className={`min-h-5 text-xs ${tone}`} data-testid="save-status">
      <AnimatePresence mode="wait" initial={false}>
        {text && (
          <motion.span key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
