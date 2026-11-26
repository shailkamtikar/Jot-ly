import { formatDuration } from './blocks'
import type { Page } from './types'

/** Escape characters that would otherwise turn plain text into Markdown syntax. */
export function escapeMd(s: string): string {
  return s
    .replace(/([\\`*_[\]<>])/g, '\\$1')
    .replace(/^(\s*)([#>+-]|\d+\.)(\s)/gm, '$1\\$2$3')
}

export function toMarkdown(page: Page): string {
  const out: string[] = [`# ${escapeMd(page.title.trim() || 'Untitled')}`, '']
  for (const b of page.blocks) {
    switch (b.type) {
      case 'heading':
        if (b.content.trim()) out.push(`## ${escapeMd(b.content)}`, '')
        break
      case 'bullet':
        if (b.content.trim()) out.push(`- ${escapeMd(b.content).replace(/\n/g, '\n  ')}`)
        break
      case 'paragraph':
        if (b.content.trim()) out.push(escapeMd(b.content), '')
        break
      case 'audio':
        out.push(`> 🎙 Audio: ${escapeMd(b.title)} (${formatDuration(b.durationMs)})`, '')
        break
      default:
        break
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

export function slugify(title: string): string {
  const s = title
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60)
  return s || 'untitled'
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
