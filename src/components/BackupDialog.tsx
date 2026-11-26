import { useEffect, useRef, useState } from 'react'
import { applyImport, BackupError, createBackup, readBackup, type ConflictStrategy, type ImportPlan } from '../lib/backup'
import { blobToBytes } from '../lib/blob'
import { downloadBlob } from '../lib/export'
import { storageEstimate } from '../storage'
import { useWorkspace } from '../state/workspace'
import { Modal } from './Modal'

export function BackupDialog({ onClose }: { onClose: () => void }) {
  const { pages, store, importPages, pushToast, flush, persisted } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [usage, setUsage] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storageEstimate().then((e) => e && setUsage(`${(e.usage / 1048576).toFixed(1)} MB used`))
  }, [])

  async function doExport() {
    if (!store) return
    setBusy(true)
    setError('')
    try {
      await flush()
      const zip = await createBackup(store, pages)
      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `jotly-backup-${stamp}.zip`)
      pushToast({ message: `Backup of ${pages.length} page${pages.length === 1 ? '' : 's'} downloaded` })
      onClose()
    } catch {
      setError('Could not create the backup.')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const bytes = new Uint8Array(await blobToBytes(file))
      const p = readBackup(bytes, new Set(pages.map((x) => x.id)))
      if (p.pages.length === 0) throw new BackupError('No pages were found in this backup.')
      if (p.conflicts.length === 0) await finish(p, 'keep-both')
      else setPlan(p)
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'Could not read this file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function finish(p: ImportPlan, strategy: ConflictStrategy) {
    if (!store) return
    setBusy(true)
    try {
      const written = await applyImport(store, p, strategy)
      importPages(written)
      const warn = p.missingAudio ? ` ${p.missingAudio} recording${p.missingAudio === 1 ? ' was' : 's were'} missing from the file.` : ''
      pushToast({ message: `Imported ${written.length} page${written.length === 1 ? '' : 's'}.${warn}` })
      onClose()
    } catch {
      setError('Import failed. Nothing was changed for the failing page.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Backup & restore" onClose={onClose}>
      {!plan ? (
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted">
            Your notes live only in this browser. A backup is a single .zip with every page and recording — keep one somewhere safe.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-autofocus disabled={busy} onClick={doExport} className="rounded-lg bg-accent px-3.5 py-2 font-medium text-accent-fg">
              {busy ? 'Working…' : 'Download backup'}
            </button>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-lg border border-line px-3.5 py-2 hover:bg-sunken">
              Restore from file…
            </button>
            <input ref={fileRef} type="file" accept=".zip,application/zip" className="sr-only" aria-label="Choose a Jotly backup file" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <p className="text-xs text-muted">
            {usage}
            {persisted === true ? ' · Browser will keep this data' : persisted === false ? ' · Browser may clear this data under storage pressure' : ''}
          </p>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <p>
            {plan.conflicts.length} page{plan.conflicts.length === 1 ? '' : 's'} in this backup already exist{plan.conflicts.length === 1 ? 's' : ''} here. What should happen to them?
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-autofocus disabled={busy} onClick={() => finish(plan, 'keep-both')} className="rounded-lg bg-accent px-3.5 py-2 font-medium text-accent-fg">
              Keep both
            </button>
            <button type="button" disabled={busy} onClick={() => finish(plan, 'replace')} className="rounded-lg border border-line px-3.5 py-2 hover:bg-sunken">
              Replace mine
            </button>
            <button type="button" disabled={busy} onClick={() => finish(plan, 'skip')} className="rounded-lg border border-line px-3.5 py-2 hover:bg-sunken">
              Skip them
            </button>
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
