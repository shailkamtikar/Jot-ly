import { useRef } from 'react'

const FALLBACK = Array.from({ length: 48 }, (_, i) => 0.18 + 0.1 * Math.abs(Math.sin(i * 0.9)))

/** Measured waveform with progress. Acts as a slider: click/drag or use ←/→ (5 s), Home/End. */
export function Waveform({
  peaks,
  progress,
  durationMs,
  disabled,
  onSeek,
  label,
}: {
  peaks: number[]
  /** 0..1 */
  progress: number
  durationMs: number
  disabled?: boolean
  onSeek: (fraction: number) => void
  label: string
}) {
  const bars = peaks.length > 0 ? peaks : FALLBACK
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const fractionFromEvent = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, Math.round(durationMs / 1000))}
      aria-valuenow={Math.round((progress * durationMs) / 1000)}
      aria-valuetext={`${Math.round((progress * durationMs) / 1000)} of ${Math.round(durationMs / 1000)} seconds`}
      aria-disabled={disabled}
      data-testid="waveform"
      className="flex h-10 flex-1 touch-none select-none items-center gap-[2px]"
      onPointerDown={(e) => {
        if (disabled) return
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        onSeek(fractionFromEvent(e.clientX))
      }}
      onPointerMove={(e) => dragging.current && onSeek(fractionFromEvent(e.clientX))}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (disabled || durationMs <= 0) return
        const step = 5000 / durationMs
        if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + step))
        else if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - step))
        else if (e.key === 'Home') onSeek(0)
        else if (e.key === 'End') onSeek(1)
        else return
        e.preventDefault()
      }}
    >
      {bars.map((p, i) => {
        const played = (i + 0.5) / bars.length <= progress
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`flex-1 rounded-full transition-colors ${played ? 'bg-accent' : 'bg-fg/20'}`}
            style={{ height: `${Math.max(12, p * 100)}%` }}
          />
        )
      })}
    </div>
  )
}
