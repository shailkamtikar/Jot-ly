export type TextBlockType = 'paragraph' | 'heading' | 'bullet'

export interface TextBlock {
  id: string
  type: TextBlockType
  content: string
}

/** A block of a type this version does not understand. Kept so data is never silently dropped. */
export interface UnsupportedBlock {
  id: string
  type: 'unsupported'
  raw: unknown
}

export type Block = TextBlock | UnsupportedBlock

/**
 * A voice recording that floats on the page like a physical sticker.
 * It is attached to a block (`anchorId`) so it travels with the text it explains,
 * and can be dropped anywhere around it (`x` as a fraction of the page width, `dy` in px).
 */
export interface Sticker {
  id: string
  audioId: string
  title: string
  durationMs: number
  /** Normalised peaks (0..1) measured from the recording. */
  peaks: number[]
  /** Left edge as a fraction (0..1) of the page canvas width. */
  x: number
  /** Block this sticker is attached to, or null for "relative to the top of the page". */
  anchorId: string | null
  /** Vertical offset in px from the top of the anchor block (or of the page when `anchorId` is null). */
  dy: number
}

export const SCHEMA_VERSION = 2

export interface Page {
  id: string
  title: string
  blocks: Block[]
  stickers: Sticker[]
  createdAt: string
  updatedAt: string
  schemaVersion: number
}

export interface AudioRecord {
  id: string
  pageId: string
  blob: Blob
  mimeType: string
  byteSize: number
  durationMs: number
}
