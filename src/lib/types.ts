export type TextBlockType = 'paragraph' | 'heading' | 'bullet'

export interface TextBlock {
  id: string
  type: TextBlockType
  content: string
}

export interface AudioBlock {
  id: string
  type: 'audio'
  audioId: string
  title: string
  durationMs: number
  /** Normalised peaks (0..1) measured from the recording. */
  peaks: number[]
}

/** A block of a type this version does not understand. Kept so data is never silently dropped. */
export interface UnsupportedBlock {
  id: string
  type: 'unsupported'
  raw: unknown
}

export type Block = TextBlock | AudioBlock | UnsupportedBlock

export const SCHEMA_VERSION = 1

export interface Page {
  id: string
  title: string
  blocks: Block[]
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
