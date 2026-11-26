import { AnimatePresence, Reorder } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { computePeaks } from '../../audio/peaks'
import type { RecordingResult } from '../../audio/recorder'
import { createBlock, insertAfter, isText, moveBlock, neighborTextId, removeBlock, splitBlock, uid, updateBlock } from '../../lib/blocks'
import { reanchorStickers } from '../../lib/stickers'
import type { AudioRecord, Block, Page, Sticker, TextBlock, TextBlockType } from '../../lib/types'
import { toStorageError } from '../../storage'
import { useWorkspace } from '../../state/workspace'
import { RecorderCard } from '../audio/RecorderCard'
import { MicIcon } from '../icons'
import { measureRows, offsetWithin, STICKER_WIDTH } from '../stickers/geometry'
import { BlockRow, type RowActions } from './BlockRow'
import { TextBlockView, type FocusRequest } from './TextBlockView'

const TYPE_SHORTCUTS: Array<[RegExp, TextBlockType]> = [
  [/^# /, 'heading'],
  [/^[-*] /, 'bullet'],
]

const addBtn = 'label rounded-[3px] border border-line-strong px-3 py-2 text-muted transition-colors hover:border-fg hover:text-fg'

export function PageEditor({ page, canvasRef }: { page: Page; canvasRef: React.RefObject<HTMLElement | null> }) {
  const { updatePage, addSticker, setFocusedBlockId, focusedBlockId } = useWorkspace()
  const [focusReq, setFocusReq] = useState<FocusRequest | null>(null)
  const [recorderOpen, setRecorderOpen] = useState(false)
  /** The block the recording is attached to while the recorder is open. */
  const [recorderAfter, setRecorderAfter] = useState<string | null>(null)
  const focusN = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)
  const pageId = page.id

  const edit = useCallback(
    (fn: (blocks: Block[]) => Block[], immediate = true) => updatePage(pageId, (p) => ({ ...p, blocks: fn(p.blocks) }), { immediate }),
    [pageId, updatePage],
  )

  /** Remove a block; stickers attached to it stay where they are visually, re-attached to a neighbour. */
  const removeAndReanchor = useCallback(
    (id: string, target: string | null) => {
      const rows = measureRows(canvasRef.current)
      updatePage(pageId, (p) => ({ ...p, blocks: removeBlock(p.blocks, id), stickers: reanchorStickers(p.stickers, id, rows, target) }), { immediate: true })
    },
    [canvasRef, pageId, updatePage],
  )

  const focus = useCallback((id: string, at: 'start' | 'end') => {
    focusN.current += 1
    setFocusReq({ id, at, n: focusN.current })
  }, [])

  const onChange = useCallback(
    (id: string, content: string) => {
      // Markdown-style shortcuts: "# " → heading, "- " → bullet.
      const shortcut = TYPE_SHORTCUTS.find(([re]) => re.test(content))
      updatePage(pageId, (p) => {
        const cur = p.blocks.find((b) => b.id === id)
        if (shortcut && cur?.type === 'paragraph') {
          return { ...p, blocks: updateBlock<TextBlock>(p.blocks, id, { type: shortcut[1], content: content.replace(shortcut[0], '') }) }
        }
        return { ...p, blocks: updateBlock<TextBlock>(p.blocks, id, { content }) }
      })
    },
    [pageId, updatePage],
  )

  const move = useCallback(
    (id: string, dir: -1 | 1) =>
      edit((blocks) => {
        const i = blocks.findIndex((b) => b.id === id)
        return moveBlock(blocks, i, i + dir)
      }),
    [edit],
  )

  const actions: RowActions = {
    setType: (id, type) => edit((blocks) => updateBlock<TextBlock>(blocks, id, { type })),
    move,
    remove: (id) => {
      const prev = neighborTextId(page.blocks, id, -1) ?? neighborTextId(page.blocks, id, 1)
      removeAndReanchor(id, prev)
      if (prev) focus(prev, 'end')
    },
  }

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, block: TextBlock) => {
      if (e.nativeEvent.isComposing) return
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd

      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        move(block.id, e.key === 'ArrowUp' ? -1 : 1)
        requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`[data-block-id="${block.id}"]`)?.focus())
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (block.type === 'bullet' && ta.value === '') {
          edit((blocks) => updateBlock<TextBlock>(blocks, block.id, { type: 'paragraph' }))
          return
        }
        const newId = uid()
        edit((blocks) => splitBlock(blocks, block.id, start, newId, end)?.blocks ?? blocks)
        focus(newId, 'start')
        return
      }

      if (e.key === 'Backspace' && ta.value === '' && start === 0) {
        const prev = neighborTextId(page.blocks, block.id, -1)
        const next = neighborTextId(page.blocks, block.id, 1)
        if (page.blocks.length <= 1) return
        if (!prev && !next) return
        e.preventDefault()
        removeAndReanchor(block.id, prev ?? next)
        if (prev) focus(prev, 'end')
        else if (next) focus(next, 'start')
        return
      }

      if (!e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'ArrowUp' && start === 0 && end === 0) {
          const prev = neighborTextId(page.blocks, block.id, -1)
          if (prev) {
            e.preventDefault()
            focus(prev, 'end')
          }
        } else if (e.key === 'ArrowDown' && start === ta.value.length && end === ta.value.length) {
          const next = neighborTextId(page.blocks, block.id, 1)
          if (next) {
            e.preventDefault()
            focus(next, 'start')
          }
        }
      }
    },
    [edit, focus, move, page.blocks, removeAndReanchor],
  )

  function addText(type: TextBlockType) {
    const b = createBlock(type)
    edit((blocks) => insertAfter(blocks, null, b))
    focus(b.id, 'start')
  }

  function openRecorder() {
    const exists = focusedBlockId && page.blocks.some((b) => b.id === focusedBlockId)
    setRecorderAfter(exists ? focusedBlockId : (page.blocks.at(-1)?.id ?? null))
    setRecorderOpen(true)
  }

  function closeRecorder() {
    setRecorderOpen(false)
  }

  /** First home for a new sticker: in the margin beside the text if there is room, else tucked at the line's right end. */
  function defaultPlacement(): { x: number; anchorId: string | null; dy: number } {
    const canvas = canvasRef.current
    const list = listRef.current
    const anchorId = recorderAfter
    if (!canvas || !list) return { x: 0.7, anchorId, dy: 0 }
    const canvasW = canvas.clientWidth
    const listLeft = offsetWithin(list, canvas).left
    const colRight = listLeft + list.offsetWidth
    const roomRight = canvasW - colRight
    const left = roomRight >= STICKER_WIDTH + 16 ? colRight + 12 : Math.max(0, colRight - STICKER_WIDTH - 4)
    return { x: left / canvasW, anchorId, dy: 2 }
  }

  async function saveRecording(result: RecordingResult) {
    const audioId = uid()
    const peaks = (await computePeaks(result.blob)) ?? []
    const record: AudioRecord = {
      id: audioId,
      pageId,
      blob: result.blob,
      mimeType: result.mimeType,
      byteSize: result.blob.size,
      durationMs: result.durationMs,
    }
    const place = defaultPlacement()
    const sticker: Sticker = {
      id: uid(),
      audioId,
      title: 'Voice note',
      durationMs: result.durationMs,
      peaks,
      ...place,
    }
    try {
      await addSticker(pageId, sticker, record)
    } catch (e) {
      throw new Error(toStorageError(e).message)
    }
    setRecorderOpen(false)
  }

  function reorder(ids: string[]) {
    edit((blocks) => {
      const byId = new Map(blocks.map((b) => [b.id, b]))
      const next = ids.map((id) => byId.get(id)).filter((b): b is Block => !!b)
      return next.length === blocks.length ? next : blocks
    })
  }

  const ids = page.blocks.map((b) => b.id)

  return (
    <div data-testid="editor">
      <Reorder.Group ref={listRef} axis="y" values={ids} onReorder={reorder} className="m-0 flex list-none flex-col gap-1 p-0" as="ul">
        <AnimatePresence initial={false}>
          {page.blocks.map((block, i) => (
            <BlockRow key={block.id} block={block} index={i} total={page.blocks.length} actions={actions}>
              {isText(block) ? (
                <TextBlockView block={block} focusRequest={focusReq} onChange={onChange} onKeyDown={onKeyDown} onFocus={setFocusedBlockId} />
              ) : (
                <p className="rounded-[3px] border border-dashed border-line-strong px-3 py-2 text-sm text-muted">
                  This block type isn’t supported by this version of Jotly. It’s kept safe in your data.
                </p>
              )}
            </BlockRow>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <AnimatePresence>{recorderOpen && <RecorderCard key="recorder" onSave={saveRecording} onClose={closeRecorder} />}</AnimatePresence>

      {!recorderOpen && (
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5 md:pl-14" role="toolbar" aria-label="Add a block">
          <span className="label mr-2 text-muted">Add</span>
          <button type="button" onClick={() => addText('paragraph')} className={addBtn}>
            Text
          </button>
          <button type="button" onClick={() => addText('heading')} className={addBtn}>
            Heading
          </button>
          <button type="button" onClick={() => addText('bullet')} className={addBtn}>
            Bullet
          </button>
          <button
            type="button"
            onClick={openRecorder}
            title="Attaches to the line you’re editing"
            data-testid="add-audio"
            className="label arrow-link flex items-center gap-2 rounded-[3px] bg-accent px-3.5 py-2 text-accent-fg transition-[filter] hover:brightness-105"
          >
            <MicIcon width={14} height={14} /> Audio sticker
          </button>
        </div>
      )}
    </div>
  )
}
