import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AudioRecorder, type RecorderDeps, type RecorderError, type RecorderState, type RecordingResult } from './recorder'

export interface UseRecorder {
  state: RecorderState
  error: RecorderError | null
  result: RecordingResult | null
  elapsedMs: number
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  /** Discard everything and return to idle. */
  reset: () => void
}

export function useRecorder(deps?: RecorderDeps): UseRecorder {
  const ref = useRef<AudioRecorder | null>(null)
  if (!ref.current) ref.current = new AudioRecorder(deps)
  const rec = ref.current

  const state = useSyncExternalStore(
    useCallback((cb) => rec.subscribe(cb), [rec]),
    () => rec.state,
  )

  const [elapsedMs, setElapsed] = useState(0)
  useEffect(() => {
    if (state !== 'recording') {
      setElapsed(rec.elapsedMs())
      return
    }
    const t = setInterval(() => setElapsed(rec.elapsedMs()), 200)
    return () => clearInterval(t)
  }, [state, rec])

  // Always release the microphone when the component goes away.
  useEffect(() => () => rec.cancel(), [rec])

  return {
    state,
    error: rec.error,
    result: rec.result,
    elapsedMs,
    start: () => void rec.start().catch(() => {}),
    pause: () => rec.pause(),
    resume: () => rec.resume(),
    stop: () => void rec.stop().catch(() => {}),
    reset: () => rec.cancel(),
  }
}
