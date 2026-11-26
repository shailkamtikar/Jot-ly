import { motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { pop } from '../lib/motion'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Accessible dialog: focus is trapped, Escape closes, focus returns to the trigger. */
export function Modal({
  title,
  onClose,
  children,
  align = 'center',
  labelHidden = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  align?: 'center' | 'top'
  labelHidden?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = ref.current
    const first = root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    return () => previous?.focus?.()
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <motion.div
      className={`fixed inset-0 z-50 flex justify-center bg-black/55 p-4 backdrop-blur-[3px] ${align === 'top' ? 'items-start pt-[12vh]' : 'items-center'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-md border border-line bg-surface p-5 shadow-2xl"
        {...pop}
      >
        <h2 id={titleId} className={labelHidden ? 'sr-only' : 'font-display mb-3 text-2xl'}>
          {title}
        </h2>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
