import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../../lib/blocks'
import { MAX_RECORDING_MS, WARN_RECORDING_MS, type RecorderErrorCode, type RecordingResult } from '../../audio/recorder'
import { useRecorder } from '../../audio/useRecorder'
import { MicIcon, PauseIcon, PlayIcon, StopIcon } from '../icons'

const ERROR_HELP: Record<RecorderErrorCode, string> = {
  'permission-denied': 'Microphone access is blocked. Allow it from the lock icon in your address bar, then try again.',
  'no-microphone': 'No microphone was found. Connect one and try again.',
  unsupported: 'This browser can’t record audio. Try a current version of Chrome, Edge, Firefox or Safari.',
  'insecure-context': 'Recording only works on a secure (HTTPS) page.',
  busy: 'The microphone is being used by another app. Close it and try again.',
  empty: 'Nothing was recorded. Check your microphone and try again.',
  unknown: 'Something went wrong while recording. Please try again.',
}

/** Inline recorder: explain → record → preview → add to note. */
export function RecorderCard({
  onSave,
  onClose,
}: {
  /** Persist the recording. Should throw (with a readable message) if it cannot be saved. */
  onSave: (result: RecordingResult) => Promise<void>
  onClose: () => void
}) {
  const rec = useRecorder()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const startRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    startRef.current?.focus()
  }, [])

  useEffect(() => {
    if (rec.state !== 'ready' || !rec.result) return
    const url = URL.createObjectURL(rec.result.blob)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreviewUrl('')
    }
  }, [rec.state, rec.result])

  const live = rec.state === 'recording' || rec.state === 'paused'
  const nearCap = rec.elapsedMs >= WARN_RECORDING_MS

  function close() {
    rec.reset()
    onClose()
  }

  async function save() {
    if (!rec.result) return
    setSaving(true)
    setSaveError('')
    try {
      await onSave(rec.result)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the recording. Your recording is still here — try again.')
      setSaving(false)
    }
  }

  const announce =
    rec.state === 'recording' ? 'Recording' : rec.state === 'paused' ? 'Recording paused' : rec.state === 'ready' ? 'Recording ready' : rec.state === 'requesting' ? 'Waiting for microphone permission' : ''

  return (
    <section
      aria-label="Record an audio sticker"
      data-testid="recorder"
      className="my-2 rounded-md border border-line-strong bg-surface p-5 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !live) close()
      }}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {rec.state === 'idle' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Jotly will ask to use your microphone. Audio stays on this device and recording only happens while you see the red indicator.
          </p>
          <div className="flex gap-2">
            <button ref={startRef} type="button" onClick={rec.start} className="flex items-center gap-2 rounded-[3px] bg-rec px-4 py-2.5 label text-white">
              <MicIcon width={16} height={16} /> Start recording
            </button>
            <button type="button" onClick={close} className="rounded-[3px] border border-line-strong px-4 py-2.5 label hover:bg-sunken">
              Cancel
            </button>
          </div>
        </div>
      )}

      {rec.state === 'requesting' && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Waiting for microphone permission… check your browser’s prompt.</p>
          <button type="button" onClick={close} className="rounded-[3px] border border-line-strong px-3 py-2 label hover:bg-sunken">
            Cancel
          </button>
        </div>
      )}

      {live && !confirmDiscard && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full bg-rec ${rec.state === 'recording' ? 'rec-dot' : 'opacity-40'}`} />
            <span className="text-sm font-medium">{rec.state === 'recording' ? 'Recording' : 'Paused'}</span>
          </span>
          <span className="font-mono text-lg tabular-nums" data-testid="rec-timer" aria-label={`Elapsed ${formatDuration(rec.elapsedMs)}`}>
            {formatDuration(rec.elapsedMs)}
          </span>
          {nearCap && (
            <span className="text-xs text-danger">
              Stops automatically at {formatDuration(MAX_RECORDING_MS)}
            </span>
          )}
          <span className="ml-auto flex gap-2">
            {rec.state === 'recording' ? (
              <button type="button" onClick={rec.pause} className="flex items-center gap-1.5 rounded-[3px] border border-line-strong px-3 py-2 label hover:bg-sunken">
                <PauseIcon width={14} height={14} /> Pause
              </button>
            ) : (
              <button type="button" onClick={rec.resume} className="flex items-center gap-1.5 rounded-[3px] border border-line-strong px-3 py-2 label hover:bg-sunken">
                <PlayIcon width={14} height={14} /> Resume
              </button>
            )}
            <button type="button" onClick={rec.stop} className="flex items-center gap-1.5 rounded-[3px] bg-fg px-3 py-2 label text-bg">
              <StopIcon width={14} height={14} /> Stop
            </button>
            <button type="button" onClick={() => setConfirmDiscard(true)} className="rounded-[3px] px-3 py-2 label text-muted hover:text-fg">
              Cancel
            </button>
          </span>
        </div>
      )}

      {live && confirmDiscard && (
        <div role="alertdialog" aria-label="Discard recording?" className="flex flex-wrap items-center gap-3">
          <p className="text-sm">Discard this recording?</p>
          <span className="ml-auto flex gap-2">
            <button type="button" autoFocus onClick={() => setConfirmDiscard(false)} className="rounded-[3px] border border-line-strong px-3 py-2 label hover:bg-sunken">
              Keep recording
            </button>
            <button type="button" onClick={close} className="rounded-[3px] bg-danger px-3 py-2 label text-white">
              Discard
            </button>
          </span>
        </div>
      )}

      {rec.state === 'finalizing' && <p className="text-sm text-muted">Finishing up…</p>}

      {rec.state === 'ready' && rec.result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Preview · {formatDuration(rec.result.durationMs)}</span>
          </div>
          {previewUrl && <audio controls src={previewUrl} className="w-full" aria-label="Preview your recording" data-testid="preview-audio" />}
          {saveError && (
            <p role="alert" className="text-sm text-danger">
              {saveError}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="rounded-[3px] bg-accent px-4 py-2.5 label text-accent-fg" data-testid="add-to-note">
              {saving ? 'Adding…' : saveError ? 'Try again' : 'Add to note'}
            </button>
            <button type="button" disabled={saving} onClick={close} className="rounded-[3px] border border-line-strong px-4 py-2.5 label hover:bg-sunken">
              Discard
            </button>
          </div>
        </div>
      )}

      {rec.state === 'error' && rec.error && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-danger">
            {ERROR_HELP[rec.error.code]}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => rec.reset()} className="rounded-[3px] bg-accent px-4 py-2.5 label text-accent-fg">
              Try again
            </button>
            <button type="button" onClick={close} className="rounded-[3px] border border-line-strong px-4 py-2.5 label hover:bg-sunken">
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
