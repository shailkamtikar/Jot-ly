import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { extensionFor } from '../audio/mime'
import type { Store } from '../storage/store'
import { blobToBytes } from './blob'
import { uid } from './blocks'
import { validatePage } from './schema'
import { SCHEMA_VERSION, type AudioRecord, type Page } from './types'

export const MAX_BACKUP_BYTES = 200 * 1024 * 1024
const ID_RE = /^[A-Za-z0-9-]{1,64}$/
const AUDIO_PATH_RE = /^audio\/[A-Za-z0-9-]{1,64}\.[a-z0-9]{1,5}$/

interface Manifest {
  app: 'jotly'
  schemaVersion: number
  exportedAt: string
  pages: string[]
  audio: Array<{ id: string; pageId: string; mimeType: string; durationMs: number; file: string }>
}

export async function createBackup(store: Store, pages: Page[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {}
  const manifest: Manifest = { app: 'jotly', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), pages: [], audio: [] }
  for (const page of pages) {
    files[`pages/${page.id}.json`] = strToU8(JSON.stringify(page))
    manifest.pages.push(page.id)
    for (const b of page.blocks) {
      if (b.type !== 'audio') continue
      const rec = await store.getAudio(b.audioId)
      if (!rec) continue
      const file = `audio/${rec.id}.${extensionFor(rec.mimeType)}`
      files[file] = new Uint8Array(await blobToBytes(rec.blob))
      manifest.audio.push({ id: rec.id, pageId: page.id, mimeType: rec.mimeType, durationMs: rec.durationMs, file })
    }
  }
  files['manifest.json'] = strToU8(JSON.stringify(manifest))
  // Audio is already compressed; store it without deflate for speed.
  return zipSync(files, { level: 0 })
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export interface ImportPlan {
  pages: Page[]
  audio: AudioRecord[]
  missingAudio: number
  /** Page ids that already exist locally. */
  conflicts: string[]
}

/** Parse and validate a backup without touching storage. Treats the file as untrusted. */
export function readBackup(bytes: Uint8Array, existingPageIds: Set<string>): ImportPlan {
  if (bytes.byteLength > MAX_BACKUP_BYTES) throw new BackupError('This backup is too large to import (limit 200 MB).')
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    throw new BackupError('This file is not a valid Jotly backup.')
  }
  const manifestRaw = entries['manifest.json']
  if (!manifestRaw) throw new BackupError('This file is not a Jotly backup (manifest missing).')
  let manifest: Manifest
  try {
    manifest = JSON.parse(strFromU8(manifestRaw)) as Manifest
  } catch {
    throw new BackupError('The backup manifest is unreadable.')
  }
  if (manifest.app !== 'jotly') throw new BackupError('This file is not a Jotly backup.')
  if (typeof manifest.schemaVersion !== 'number' || manifest.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('This backup was made by a newer version of Jotly.')
  }

  const pages: Page[] = []
  for (const id of Array.isArray(manifest.pages) ? manifest.pages : []) {
    if (typeof id !== 'string' || !ID_RE.test(id)) continue // ignore hostile ids
    const raw = entries[`pages/${id}.json`]
    if (!raw) continue
    try {
      pages.push(validatePage(JSON.parse(strFromU8(raw))))
    } catch {
      /* skip invalid page */
    }
  }

  const audio: AudioRecord[] = []
  let missingAudio = 0
  for (const a of Array.isArray(manifest.audio) ? manifest.audio : []) {
    if (!a || typeof a.id !== 'string' || !ID_RE.test(a.id) || typeof a.file !== 'string' || !AUDIO_PATH_RE.test(a.file)) continue
    const data = entries[a.file]
    if (!data) {
      missingAudio++
      continue
    }
    const mimeType = typeof a.mimeType === 'string' && a.mimeType.startsWith('audio/') ? a.mimeType : 'audio/webm'
    audio.push({
      id: a.id,
      pageId: typeof a.pageId === 'string' ? a.pageId : '',
      blob: new Blob([data as BlobPart], { type: mimeType }),
      mimeType,
      byteSize: data.byteLength,
      durationMs: typeof a.durationMs === 'number' ? a.durationMs : 0,
    })
  }
  // Count audio blocks whose recording is not in the file.
  const have = new Set(audio.map((a) => a.id))
  for (const p of pages) for (const b of p.blocks) if (b.type === 'audio' && !have.has(b.audioId)) missingAudio++

  return { pages, audio, missingAudio, conflicts: pages.filter((p) => existingPageIds.has(p.id)).map((p) => p.id) }
}

export type ConflictStrategy = 'keep-both' | 'replace' | 'skip'

/** Write a validated plan to storage. Returns the pages that were written. */
export async function applyImport(store: Store, plan: ImportPlan, strategy: ConflictStrategy): Promise<Page[]> {
  const written: Page[] = []
  const conflicts = new Set(plan.conflicts)
  for (const original of plan.pages) {
    let page = original
    const audio = plan.audio.filter((a) => page.blocks.some((b) => b.type === 'audio' && b.audioId === a.id))
    let records = audio
    if (conflicts.has(page.id)) {
      if (strategy === 'skip') continue
      if (strategy === 'keep-both') {
        const newPageId = uid()
        const idMap = new Map(audio.map((a) => [a.id, uid()]))
        page = {
          ...page,
          id: newPageId,
          title: page.title ? `${page.title} (imported)` : 'Imported',
          blocks: page.blocks.map((b) => (b.type === 'audio' && idMap.has(b.audioId) ? { ...b, audioId: idMap.get(b.audioId)! } : b)),
        }
        records = audio.map((a) => ({ ...a, id: idMap.get(a.id)!, pageId: newPageId }))
      }
    }
    for (const rec of records) await store.saveAudio({ ...rec, pageId: page.id })
    await store.savePage(page)
    written.push(page)
  }
  return written
}
