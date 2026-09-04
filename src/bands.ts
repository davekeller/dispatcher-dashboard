import type { Severity } from './alerts/types'
import type { DriverView } from './store/view'

export type Band = 'act_now' | 'watch' | 'offline' | 'break' | 'clear'

// Column order on the board and in the status filter. On break sits before Offline because
// the Offline band only holds dark-but-clear drivers; anyone dark near the limit is in Act now.
export const BAND_ORDER: Band[] = ['act_now', 'watch', 'break', 'offline', 'clear']

export const BAND_LABEL: Record<Band, string> = {
  act_now: 'Act now',
  watch: 'Watch',
  offline: 'Offline',
  break: 'On break',
  clear: 'Clear',
}

/** Band comes from the driver's top alert severity, then duty status. Offline inside the
 *  watch window fires at act-now severity upstream, so it lands in Act now with a hollow
 *  marker; the Offline band holds only dark drivers whose last-known HOS is clear. */
export function bandOf(v: DriverView, top: Severity | 'none'): Band {
  if (top === 'critical' || top === 'act_now') return 'act_now'
  if (v.staleness === 'offline') return 'offline' // before watch: the dark-but-clear driver's own band
  if (top === 'watch') return 'watch'
  if (v.status === 'on_break') return 'break'
  return 'clear'
}
