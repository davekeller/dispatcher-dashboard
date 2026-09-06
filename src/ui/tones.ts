import type { Severity } from '../alerts/types'
import type { Band } from '../bands'
import type { Staleness } from '../hos/compute'

// Class names live here as literal strings so Tailwind's scanner sees them and so no
// component invents its own color.
export interface Tone {
  text: string
  fill: string
  soft: string
  border: string
  board?: string
  pattern?: string
}

export const BAND_TONE: Record<Band, Tone> = {
  act_now: { text: 'text-act-now', fill: 'bg-act-now-fill', soft: 'bg-act-now-soft', border: 'border-act-now', board: 'bg-act-now-board' },
  watch: { text: 'text-watch', fill: 'bg-watch-fill', soft: 'bg-watch-soft', border: 'border-watch', board: 'bg-watch-board' },
  offline: { text: 'text-offline', fill: 'bg-offline-fill', soft: 'bg-offline-soft', border: 'border-offline', board: 'bg-offline-board' },
  break: { text: 'text-break', fill: 'bg-break-fill', soft: 'bg-break-soft', border: 'border-break', board: 'bg-break-board' },
  clear: { text: 'text-clear', fill: 'bg-clear-fill', soft: 'bg-clear-soft', border: 'border-clear', board: 'bg-clear-board' },
}

/** Over the limit is the one state that must never be missed: dark red, white text, striped ground. */
export const CRITICAL_TONE: Tone = { text: 'text-on-accent', fill: 'bg-act-now', soft: 'bg-act-now', border: 'border-act-now', pattern: 'critical-alert-stripe' }
export const INFO_TONE: Tone = { text: 'text-muted', fill: 'bg-offline-fill', soft: 'bg-well', border: 'border-line' }
export const LOOKOUT_TONE: Tone = { text: 'text-lookout-strong', fill: 'bg-lookout', soft: 'bg-lookout-soft', border: 'border-lookout' }

export const STALENESS_TONE: Record<Staleness, Tone> = { fresh: BAND_TONE.clear, stale: BAND_TONE.watch, offline: BAND_TONE.offline }

export function severityTone(severity: Severity | 'none'): Tone {
  if (severity === 'critical') return CRITICAL_TONE
  if (severity === 'act_now') return BAND_TONE.act_now
  if (severity === 'watch') return BAND_TONE.watch
  if (severity === 'info') return INFO_TONE
  return BAND_TONE.clear
}
