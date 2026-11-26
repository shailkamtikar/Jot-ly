import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { claimPlayback, releasePlayback, SPEEDS } from '../../audio/playback'
import { extensionFor } from '../../audio/mime'
import { computePeaks } from '../../audio/peaks'
import { downloadBlob, slugify } from '../../lib/export'
import { formatDuration } from '../../lib/blocks'
import type { AudioBlock } from '../../lib/types'
import { useTheme } from '../../state/theme'
import { useWorkspace } from '../../state/workspace'
import { DownloadIcon, PauseIcon, PlayIcon, TrashIcon } from '../icons'
import SpotlightCard from '../reactbits/SpotlightCard'
import { Waveform } from './Waveform'

const MAX_TITLE = 80

function AudioBlockViewImpl({ block, pageId }: { block: AudioBlock; pageId: string }) {
  const { getAudio, updatePage, removeSticker, pushToast } = useWorkspace()
  const { resolved } = useTheme()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const loading = useRef<Promise<HTMLAudioElement | null> | null>(null)
  const rafRef = useRef(0)

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(block.title)

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const stopRaf = () => cancelAnimationFrame(rafRef.current)
  const tick = useCallback(() => {
    const a = audioRef.current
    if (a && block.durationMs > 0) setProgress(Math.min(1, (a.currentTime * 1000) / block.durationMs))
    rafRef.current = requestAnimationFrame(tick)
  }, [block.durationMs])

  // Load the recording lazily, once, on first interaction.
  const ensureAudio = useCallback((): Promise<HTMLAudioElement | null> => {
    if (audioRef.current) return Promise.resolve(audioRef.current)
    if (loading.current) return loading.current
    setStatus('loading')
    loading.current = (async () => {
      const rec = await getAudio(block.audioId).catch(() => undefined)
      if (!rec) {
        setStatus('missing')
        return null
      }
      blobRef.current = rec.blob
      const url = URL.createObjectURL(rec.blob)
      urlRef.current = url
      const a = new Audio(url)
      a.preload = 'auto'
      a.onplay = () => {
        claimPlayback(block.id, pause)
        setPlaying(true)
        stopRaf()
        rafRef.current = requestAnimationFrame(tick)
      }
      a.onpause = () => {
        setPlaying(false)
        stopRaf()
        releasePlayback(block.id)
      }
      a.onended = () => {
        setPlaying(false)
        stopRaf()
        setProgress(0)
        a.currentTime = 0
      }
      // MediaRecorder WebM files report an infinite duration until the end has been seen once.
      a.onloadedmetadata = () => {
        if (a.duration === Infinity) {
          a.currentTime = 1e101
          a.ontimeupdate = () => {
            a.ontimeupdate = null
            a.currentTime = 0
          }
        }
      }
      audioRef.current = a
      setStatus('ready')
      // Stickers made before waveforms existed get one measured on first play.
      if (block.peaks.length === 0) {
        computePeaks(rec.blob).then((peaks) => {
          if (peaks) updatePage(pageId, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === block.id && b.type === 'audio' ? { ...b, peaks } : b)) }))
        })
      }
      return a
    })()
    return loading.current
  }, [block.audioId, block.id, block.peaks.length, getAudio, pageId, pause, tick, updatePage])

  // Free the media element and its object URL when the card goes away.
  useEffect(
    () => () => {
      stopRaf()
      audioRef.current?.pause()
      audioRef.current = null
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
      releasePlayback(block.id)
    },
    [block.id],
  )

  async function toggle() {
    const a = await ensureAudio()
    if (!a) return
    a.playbackRate = SPEEDS[speedIdx]
    if (a.paused) await a.play().catch(() => pushToast({ message: 'This browser couldn’t play that recording.', tone: 'error' }))
    else a.pause()
  }

  async function seek(fraction: number) {
    const a = await ensureAudio()
    if (!a) return
    a.currentTime = (fraction * block.durationMs) / 1000
    setProgress(fraction)
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  function commitTitle(save: boolean) {
    setEditing(false)
    if (!save) return setDraft(block.title)
    const title = draft.trim().slice(0, MAX_TITLE) || 'Voice note'
    setDraft(title)
    if (title !== block.title) {
      updatePage(pageId, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === block.id && b.type === 'audio' ? { ...b, title } : b)) }), { immediate: true })
    }
  }

  async function download() {
    const a = await ensureAudio()
    if (!a || !blobRef.current) return
    downloadBlob(blobRef.current, `${slugify(block.title)}.${extensionFor(blobRef.current.type)}`)
  }

  const missing = status === 'missing'

  return (
    <SpotlightCard theme={resolved} className="!rounded-2xl !p-3" intensity={0.12} spotlightSize={200} data-testid="audio-block">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={toggle}
          disabled={missing}
          aria-label={playing ? `Pause ${block.title}` : `Play ${block.title}`}
          data-testid="play"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-sm transition-transform active:scale-95"
        >
          {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
        </button>

        <div className="flex min-w-0 flex-1 basis-44 flex-col">
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                autoFocus
                value={draft}
                maxLength={200}
                aria-label="Sticker name"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitTitle(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle(true)
                  if (e.key === 'Escape') commitTitle(false)
                }}
                className="min-w-0 flex-1 rounded border border-accent bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(block.title)
                  setEditing(true)
                }}
                title="Rename"
                data-testid="sticker-title"
                className="min-w-0 truncate rounded px-1.5 py-0.5 text-left text-sm font-medium hover:bg-sunken"
              >
                {block.title}
              </button>
            )}
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{formatDuration(block.durationMs)}</span>
          </div>
          {missing ? (
            <p className="px-1.5 text-xs text-danger">Recording unavailable</p>
          ) : (
            <Waveform peaks={block.peaks} progress={progress} durationMs={block.durationMs} onSeek={seek} label={`Playback position for ${block.title}`} />
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Playback speed ${SPEEDS[speedIdx]}x. Click to change`}
            className="w-10 rounded-md px-1 py-1.5 text-xs font-medium tabular-nums text-muted hover:bg-sunken hover:text-fg"
            data-testid="speed"
          >
            {SPEEDS[speedIdx]}×
          </button>
          <button type="button" onClick={download} disabled={missing} aria-label={`Download ${block.title}`} className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-fg">
            <DownloadIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              audioRef.current?.pause()
              removeSticker(pageId, block.id)
            }}
            aria-label={`Delete ${block.title}`}
            data-testid="delete-sticker"
            className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-danger"
          >
            <TrashIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </SpotlightCard>
  )
}

export const AudioBlockView = memo(AudioBlockViewImpl)
