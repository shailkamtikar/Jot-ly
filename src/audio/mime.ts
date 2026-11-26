const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'] as const

/** Pick the first container the browser can record. Feature detection only, no user-agent sniffing. */
export function pickMimeType(isSupported: (t: string) => boolean): string {
  for (const t of CANDIDATES) {
    try {
      if (isSupported(t)) return t
    } catch {
      /* try the next candidate */
    }
  }
  return ''
}

export function extensionFor(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes('webm')) return 'webm'
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('wav')) return 'wav'
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  return 'audio'
}
