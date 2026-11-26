const PREFIX = '#/p/'

export function pageIdFromHash(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null
  const id = decodeURIComponent(hash.slice(PREFIX.length))
  return id || null
}

export function hashForPage(id: string): string {
  return PREFIX + encodeURIComponent(id)
}
