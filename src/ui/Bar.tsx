import type { Tone } from './tones'

/** A 0–1 progress bar. Used for drive time on the 11h scale and route progress. */
export default function Bar({ value, tone, className = '', marker }: { value: number; tone: Tone; className?: string; marker?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-well ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-300 ${tone.fill}`} style={{ width: `${pct}%` }} />
      {marker !== undefined && <div className="absolute inset-y-0 w-px bg-ink/60" style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }} />}
    </div>
  )
}
