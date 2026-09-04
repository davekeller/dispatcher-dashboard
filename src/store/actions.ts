import type { Driver, DutySegment, Fleet, Route, Stop, StopOutcome } from '../data/types'
import { currentStatus, projectedFinishAt, remainingStops } from '../hos/compute'
import { CAPACITY_MARGIN_MIN, RESET_MIN } from '../hos/constants'
import { MIN } from '../time/clock'
import type { DriverView } from './view'

// Every mutation is a pure (fleet, args, now) => fleet. The store wraps them with a
// snapshot for undo. The rail and the route file call the same functions.

function routeOf(fleet: Fleet, driverId: string): Route {
  const r = fleet.routes.find((x) => x.driverId === driverId)
  if (!r) throw new Error(`no route for ${driverId}`)
  return r
}

function driverOf(fleet: Fleet, driverId: string): Driver {
  const d = fleet.drivers.find((x) => x.id === driverId)
  if (!d) throw new Error(`no driver ${driverId}`)
  return d
}

function routeWithStop(fleet: Fleet, stopId: string): Route {
  const r = fleet.routes.find((x) => x.stops.some((s) => s.id === stopId))
  if (!r) throw new Error(`no route holds ${stopId}`)
  return r
}

function withRoutes(fleet: Fleet, ...updated: Route[]): Fleet {
  return { ...fleet, routes: fleet.routes.map((r) => updated.find((u) => u.id === r.id) ?? r) }
}

function withDriver(fleet: Fleet, driver: Driver): Fleet {
  return { ...fleet, drivers: fleet.drivers.map((d) => (d.id === driver.id ? driver : d)) }
}

const reseq = (stops: Stop[]): Stop[] => stops.map((s, i) => ({ ...s, seq: i + 1 }))

/** Close whatever live segment the driver has at `at`, and drop planned legs and service the
 *  truth has now overtaken. The planned reset itself stays. */
function closeLive(segments: DutySegment[], at: number): DutySegment[] {
  return segments
    .filter((s) => !(s.planned && s.status !== 'off_duty' && s.startedAt <= at))
    .map((s) => (s.endedAt === undefined && !s.planned ? { ...s, endedAt: at } : s))
}

export function reassignStops(fleet: Fleet, fromDriverId: string, toDriverId: string, stopIds: string[], now: number): Fleet {
  const from = routeOf(fleet, fromDriverId)
  const to = routeOf(fleet, toDriverId)
  const moving = from.stops.filter((s) => stopIds.includes(s.id) && (s.status === 'pending' || s.status === 'unassigned'))
  if (moving.length === 0) return fleet
  const keep = from.stops.filter((s) => !moving.includes(s))
  // The target's tail starts when the target is projected to finish. The moved stops keep
  // their leg estimate; it was measured from a different previous stop, so it is an estimate.
  // The same caveat applies to the source: a stop after a gap keeps its old leg.
  let t = projectedFinishAt(to, now) ?? now
  const tail: Stop[] = moving.map((s) => {
    const plannedEta = t + s.driveMinutesFromPrev * MIN
    t = plannedEta + s.serviceMinutes * MIN
    // It leaves its old simulated schedule behind: on the new route it is pending until someone gets there.
    return { ...s, routeId: to.id, status: 'pending', plannedEta, arrivedAt: undefined, departedAt: undefined }
  })
  return withRoutes(
    fleet,
    { ...from, stops: reseq(keep) },
    { ...to, stops: reseq([...to.stops, ...tail]), windowEnd: Math.max(to.windowEnd, t + 30 * MIN) },
  )
}

/** Plan a 10-hour reset after `afterStopId` (null = right now). Stops past that point
 *  become unassigned: they are somebody else's problem now, and the info rule says so.
 *  The legs and service up to the reset point are written as planned segments, so the
 *  projection stops charging service time as driving and the reset lands where the math
 *  said it would. A planned segment caps the live one (see segmentEnd in compute.ts). */
export function scheduleReset(fleet: Fleet, driverId: string, afterStopId: string | null, now: number): Fleet {
  const driver = driverOf(fleet, driverId)
  const route = routeOf(fleet, driverId)
  const remaining = remainingStops(route)
  const cutoff = afterStopId === null ? -1 : remaining.findIndex((s) => s.id === afterStopId)
  if (afterStopId !== null && cutoff === -1) return fleet // that stop is no longer ahead of the driver; nothing to plan
  const kept = remaining.slice(0, cutoff + 1)
  const orphaned = new Set(remaining.slice(cutoff + 1).filter((s) => s.status === 'pending').map((s) => s.id))
  const drivingNow = currentStatus(driver, now) === 'driving'
  const planned: DutySegment[] = []
  let t = now
  kept.forEach((s, i) => {
    if (s.status !== 'in_progress') {
      const arriveAt = t + s.driveMinutesFromPrev * MIN
      // The live driving segment already covers the leg the driver is on; every later leg is planned.
      if (i > 0 || !drivingNow) planned.push({ status: 'driving', startedAt: t, endedAt: arriveAt, planned: true })
      t = arriveAt
    }
    planned.push({ status: 'on_duty', startedAt: t, endedAt: t + s.serviceMinutes * MIN, planned: true })
    t += s.serviceMinutes * MIN
  })
  planned.push({ status: 'off_duty', startedAt: t, endedAt: t + RESET_MIN * MIN, planned: true })
  const segments: DutySegment[] = [...driver.segments.filter((s) => !s.planned), ...planned]
  const stops = route.stops.map((s) => (orphaned.has(s.id) ? { ...s, status: 'unassigned' as const } : s))
  return withRoutes(withDriver(fleet, { ...driver, segments }), { ...route, stops })
}

export function notifyCustomer(fleet: Fleet, stopIds: string[], now: number): Fleet {
  return { ...fleet, routes: fleet.routes.map((r) => ({ ...r, stops: r.stops.map((s) => (stopIds.includes(s.id) ? { ...s, notifiedAt: now } : s)) })) }
}

export function updateStopNote(fleet: Fleet, stopId: string, note: string): Fleet {
  const route = routeWithStop(fleet, stopId)
  const current = route.stops.find((stop) => stop.id === stopId)!
  const nextNote = note.trim() || undefined
  if (current.note === nextNote) return fleet
  const stops = route.stops.map((stop) => stop.id === stopId ? { ...stop, note: nextNote } : stop)
  return withRoutes(fleet, { ...route, stops })
}

/** Canceling removes unresolved work from the active route. The store snapshot keeps the
 * operation undoable, and the event log preserves the fact that dispatch canceled it. */
export function cancelStop(fleet: Fleet, stopId: string): Fleet {
  const route = routeWithStop(fleet, stopId)
  const stop = route.stops.find((candidate) => candidate.id === stopId)!
  if (stop.status !== 'pending' && stop.status !== 'unassigned') return fleet
  return withRoutes(fleet, { ...route, stops: reseq(route.stops.filter((candidate) => candidate.id !== stopId)) })
}

export function callDriver(fleet: Fleet, driverId: string, now: number): Fleet {
  return withDriver(fleet, { ...driverOf(fleet, driverId), contactAttemptedAt: now })
}

export function markArrived(fleet: Fleet, stopId: string, now: number): Fleet {
  const route = routeWithStop(fleet, stopId)
  const driver = driverOf(fleet, route.driverId)
  const stops = route.stops.map((s) => (s.id === stopId ? { ...s, status: 'in_progress' as const, arrivedAt: now } : s))
  const segments: DutySegment[] = [...closeLive(driver.segments, now), { status: 'on_duty', startedAt: now }]
  // A stop event is a ping.
  return withRoutes(withDriver(fleet, { ...driver, segments, lastPingAt: now }), { ...route, stops })
}

export function markDeparted(fleet: Fleet, stopId: string, outcome: StopOutcome, now: number): Fleet {
  const route = routeWithStop(fleet, stopId)
  const driver = driverOf(fleet, route.driverId)
  const stops = route.stops.map((s) =>
    s.id === stopId ? { ...s, status: outcome === 'failed' ? ('failed' as const) : ('done' as const), departedAt: now, outcome, signedBy: outcome === 'failed' ? undefined : 'On file' } : s,
  )
  const moreToDo = stops.some((s) => s.status === 'pending')
  const segments: DutySegment[] = [...closeLive(driver.segments, now), { status: moreToDo ? 'driving' : 'on_duty', startedAt: now }]
  const delivery = fleet.deliveries.find((d) => d.id === route.stops.find((s) => s.id === stopId)!.deliveryId)
  const trucks = delivery ? fleet.trucks.map((t) => (t.id === driver.truckId ? { ...t, position: delivery.position } : t)) : fleet.trucks
  return { ...withRoutes(withDriver(fleet, { ...driver, segments, lastPingAt: now }), { ...route, stops }), trucks }
}

export function bringOnline(fleet: Fleet, driverId: string, now: number): Fleet {
  return withDriver(fleet, { ...driverOf(fleet, driverId), pingsSuspended: false, lastPingAt: now })
}

export interface Candidate {
  view: DriverView
  spare: number
  sameRegion: boolean
}

/** Who can take these stops without becoming the next problem. Fresh, on the road, not
 *  act-now or over, and still holding CAPACITY_MARGIN_MIN after the move. Same region
 *  first, then most spare drive time. */
export function reassignCandidates(views: DriverView[], from: DriverView, stopIds: string[]): Candidate[] {
  const moved = from.route.stops.filter((s) => stopIds.includes(s.id)).reduce((t, s) => t + s.driveMinutesFromPrev, 0)
  return views
    .filter((v) => v.driver.id !== from.driver.id)
    .filter((v) => v.staleness === 'fresh' && (v.status === 'driving' || v.status === 'on_duty'))
    .filter((v) => v.hos !== 'over' && v.hos !== 'act_now')
    .map((v) => ({ view: v, spare: v.minutesUntilLimit - (v.remainingDriveMin + moved), sameRegion: v.driver.region === from.driver.region }))
    .filter((c) => c.spare >= CAPACITY_MARGIN_MIN)
    .sort((a, b) => Number(b.sameRegion) - Number(a.sameRegion) || b.spare - a.spare)
}

/** The last remaining stop the driver can still reach before the limit; null = none. */
export function suggestResetStop(view: DriverView): string | null {
  let left = view.minutesUntilLimit
  let last: string | null = null
  for (const s of view.remaining) {
    const leg = s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev
    if (leg > left) break
    left -= leg
    last = s.id
  }
  return last
}

/** The stops after the point the limit is reached: what a reassign should pre-select. */
export function stopsPastLimit(view: DriverView): string[] {
  const reachable = suggestResetStop(view)
  const idx = reachable === null ? -1 : view.remaining.findIndex((s) => s.id === reachable)
  return view.remaining.slice(idx + 1).filter((s) => s.status === 'pending').map((s) => s.id)
}
