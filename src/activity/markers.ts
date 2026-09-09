import { drivingReachedAt } from '../hos/compute'
import { ACT_NOW_MIN, LIMIT_MIN } from '../hos/constants'
import type { DriverView } from '../store/view'

// What the shift did around her, derived and never logged, on the same principle as alerts:
// the same views, the same clock. Driving minutes only grow, so a limit crossing stays on
// the timeline all shift; a dark marker resolves when the truck reports in, and the
// reconnect card keeps how long it was dark.

export type MarkerKind = 'went_dark' | 'act_now' | 'over'

export interface Marker {
  id: string
  kind: MarkerKind
  at: number
  driverId: string
  label: string
  /** The crossing is projected from a stale ping, so the moment carries a tilde. */
  estimated: boolean
}

export function contextMarkers(views: DriverView[], now: number): Marker[] {
  const out: Marker[] = []
  for (const v of views) {
    const { id, name } = v.driver
    const estimated = v.staleness !== 'fresh'
    if (v.staleness === 'offline') out.push({ id: `went_dark:${id}`, kind: 'went_dark', at: v.lastPingAt, driverId: id, label: `${name} stopped pinging`, estimated: false })
    const actNow = drivingReachedAt(v.driver, LIMIT_MIN - ACT_NOW_MIN, now)
    if (actNow !== undefined && actNow <= now) out.push({ id: `act_now:${id}`, kind: 'act_now', at: actNow, driverId: id, label: `${name} entered Act now`, estimated })
    const over = drivingReachedAt(v.driver, LIMIT_MIN, now)
    if (over !== undefined && over <= now) out.push({ id: `over:${id}`, kind: 'over', at: over, driverId: id, label: `${name} went over the limit`, estimated })
  }
  return out.sort((a, b) => b.at - a.at)
}
