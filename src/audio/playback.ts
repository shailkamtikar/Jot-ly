/** Only one sticker plays at a time: starting one pauses whichever was playing. */
let current: { id: string; pause: () => void } | null = null

export function claimPlayback(id: string, pause: () => void): void {
  if (current && current.id !== id) current.pause()
  current = { id, pause }
}

export function releasePlayback(id: string): void {
  if (current?.id === id) current = null
}

export const SPEEDS = [1, 1.5, 2] as const
