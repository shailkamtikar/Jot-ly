import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import type { TextBlock } from '../../lib/types'

export interface FocusRequest {
  id: string
  at: 'start' | 'end'
  n: number
}

const STYLES: Record<TextBlock['type'], string> = {
  paragraph: 'text-[1.125rem] leading-[1.75]',
  heading: 'font-display text-[1.9rem] leading-[1.1] pt-5 pb-1',
  bullet: 'text-[1.125rem] leading-[1.75]',
}

const PLACEHOLDERS: Record<TextBlock['type'], string> = {
  paragraph: 'Write something…',
  heading: 'Heading',
  bullet: 'List item',
}

function TextBlockViewImpl({
  block,
  focusRequest,
  onChange,
  onKeyDown,
  onFocus,
}: {
  block: TextBlock
  focusRequest: FocusRequest | null
  onChange: (id: string, content: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, block: TextBlock) => void
  onFocus: (id: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(resize, [block.content, block.type])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth
        resize()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!focusRequest || focusRequest.id !== block.id) return
    const el = ref.current
    if (!el) return
    el.focus()
    const pos = focusRequest.at === 'start' ? 0 : el.value.length
    el.setSelectionRange(pos, pos)
  }, [focusRequest, block.id])

  return (
    <div className="flex items-start gap-2">
      {block.type === 'bullet' && (
        <span aria-hidden="true" className="mt-[0.95rem] h-[5px] w-[5px] shrink-0 rotate-45 bg-accent-ink" />
      )}
      <textarea
        ref={ref}
        rows={1}
        value={block.content}
        data-block-id={block.id}
        data-block-type={block.type}
        aria-label={block.type === 'heading' ? 'Heading' : block.type === 'bullet' ? 'List item' : 'Paragraph'}
        placeholder={PLACEHOLDERS[block.type]}
        spellCheck
        onChange={(e) => onChange(block.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, block)}
        onFocus={() => onFocus(block.id)}
        className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-transparent focus:placeholder:text-muted/70 ${STYLES[block.type]}`}
      />
    </div>
  )
}

export const TextBlockView = memo(TextBlockViewImpl)
