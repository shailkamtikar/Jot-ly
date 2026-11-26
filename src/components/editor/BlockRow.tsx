import { Reorder, useDragControls } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Block, TextBlockType } from '../../lib/types'
import { DotsIcon, GripIcon } from '../icons'

export interface RowActions {
  setType: (id: string, type: TextBlockType) => void
  move: (id: string, dir: -1 | 1) => void
  remove: (id: string) => void
}

function BlockMenu({ block, actions, canUp, canDown }: { block: Block; actions: RowActions; canUp: boolean; canDown: boolean }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const item = 'block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-sunken focus-visible:bg-sunken disabled:opacity-40'
  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  const isText = block.type === 'paragraph' || block.type === 'heading' || block.type === 'bullet'

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
          const i = items.indexOf(document.activeElement as HTMLElement)
          items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        }
      }}
    >
      <button
        type="button"
        aria-label="Block options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-muted hover:bg-sunken hover:text-fg"
      >
        <DotsIcon width={16} height={16} />
      </button>
      {open && (
        <div role="menu" aria-label="Block options" className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-line bg-surface p-1 shadow-xl">
          {isText && (
            <>
              <button role="menuitem" className={item} onClick={run(() => actions.setType(block.id, 'paragraph'))}>
                Text
              </button>
              <button role="menuitem" className={item} onClick={run(() => actions.setType(block.id, 'heading'))}>
                Heading
              </button>
              <button role="menuitem" className={item} onClick={run(() => actions.setType(block.id, 'bullet'))}>
                Bullet
              </button>
              <hr className="my-1 border-line" />
            </>
          )}
          <button role="menuitem" className={item} disabled={!canUp} onClick={run(() => actions.move(block.id, -1))}>
            Move up
          </button>
          <button role="menuitem" className={item} disabled={!canDown} onClick={run(() => actions.move(block.id, 1))}>
            Move down
          </button>
          {isText && (
            <>
              <hr className="my-1 border-line" />
              <button role="menuitem" className={`${item} text-danger`} onClick={run(() => actions.remove(block.id))}>
                Delete block
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function BlockRow({
  block,
  index,
  total,
  actions,
  children,
}: {
  block: Block
  index: number
  total: number
  actions: RowActions
  children: ReactNode
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={block.id}
      dragListener={false}
      dragControls={controls}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 10 }}
      className="group relative flex list-none items-start gap-1 rounded-xl bg-bg"
      data-testid="block-row"
      data-index={index}
    >
      <div className="flex w-14 shrink-0 items-start justify-end gap-0.5 pt-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:w-8 max-md:opacity-100">
        <span className="max-md:hidden">
          <BlockMenu block={block} actions={actions} canUp={index > 0} canDown={index < total - 1} />
        </span>
        <button
          type="button"
          aria-label="Drag to reorder (or use Alt+Arrow keys)"
          title="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none rounded-md p-1 text-muted hover:bg-sunken hover:text-fg active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="pt-1.5 md:hidden">
        <BlockMenu block={block} actions={actions} canUp={index > 0} canDown={index < total - 1} />
      </div>
    </Reorder.Item>
  )
}
