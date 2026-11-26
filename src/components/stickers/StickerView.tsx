import { AnimatePresence, motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { extensionFor } from '../../audio/mime'
import { useStickerAudio } from '../../audio/useStickerAudio'
import { formatDuration } from '../../lib/blocks'
import { downloadBlob, slugify } from '../../lib/export'
import { anchorFor, stickerLeft, stickerLook, stickerTop, type RowRect } from '../../lib/stickers'
import type { Sticker } from '../../lib/types'
import { useWorkspace } from '../../state/workspace'
import { DotsIcon, PauseIcon, PlayIcon } from '../icons'
import { Waveform } from '../audio/Waveform'
import { STICKER_WIDTH } from './geometry'

const MAX_TITLE = 80
const COMPACT_H = 52
const EXPANDED_H = 104

interface Props {
  sticker: Sticker
  pageId: string
  rows: RowRect[]
  canvasWidth: number
  canvasRef: React.RefObject<HTMLElement | null>
}

function StickerViewImpl({ sticker, pageId, rows, canvasWidth, canvasRef }: Props) {
  const { updateSticker, removeSticker } = useWorkspace()
  const audio = useStickerAudio(sticker, pageId)
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sticker.title)

  const { tint, tilt } = stickerLook(sticker.id)
  const missing = audio.status === 'missing'

  // Open up when playback starts; fold back into a small sticker once it has stopped and nobody is using it.
  useEffect(() => {
    if (audio.playing) setOpen(true)
  }, [audio.playing])
  // pointerleave can be missed (pointer jumps, capture during drags), so also watch the document while hovered.
  useEffect(() => {
    if (!hover) return
    const check = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setHover(false)
    }
    document.addEventListener('pointermove', check)
    window.addEventListener('blur', () => setHover(false), { once: true })
    return () => document.removeEventListener('pointermove', check)
  }, [hover])
  const interacting = hover || focusWithin || dragging || menu || editing
  useEffect(() => {
    if (!open || audio.playing || interacting) return
    // After the clip ends fold quickly; after a pause leave a moment to scrub or resume.
    const t = setTimeout(() => setOpen(false), audio.ended ? 600 : 2200)
    return () => clearTimeout(t)
  }, [open, audio.playing, audio.ended, interacting])

  const width = open ? Math.min(340, Math.max(STICKER_WIDTH, canvasWidth - 16)) : STICKER_WIDTH
  const height = open ? EXPANDED_H : COMPACT_H
  const left = stickerLeft(sticker.x, canvasWidth, width)
  const top = stickerTop(sticker, rows)

  /** Persist a new top-left position: attach to the nearest block and remember the horizontal fraction. */
  const commit = useCallback(
    (newLeft: number, newTop: number) => {
      const clampedLeft = Math.max(0, Math.min(newLeft, canvasWidth - width))
      const { anchorId, dy } = anchorFor(rows, Math.max(0, newTop))
      flushSync(() => updateSticker(pageId, sticker.id, { x: canvasWidth > 0 ? clampedLeft / canvasWidth : sticker.x, anchorId, dy }, { immediate: true }))
      mx.set(0)
      my.set(0)
    },
    [canvasWidth, mx, my, pageId, rows, sticker.id, sticker.x, updateSticker, width],
  )

  function onPointerDown(e: React.PointerEvent) {
    const t = e.target as HTMLElement
    if (t.closest('input,[role="slider"],[role="menu"]')) return
    controls.start(e)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target !== e.currentTarget) return
    const step = e.shiftKey ? 40 : 10
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    commit(left + v[0], top + v[1])
  }

  function commitTitle(save: boolean) {
    setEditing(false)
    if (!save) return setDraft(sticker.title)
    const title = draft.trim().slice(0, MAX_TITLE) || 'Voice note'
    setDraft(title)
    if (title !== sticker.title) updateSticker(pageId, sticker.id, { title }, { immediate: true })
  }

  async function download() {
    const blob = await audio.getBlob()
    if (blob) downloadBlob(blob, `${slugify(sticker.title)}.${extensionFor(blob.type)}`)
  }

  const guard = (fn: () => void) => () => {
    if (!moved.current) fn()
  }

  const ring = 2 * Math.PI * 15
  const showProgress = audio.progress > 0 || audio.playing

  return (
    <motion.div
      ref={rootRef}
      role="group"
      tabIndex={0}
      aria-label={`Audio sticker: ${sticker.title}. Arrow keys move it.`}
      data-testid="audio-block"
      data-sticker-id={sticker.id}
      data-expanded={open}
      data-state={`${audio.playing ? 'playing' : 'idle'}${hover ? ' hover' : ''}${focusWithin ? ' focus' : ''}${dragging ? ' drag' : ''}${menu ? ' menu' : ''}${editing ? ' edit' : ''}`}
      data-anchor={sticker.anchorId ?? ''}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={canvasRef as React.RefObject<Element>}
      onDragStart={() => {
        moved.current = true
        setDragging(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        commit(left + mx.get(), top + my.get())
        setTimeout(() => (moved.current = false), 80)
      }}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && setFocusWithin(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocusWithin(false)}
      initial={reduce ? false : { opacity: 0, scale: 0.7, rotate: tilt * 3 }}
      animate={{ opacity: 1, scale: dragging ? 1.06 : 1, rotate: dragging || open ? 0 : tilt, width, height }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      style={{
        x: mx,
        y: my,
        left,
        top,
        zIndex: dragging || open ? 30 : 20,
        background: `var(--sticker-${tint})`,
        color: 'var(--sticker-ink)',
        boxShadow: dragging
          ? '0 18px 36px -10px rgba(0,0,0,.45), 0 2px 0 rgba(0,0,0,.08)'
          : '0 6px 14px -8px rgba(0,0,0,.5), 0 1px 0 rgba(0,0,0,.08)',
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      className="pointer-events-auto absolute select-none rounded-[10px] border border-black/10 outline-offset-2 transition-[filter] duration-150 hover:brightness-[1.04]"
    >
      <div className="flex items-center gap-2 px-2" style={{ height: COMPACT_H }}>
        <button
          type="button"
          onClick={guard(audio.toggle)}
          disabled={missing}
          aria-label={audio.playing ? `Pause ${sticker.title}` : `Play ${sticker.title}`}
          data-testid="play"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sticker-ink)] text-[var(--sticker-tint-fg)] transition-transform active:scale-90"
          style={{ ['--sticker-tint-fg' as string]: `var(--sticker-${tint})` }}
        >
          {audio.playing ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
          {showProgress && (
            <svg className="pointer-events-none absolute -inset-[3px] -rotate-90" viewBox="0 0 36 36" width="42" height="42" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" style={{ color: 'var(--sticker-ink)' }} />
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--sticker-ink)" strokeWidth="2" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - audio.progress)} />
            </svg>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          {editing ? (
            <input
              autoFocus
              value={draft}
              maxLength={200}
              aria-label="Sticker name"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitTitle(true)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') commitTitle(true)
                if (e.key === 'Escape') commitTitle(false)
              }}
              className="min-w-0 rounded bg-black/10 px-1 text-[13px] font-semibold outline-none ring-1 ring-black/40"
            />
          ) : (
            <button
              type="button"
              onClick={guard(() => {
                setDraft(sticker.title)
                setEditing(true)
                setOpen(true)
              })}
              title="Rename"
              data-testid="sticker-title"
              className="min-w-0 truncate text-left text-[13px] font-semibold"
            >
              {sticker.title}
            </button>
          )}
          <span className="font-mono text-[11px] tabular-nums opacity-70">
            {missing ? 'Unavailable' : formatDuration(sticker.durationMs)}
          </span>
        </div>

        <div className="absolute right-1 top-1">
          <button
            type="button"
            aria-label={`Options for ${sticker.title}`}
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={guard(() => setMenu((m) => !m))}
            className={`rounded-md p-1 transition-opacity hover:bg-black/10 [@media(hover:none)]:opacity-100 ${hover || focusWithin || menu ? 'opacity-100' : 'opacity-0'}`}
          >
            <DotsIcon width={16} height={16} />
          </button>
          <AnimatePresence>
            {menu && (
              <StickerMenu
                onClose={() => setMenu(false)}
                onRename={() => {
                  setMenu(false)
                  setDraft(sticker.title)
                  setEditing(true)
                  setOpen(true)
                }}
                onDownload={() => {
                  setMenu(false)
                  void download()
                }}
                onDelete={() => {
                  setMenu(false)
                  audio.pause()
                  removeSticker(pageId, sticker.id)
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="flex items-center gap-2 px-3"
          >
            {missing ? (
              <p className="text-xs">Recording unavailable</p>
            ) : (
              <>
                <Waveform
                  peaks={sticker.peaks}
                  progress={audio.progress}
                  durationMs={sticker.durationMs}
                  onSeek={audio.seek}
                  label={`Playback position for ${sticker.title}`}
                  tone="sticker"
                />
                <button
                  type="button"
                  onClick={guard(audio.cycleSpeed)}
                  aria-label={`Playback speed ${audio.speed}x. Click to change`}
                  data-testid="speed"
                  className="w-10 shrink-0 rounded-md py-1 font-mono text-[11px] font-medium tabular-nums hover:bg-black/10"
                >
                  {audio.speed}×
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StickerMenu({ onClose, onRename, onDownload, onDelete }: { onClose: () => void; onRename: () => void; onDownload: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose()
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  const item = 'block w-full px-3 py-1.5 text-left text-[13px] text-fg hover:bg-sunken focus-visible:bg-sunken'
  return (
    <motion.div
      ref={ref}
      role="menu"
      aria-label="Sticker options"
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
          const i = items.indexOf(document.activeElement as HTMLElement)
          items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        }
      }}
      className="absolute right-0 top-8 z-50 w-36 overflow-hidden rounded-md border border-line-strong bg-surface py-1 text-fg shadow-xl"
      style={{ cursor: 'default' }}
    >
      <button role="menuitem" className={item} onClick={onRename}>
        Rename
      </button>
      <button role="menuitem" className={item} onClick={onDownload}>
        Download
      </button>
      <button role="menuitem" data-testid="delete-sticker" className={`${item} text-danger`} onClick={onDelete}>
        Delete
      </button>
    </motion.div>
  )
}

export const StickerView = memo(StickerViewImpl)
