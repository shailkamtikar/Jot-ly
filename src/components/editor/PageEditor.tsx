import { AnimatePresence, Reorder } from 'motion/react'
import { Fragment, useCallback, useRef, useState } from 'react'
import { computePeaks } from '../../audio/peaks'
import type { RecordingResult } from '../../audio/recorder'
import { createBlock, insertAfter, isText, moveBlock, neighborTextId, removeBlock, splitBlock, uid, updateBlock } from '../../lib/blocks'
import type { AudioBlock, AudioRecord, Block, Page, TextBlock, TextBlockType } from '../../lib/types'
import { toStorageError } from '../../storage'
import { useWorkspace } from '../../state/workspace'
import { AudioBlockView } from '../audio/AudioBlockView'
import { RecorderCard } from '../audio/RecorderCard'
import { MicIcon, PlusIcon } from '../icons'
import { BlockRow, type RowActions } from './BlockRow'
import { TextBlockView, type FocusRequest } from './TextBlockView'

const TYPE_SHORTCUTS: Array<[RegExp, TextBlockType]> = [
  [/^# /, 'heading'],
  [/^[-*] /, 'bullet'],
]

export function PageEditor({ page }: { page: Page }) {
  const { updatePage, addSticker, setFocusedBlockId, focusedBlockId } = useWorkspace()
  const [focusReq, setFocusReq] = useState<FocusRequest | null>(null)
  /** undefined = recorder closed; null = open at the end; string = open after that block. */
  const [recorderAfter, setRecorderAfter] = useState<string | null | undefined>(undefined)
  const focusN = useRef(0)
  const pageId = page.id

  const edit = useCallback(
    (fn: (blocks: Block[]) => Block[], immediate = true) => updatePage(pageId, (p) => ({ ...p, blocks: fn(p.blocks) }), { immediate }),
    [pageId, updatePage],
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
      edit((blocks) => removeBlock(blocks, id))
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
        edit((blocks) => removeBlock(blocks, block.id))
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
    [edit, focus, move, page.blocks],
  )

  function addText(type: TextBlockType) {
    const b = createBlock(type)
    edit((blocks) => insertAfter(blocks, null, b))
    focus(b.id, 'start')
  }

  function openRecorder() {
    const exists = focusedBlockId && page.blocks.some((b) => b.id === focusedBlockId)
    setRecorderAfter(exists ? focusedBlockId : null)
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
    const block: AudioBlock = {
      id: uid(),
      type: 'audio',
      audioId,
      title: `Voice note — ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      durationMs: result.durationMs,
      peaks,
    }
    try {
      await addSticker(pageId, recorderAfter ?? null, record, block)
    } catch (e) {
      throw new Error(toStorageError(e).message)
    }
    setFocusedBlockId(block.id)
    setRecorderAfter(undefined)
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
      <Reorder.Group axis="y" values={ids} onReorder={reorder} className="m-0 flex list-none flex-col gap-1 p-0" as="ul">
        <AnimatePresence initial={false}>
          {page.blocks.map((block, i) => (
            <Fragment key={block.id}>
              <BlockRow block={block} index={i} total={page.blocks.length} actions={actions}>
                {isText(block) ? (
                  <TextBlockView block={block} focusRequest={focusReq} onChange={onChange} onKeyDown={onKeyDown} onFocus={setFocusedBlockId} />
                ) : block.type === 'audio' ? (
                  <div onFocus={() => setFocusedBlockId(block.id)} onPointerDown={() => setFocusedBlockId(block.id)}>
                    <AudioBlockView block={block} pageId={pageId} />
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">This block type isn’t supported by this version of Jotly. It’s kept safe in your data.</p>
                )}
              </BlockRow>
              {recorderAfter === block.id && (
                <li className="list-none" key={`rec-${block.id}`}>
                  <RecorderCard onSave={saveRecording} onClose={() => setRecorderAfter(undefined)} />
                </li>
              )}
            </Fragment>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {recorderAfter === null && <RecorderCard onSave={saveRecording} onClose={() => setRecorderAfter(undefined)} />}

      {recorderAfter === undefined && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pl-14 max-md:pl-8" role="toolbar" aria-label="Add a block">
          <span className="mr-1 flex items-center gap-1 text-xs text-muted">
            <PlusIcon width={14} height={14} /> Add
          </span>
          <button type="button" onClick={() => addText('paragraph')} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sunken">
            Text
          </button>
          <button type="button" onClick={() => addText('heading')} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sunken">
            Heading
          </button>
          <button type="button" onClick={() => addText('bullet')} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sunken">
            Bullet
          </button>
          <button
            type="button"
            onClick={openRecorder}
            title="Inserts after the block you’re editing"
            data-testid="add-audio"
            className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent hover:brightness-95"
          >
            <MicIcon width={15} height={15} /> Audio sticker
          </button>
        </div>
      )}
    </div>
  )
}
