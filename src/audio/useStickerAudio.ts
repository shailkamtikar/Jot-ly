import { useCallback, useEffect, useRef, useState } from 'react'
import type { Sticker } from '../lib/types'
import { useWorkspace } from '../state/workspace'
import { computePeaks } from './peaks'
import { claimPlayback, releasePlayback, SPEEDS } from './playback'

export type StickerAudioStatus = 'idle' | 'loading' | 'ready' | 'missing'

/** Lazy playback for one sticker: loads the recording on first use, keeps one media element, frees it on unmount. */
export function useStickerAudio(sticker: Sticker, pageId: string) {
  const { getAudio, updateSticker, pushToast } = useWorkspace()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const loading = useRef<Promise<HTMLAudioElement | null> | null>(null)
  const rafRef = useRef(0)
  const stickerRef = useRef(sticker)
  stickerRef.current = sticker

  const [status, setStatus] = useState<StickerAudioStatus>('idle')
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const tick = useCallback(() => {
    const a = audioRef.current
    const d = stickerRef.current.durationMs
    if (a && d > 0) setProgress(Math.min(1, (a.currentTime * 1000) / d))
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const ensureAudio = useCallback((): Promise<HTMLAudioElement | null> => {
    if (audioRef.current) return Promise.resolve(audioRef.current)
    if (loading.current) return loading.current
    setStatus('loading')
    loading.current = (async () => {
      const rec = await getAudio(stickerRef.current.audioId).catch(() => undefined)
      if (!rec) {
        setStatus('missing')
        loading.current = null
        return null
      }
      blobRef.current = rec.blob
      const url = URL.createObjectURL(rec.blob)
      urlRef.current = url
      const a = new Audio(url)
      a.preload = 'auto'
      const id = stickerRef.current.id
      a.onplay = () => {
        claimPlayback(id, pause)
        setEnded(false)
        setPlaying(true)
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(tick)
      }
      a.onpause = () => {
        setPlaying(false)
        cancelAnimationFrame(rafRef.current)
        releasePlayback(id)
      }
      a.onended = () => {
        setPlaying(false)
        setEnded(true)
        cancelAnimationFrame(rafRef.current)
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
      if (stickerRef.current.peaks.length === 0) {
        computePeaks(rec.blob).then((peaks) => peaks && updateSticker(pageId, id, { peaks }))
      }
      return a
    })()
    return loading.current
  }, [getAudio, pageId, pause, tick, updateSticker])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      audioRef.current?.pause()
      audioRef.current = null
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
      releasePlayback(stickerRef.current.id)
    },
    [],
  )

  const toggle = useCallback(async () => {
    const a = await ensureAudio()
    if (!a) return
    a.playbackRate = SPEEDS[speedIdx]
    if (a.paused) await a.play().catch(() => pushToast({ message: 'This browser couldn’t play that recording.', tone: 'error' }))
    else a.pause()
  }, [ensureAudio, pushToast, speedIdx])

  const seek = useCallback(
    async (fraction: number) => {
      const a = await ensureAudio()
      if (!a) return
      a.currentTime = (fraction * stickerRef.current.durationMs) / 1000
      setProgress(fraction)
    },
    [ensureAudio],
  )

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }, [speedIdx])

  const getBlob = useCallback(async () => {
    await ensureAudio()
    return blobRef.current
  }, [ensureAudio])

  return { status, playing, ended, progress, speed: SPEEDS[speedIdx], toggle, seek, cycleSpeed, pause, getBlob }
}
