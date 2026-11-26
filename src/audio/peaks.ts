import { blobToBytes } from '../lib/blob'
export const PEAK_BARS = 64

/** Reduce raw samples to `bars` normalised peak values in 0..1. Pure. */
export function peaksFromSamples(samples: Float32Array, bars = PEAK_BARS): number[] {
  const out = new Array<number>(bars).fill(0)
  if (samples.length === 0) return out
  const size = Math.max(1, Math.floor(samples.length / bars))
  let max = 0
  for (let i = 0; i < bars; i++) {
    let peak = 0
    const start = i * size
    const end = i === bars - 1 ? samples.length : Math.min(samples.length, start + size)
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j])
      if (v > peak) peak = v
    }
    out[i] = peak
    if (peak > max) max = peak
  }
  if (max < 1e-4) return out.map(() => 0) // silence: avoid dividing noise up to full height
  return out.map((p) => Math.round((p / max) * 100) / 100)
}

/** Decode a recording and measure its waveform. Resolves to null if the browser cannot decode it. */
export async function computePeaks(blob: Blob, bars = PEAK_BARS, timeoutMs = 5000): Promise<number[] | null> {
  const Ctx: typeof AudioContext | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  let ctx: AudioContext | null = null
  try {
    ctx = new Ctx()
    const buf = await blobToBytes(blob)
    const decoded = await Promise.race([
      ctx.decodeAudioData(buf),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('decode timeout')), timeoutMs)),
    ])
    return peaksFromSamples(decoded.getChannelData(0), bars)
  } catch {
    return null
  } finally {
    ctx?.close().catch(() => {})
  }
}
