import type { Fleet, StopStatus } from './types'

/** The generated fleet is a whole simulated day: every stop carries the time the driver will
 *  reach it and leave it. This sets each stop's status from the clock, so the world moves
 *  while the planted scenarios (whose pending stops carry no times) hold still for the demo.
 *  Returns the same object when nothing changed, so memos and undo stay cheap. */
export function materialize(fleet: Fleet, now: number): Fleet {
  let changed = false
  const routes = fleet.routes.map((r) => {
    let routeChanged = false
    const stops = r.stops.map((s) => {
      if (s.status === 'unassigned' || s.arrivedAt === undefined || s.departedAt === undefined) return s
      const status: StopStatus = s.departedAt <= now ? (s.outcome === 'failed' ? 'failed' : 'done') : s.arrivedAt <= now ? 'in_progress' : 'pending'
      if (status === s.status) return s
      routeChanged = true
      return { ...s, status }
    })
    if (!routeChanged) return r
    changed = true
    return { ...r, stops }
  })
  return changed ? { ...fleet, routes } : fleet
}
