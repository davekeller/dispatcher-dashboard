import type { Severity } from '../alerts/types'

/** Compact recommendations use color only on their one-pixel keyline. */
export function recommendationBorder(severity: Severity | 'none'): string {
  if (severity === 'critical' || severity === 'act_now') return 'border-act-now-fill/55'
  if (severity === 'watch') return 'border-watch-fill/55'
  return 'border-line/60'
}
