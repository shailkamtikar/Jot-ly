import { extensionFor, pickMimeType } from './mime'
import { peaksFromSamples } from './peaks'
import { AudioRecorder, RecorderError } from './recorder'

class FakeTrack {
  readyState: 'live' | 'ended' = 'live'
  onended: (() => void) | null = null
  stop() {
    this.readyState = 'ended'
  }
}
class FakeStream {
  tracks = [new FakeTrack()]
  getTracks() {
    return this.tracks as unknown as MediaStreamTrack[]
  }
  getAudioTracks() {
    return this.getTracks()
  }
}

let emitOnStop: Blob[] = []
class FakeRecorder {
  static isTypeSupported = (t: string) => t === 'audio/webm'
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  stream: unknown
  constructor(stream: unknown, _o?: unknown) {
    this.stream = stream
  }
  start() {
    this.state = 'recording'
  }
  pause() {
    this.state = 'paused'
  }
  resume() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    emitOnStop.forEach((b) => this.ondataavailable?.({ data: b }))
    this.onstop?.()
  }
}

function make(opts: { gum?: () => Promise<FakeStream>; now?: () => number; secure?: boolean; maxMs?: number } = {}) {
  const stream = new FakeStream()
  const rec = new AudioRecorder({
    getUserMedia: (opts.gum ?? (async () => stream)) as never,
    MediaRecorderCtor: FakeRecorder as never,
    now: opts.now,
    isSecureContext: opts.secure ?? true,
    maxMs: opts.maxMs,
  })
  return { rec, stream }
}

beforeEach(() => {
  emitOnStop = [new Blob([new Uint8Array(100)], { type: 'audio/webm' })]
})
afterEach(() => vi.useRealTimers())

describe('mime', () => {
  it('picks the first supported type', () => {
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4')
  })
  it('falls back to the browser default when nothing is supported', () => {
    expect(pickMimeType(() => false)).toBe('')
  })
  it('does not throw if the probe throws', () => {
    expect(pickMimeType(() => { throw new Error('x') })).toBe('')
  })
  it('maps extensions', () => {
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm')
    expect(extensionFor('audio/mp4')).toBe('m4a')
  })
})

describe('peaks', () => {
  it('returns normalised values of the requested length', () => {
    const s = new Float32Array(6400).map((_, i) => Math.sin(i / 10) * (i / 6400))
    const p = peaksFromSamples(s, 64)
    expect(p).toHaveLength(64)
    expect(Math.max(...p)).toBe(1)
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0)
  })
  it('handles silence without NaN', () => {
    const p = peaksFromSamples(new Float32Array(1000), 64)
    expect(p.every((v) => v === 0)).toBe(true)
  })
  it('handles empty input', () => {
    expect(peaksFromSamples(new Float32Array(0), 8)).toEqual(new Array(8).fill(0))
  })
})

describe('AudioRecorder', () => {
  it('records and releases the microphone', async () => {
    const { rec, stream } = make()
    await rec.start()
    expect(rec.state).toBe('recording')
    const r = await rec.stop()
    expect(rec.state).toBe('ready')
    expect(r.blob.size).toBe(100)
    expect(stream.tracks[0].readyState).toBe('ended')
  })

  it('excludes paused time from the duration', async () => {
    let t = 0
    const { rec } = make({ now: () => t })
    await rec.start()
    t = 2000
    rec.pause()
    t = 7000
    rec.resume()
    t = 8000
    expect(rec.elapsedMs()).toBe(3000)
    const r = await rec.stop()
    expect(r.durationMs).toBe(3000)
  })

  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['NotFoundError', 'no-microphone'],
    ['NotReadableError', 'busy'],
  ])('maps %s to %s', async (name, code) => {
    const { rec } = make({ gum: async () => { throw Object.assign(new Error('x'), { name }) } })
    await rec.start()
    expect(rec.state).toBe('error')
    expect(rec.error).toBeInstanceOf(RecorderError)
    expect(rec.error?.code).toBe(code)
  })

  it('refuses on an insecure context', async () => {
    const { rec } = make({ secure: false })
    await rec.start()
    expect(rec.error?.code).toBe('insecure-context')
  })

  it('rejects a second concurrent start', async () => {
    const { rec } = make()
    await rec.start()
    await expect(rec.start()).rejects.toMatchObject({ code: 'busy' })
  })

  it('errors on a zero-byte recording', async () => {
    emitOnStop = []
    const { rec, stream } = make()
    await rec.start()
    await expect(rec.stop()).rejects.toMatchObject({ code: 'empty' })
    expect(rec.state).toBe('error')
    expect(stream.tracks[0].readyState).toBe('ended')
  })

  it('cancel stops the microphone and discards data', async () => {
    const { rec, stream } = make()
    await rec.start()
    rec.cancel()
    expect(rec.state).toBe('idle')
    expect(rec.result).toBeNull()
    expect(stream.tracks[0].readyState).toBe('ended')
  })

  it('cancelling while the permission prompt is open releases the stream', async () => {
    let release!: (s: FakeStream) => void
    const stream = new FakeStream()
    const { rec } = make({ gum: () => new Promise<FakeStream>((r) => (release = r)) })
    const started = rec.start()
    rec.cancel()
    release(stream)
    await started
    expect(rec.state).toBe('idle')
    expect(stream.tracks[0].readyState).toBe('ended')
  })

  it('auto-stops at the cap with a valid result', async () => {
    vi.useFakeTimers()
    let t = 0
    const { rec } = make({ now: () => t, maxMs: 1000 })
    await rec.start()
    t = 1500
    await vi.advanceTimersByTimeAsync(300)
    expect(rec.state).toBe('ready')
    expect(rec.result?.durationMs).toBe(1500)
  })

  it('keeps what it has when the microphone is unplugged', async () => {
    const { rec, stream } = make()
    await rec.start()
    stream.tracks[0].onended?.()
    expect(rec.state).toBe('ready')
    expect(rec.result?.blob.size).toBe(100)
  })
})
