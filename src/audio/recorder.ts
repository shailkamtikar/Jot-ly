import { pickMimeType } from './mime'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'finalizing' | 'ready' | 'error'

export type RecorderErrorCode =
  | 'permission-denied'
  | 'no-microphone'
  | 'unsupported'
  | 'insecure-context'
  | 'busy'
  | 'empty'
  | 'unknown'

export class RecorderError extends Error {
  readonly code: RecorderErrorCode
  constructor(code: RecorderErrorCode, message: string) {
    super(message)
    this.name = 'RecorderError'
    this.code = code
  }
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
  durationMs: number
}

export interface RecorderDeps {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  MediaRecorderCtor?: typeof MediaRecorder
  now?: () => number
  isSecureContext?: boolean
  /** Hard cap on one recording. */
  maxMs?: number
}

export const MAX_RECORDING_MS = 5 * 60 * 1000
export const WARN_RECORDING_MS = 4.5 * 60 * 1000

function mapGumError(e: unknown): RecorderError {
  const name = (e as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new RecorderError('permission-denied', 'Microphone access was blocked.')
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new RecorderError('no-microphone', 'No microphone was found.')
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return new RecorderError('busy', 'The microphone is in use by another app.')
  }
  return new RecorderError('unknown', 'Could not start recording.')
}

/**
 * Framework-independent microphone recorder.
 * idle → requesting → recording ⇄ paused → finalizing → ready | error
 */
export class AudioRecorder {
  state: RecorderState = 'idle'
  error: RecorderError | null = null
  result: RecordingResult | null = null

  private listeners = new Set<() => void>()
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private mimeType = ''
  private accumulatedMs = 0
  private runningSince: number | null = null
  private capTimer: ReturnType<typeof setInterval> | null = null
  private stopWaiters: Array<(r: RecordingResult) => void> = []
  private stopRejecters: Array<(e: unknown) => void> = []
  private readonly deps: Required<Omit<RecorderDeps, 'getUserMedia' | 'MediaRecorderCtor'>> &
    Pick<RecorderDeps, 'getUserMedia' | 'MediaRecorderCtor'>

  constructor(deps: RecorderDeps = {}) {
    this.deps = {
      now: deps.now ?? (() => performance.now()),
      isSecureContext: deps.isSecureContext ?? (typeof window !== 'undefined' ? window.isSecureContext : true),
      maxMs: deps.maxMs ?? MAX_RECORDING_MS,
      getUserMedia: deps.getUserMedia,
      MediaRecorderCtor: deps.MediaRecorderCtor,
    }
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private set(state: RecorderState) {
    this.state = state
    this.listeners.forEach((l) => l())
  }

  /** Elapsed recording time, excluding paused time. */
  elapsedMs(): number {
    return this.accumulatedMs + (this.runningSince != null ? this.deps.now() - this.runningSince : 0)
  }

  async start(): Promise<void> {
    if (this.state !== 'idle') throw new RecorderError('busy', 'A recording is already in progress.')
    this.error = null
    this.result = null
    this.chunks = []
    this.accumulatedMs = 0
    this.runningSince = null

    if (!this.deps.isSecureContext) return this.fail(new RecorderError('insecure-context', 'Recording needs a secure (HTTPS) page.'))
    const Ctor = this.deps.MediaRecorderCtor ?? (typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined)
    const gum = this.deps.getUserMedia ?? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
    if (!Ctor || !gum) return this.fail(new RecorderError('unsupported', 'This browser cannot record audio.'))

    this.set('requesting')
    let stream: MediaStream
    try {
      stream = await gum({ audio: true })
    } catch (e) {
      return this.fail(mapGumError(e))
    }
    // The user may have cancelled while the permission prompt was open.
    if ((this.state as RecorderState) !== 'requesting') {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    this.stream = stream

    try {
      this.mimeType = pickMimeType((t) => Ctor.isTypeSupported?.(t) ?? false)
      const rec = this.mimeType ? new Ctor(stream, { mimeType: this.mimeType }) : new Ctor(stream)
      this.recorder = rec
      this.mimeType = rec.mimeType || this.mimeType
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data)
      }
      rec.onstop = () => this.finalize()
      rec.onerror = () => this.fail(new RecorderError('unknown', 'Recording failed.'))
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => {
          // Microphone unplugged or permission revoked: keep what we have.
          if (this.state === 'recording' || this.state === 'paused') this.stopInternal()
        }
      })
      rec.start(1000)
    } catch {
      return this.fail(new RecorderError('unsupported', 'Could not start the recorder.'))
    }

    this.runningSince = this.deps.now()
    this.capTimer = setInterval(() => {
      if (this.state === 'recording' && this.elapsedMs() >= this.deps.maxMs) this.stopInternal()
    }, 250)
    this.set('recording')
  }

  pause(): void {
    if (this.state !== 'recording' || !this.recorder) return
    this.recorder.pause()
    this.accumulatedMs = this.elapsedMs()
    this.runningSince = null
    this.set('paused')
  }

  resume(): void {
    if (this.state !== 'paused' || !this.recorder) return
    this.recorder.resume()
    this.runningSince = this.deps.now()
    this.set('recording')
  }

  /** Finish the recording. Resolves once the final data chunk has been collected. */
  stop(): Promise<RecordingResult> {
    return new Promise<RecordingResult>((resolve, reject) => {
      if (this.state === 'ready' && this.result) return resolve(this.result)
      if (this.state !== 'recording' && this.state !== 'paused') {
        return reject(new RecorderError('busy', 'Nothing is being recorded.'))
      }
      this.stopWaiters.push(resolve)
      this.stopRejecters.push(reject)
      this.stopInternal()
    })
  }

  private stopInternal() {
    if (!this.recorder || (this.state !== 'recording' && this.state !== 'paused')) return
    this.accumulatedMs = this.elapsedMs()
    this.runningSince = null
    this.set('finalizing')
    try {
      this.recorder.stop() // onstop fires after the final dataavailable event
    } catch {
      this.finalize()
    }
  }

  private finalize() {
    this.clearCap()
    this.releaseStream()
    const size = this.chunks.reduce((n, c) => n + c.size, 0)
    if (size === 0) return this.fail(new RecorderError('empty', 'Nothing was recorded.'))
    const type = this.mimeType || this.chunks[0]?.type || 'audio/webm'
    this.result = { blob: new Blob(this.chunks, { type }), mimeType: type, durationMs: Math.round(this.accumulatedMs) }
    this.chunks = []
    this.set('ready')
    this.stopWaiters.forEach((w) => w(this.result!))
    this.stopWaiters = []
    this.stopRejecters = []
  }

  /** Abort: stop the microphone and discard everything. */
  cancel(): void {
    this.clearCap()
    if (this.recorder) {
      this.recorder.ondataavailable = null
      this.recorder.onstop = null
      this.recorder.onerror = null
      try {
        if (this.recorder.state !== 'inactive') this.recorder.stop()
      } catch {
        /* already stopped */
      }
    }
    this.releaseStream()
    this.recorder = null
    this.chunks = []
    this.result = null
    this.accumulatedMs = 0
    this.runningSince = null
    this.error = null
    this.stopRejecters.forEach((r) => r(new RecorderError('busy', 'Recording cancelled.')))
    this.stopWaiters = []
    this.stopRejecters = []
    this.set('idle')
  }

  private fail(err: RecorderError): void {
    this.clearCap()
    this.releaseStream()
    this.error = err
    this.stopRejecters.forEach((r) => r(err))
    this.stopWaiters = []
    this.stopRejecters = []
    this.set('error')
  }

  private clearCap() {
    if (this.capTimer) clearInterval(this.capTimer)
    this.capTimer = null
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}
