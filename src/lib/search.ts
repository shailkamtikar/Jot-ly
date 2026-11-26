import type { Page } from './types'

export interface SearchResult {
  page: Page
  score: number
  /** Short text around the first body match (empty if the match was in the title). */
  snippet: string
  /** [start, end) offsets of the match within `snippet`, or null. */
  matchRange: [number, number] | null
}

/** Lower-case and strip diacritics so "cafe" matches "Café". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function pageText(page: Page): string[] {
  const parts: string[] = []
  for (const b of page.blocks) {
    if (b.type === 'audio') parts.push(b.title)
    else if (b.type !== 'unsupported') parts.push(b.content)
  }
  return parts
}

/** Plain substring search (the query is never treated as a regular expression). */
export function searchPages(pages: Page[], query: string, limit = 20): SearchResult[] {
  const q = normalize(query.trim())
  if (!q) return []
  const results: SearchResult[] = []
  for (const page of pages) {
    let score = 0
    if (normalize(page.title).includes(q)) score += 3
    let snippet = ''
    let matchRange: [number, number] | null = null
    for (const text of pageText(page)) {
      const idx = normalize(text).indexOf(q)
      if (idx === -1) continue
      score += 1
      const start = Math.max(0, idx - 30)
      const end = Math.min(text.length, idx + q.length + 50)
      snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
      const offset = start > 0 ? 1 : 0
      matchRange = [idx - start + offset, idx - start + offset + q.length]
      break
    }
    if (score > 0) results.push({ page, score, snippet, matchRange })
  }
  results.sort((a, b) => b.score - a.score || b.page.updatedAt.localeCompare(a.page.updatedAt))
  return results.slice(0, limit)
}
