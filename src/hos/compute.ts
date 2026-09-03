import type { Driver, DutySegment, DutyStatus, Route, Stop } from '../data/types'
import { hashString } from '../data/prng'
import { MIN } from '../time/clock'
import { ACT_NOW_MIN, BREAK_MIN, FRESH_MIN, LIMIT_MIN, OFFLINE_MIN, PING_JITTER_MS, WATCH_MIN } from './constants'

export type HosStatus = 'over' | 'act_now' | 'watch' | 'clear'
export type Staleness = 'fresh' | 'stale' | 'offline'

/** Where the truck's telematics last reached us. Online drivers ping continuously
 *  (derived, not mutated), so scrubbing the clock or leaving a tab open never blacks
 *  out the fleet. Planted stale/offline drivers keep their stored ping. */
export function effectiveLastPingAt(driver: Driver, now: number): number {
  if (driver.pingsSuspended) return driver.lastPingAt
  const jitter = hashString(driver.id) % PING_JITTER_MS
  return Math.max(driver.lastPingAt, now - jitter)
}

/** The segments as they were known at `at`: started by then, with any segment that
 *  ended after `at` reopened, because at `at` its end had not happened yet. Planned
 *  segments are always known: the dispatcher added them, no radio involved. */
export function segmentsKnownAt(segments: DutySegment[], at: number): DutySegment[] {
  return segments
    .filter((s) => s.planned || s.startedAt <= at)
    .map((s) => (!s.planned && s.endedAt !== undefined && s.endedAt > at ? { ...s, endedAt: undefined } : s))
}

export function knownSegments(driver: Driver, now: number): DutySegment[] {
  return segmentsKnownAt(driver.segments, effectiveLastPingAt(driver, now))
}

/** An ongoing segment ends at `now`, or earlier if a planned segment starts before that. */
function segmentEnd(seg: DutySegment, all: DutySegment[], now: number): number {
  let end = seg.endedAt ?? now
  for (const other of all) {
    if (other.planned && other !== seg && other.startedAt > seg.startedAt && other.startedAt < end) end = other.startedAt
  }
  return Math.max(seg.startedAt, Math.min(end, now))
}

export function minutesOfStatus(segments: DutySegment[], status: DutyStatus, now: number): number {
  let total = 0
  for (const s of segments) {
    if (s.status !== status) continue
    total += (segmentEnd(s, segments, now) - s.startedAt) / MIN
  }
  return Math.max(0, total)
}

export function drivingMinutes(driver: Driver, now: number): number {
  return minutesOfStatus(knownSegments(driver, now), 'driving', now)
}

export function minutesUntilLimit(driver: Driver, now: number): number {
  return LIMIT_MIN - drivingMinutes(driver, now)
}

export function hosStatusOf(minutesLeft: number): HosStatus {
  if (minutesLeft <= 0) return 'over'
  if (minutesLeft <= ACT_NOW_MIN) return 'act_now'
  if (minutesLeft <= WATCH_MIN) return 'watch'
  return 'clear'
}

export function hosStatus(driver: Driver, now: number): HosStatus {
  return hosStatusOf(minutesUntilLimit(driver, now))
}

export function pingAgeMinutes(driver: Driver, now: number): number {
  return Math.max(0, (now - effectiveLastPingAt(driver, now)) / MIN)
}

export function stalenessOf(ageMinutes: number): Staleness {
  if (ageMinutes < FRESH_MIN) return 'fresh'
  if (ageMinutes <= OFFLINE_MIN) return 'stale'
  return 'offline'
}

export function staleness(driver: Driver, now: number): Staleness {
  return stalenessOf(pingAgeMinutes(driver, now))
}

/** What the driver is doing right now, as far as we know. The most recently started
 *  live segment wins, so a planned reset that has begun ends the drive. */
export function currentStatus(driver: Driver, now: number): DutyStatus {
  const live = knownSegments(driver, now).filter((s) => s.startedAt <= now && (s.endedAt === undefined || s.endedAt > now))
  if (live.length === 0) return 'off_duty'
  live.sort((a, b) => b.startedAt - a.startedAt)
  return live[0].status
}

export function plannedReset(driver: Driver): DutySegment | undefined {
  return driver.segments.find((s) => s.planned)
}

// ---- Route math -----------------------------------------------------------

export function remainingStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'pending' || s.status === 'in_progress')
}

export function doneStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'done' || s.status === 'failed')
}

export function unassignedStops(route: Route): Stop[] {
  return route.stops.filter((s) => s.status === 'unassigned')
}

export function nextStop(route: Route): Stop | undefined {
  return remainingStops(route)[0]
}

/** Drive minutes still to be driven. An in-progress stop's leg is already behind us. */
export function remainingDriveMinutes(route: Route): number {
  return remainingStops(route).reduce((t, s) => t + (s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev), 0)
}

export function remainingServiceMinutes(route: Route): number {
  return remainingStops(route).reduce((t, s) => t + s.serviceMinutes, 0)
}

/** Minutes behind (positive) or ahead (negative) of the plan. The slip at the last
 *  checkpoint, or how overdue the next stop is, whichever is worse. */
export function scheduleDrift(route: Route, now: number): number {
  const done = doneStops(route)
  const last = done[done.length - 1]
  let drift = last?.departedAt !== undefined ? (last.departedAt - (last.plannedEta + last.serviceMinutes * MIN)) / MIN : 0
  const next = nextStop(route)
  if (next) {
    if (next.status === 'in_progress' && next.arrivedAt !== undefined) drift = (next.arrivedAt - next.plannedEta) / MIN
    else drift = Math.max(drift, (now - next.plannedEta) / MIN)
  }
  return drift
}

export function projectedEta(stop: Stop, driftMinutes: number): number {
  return stop.plannedEta + Math.max(0, driftMinutes) * MIN
}

/** When the driver is done, following the remaining legs from now. */
export function projectedFinishAt(route: Route, now: number): number | undefined {
  const remaining = remainingStops(route)
  if (remaining.length === 0) return undefined
  let t = now
  for (const s of remaining) {
    if (s.status !== 'in_progress') t += s.driveMinutesFromPrev * MIN
    t += s.serviceMinutes * MIN
  }
  return t
}

/** When the driver would depart the given stop, following the remaining legs from now. */
export function projectedDepartureAt(route: Route, stopId: string, now: number): number {
  let t = now
  for (const s of remainingStops(route)) {
    if (s.status !== 'in_progress') t += s.driveMinutesFromPrev * MIN
    t += s.serviceMinutes * MIN
    if (s.id === stopId) return t
  }
  return t
}

/** The clock time at which cumulative driving reaches the limit, walking the remaining
 *  legs. Service time advances the clock but does not consume the limit. This is where
 *  the limit mark sits on the route ribbon, so the ribbon and the rules agree by construction. */
export function limitHitAt(driver: Driver, route: Route, now: number): number {
  let left = minutesUntilLimit(driver, now)
  if (left <= 0) return now
  let t = now
  for (const s of remainingStops(route)) {
    const leg = s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev
    if (leg >= left) return t + left * MIN
    left -= leg
    t += (leg + s.serviceMinutes) * MIN
  }
  return t + left * MIN // past the route: assume continued driving
}

/** Driving minutes since the last interruption of BREAK_MIN or more. Feeds the
 *  30-minute-break rule that gets added live during the walkthrough. */
export function drivingSinceBreak(driver: Driver, now: number): number {
  const segs = knownSegments(driver, now).slice().sort((a, b) => a.startedAt - b.startedAt)
  let total = 0
  for (const s of segs) {
    const mins = (segmentEnd(s, segs, now) - s.startedAt) / MIN
    if ((s.status === 'on_break' || s.status === 'off_duty') && mins >= BREAK_MIN) total = 0
    else if (s.status === 'driving') total += mins
  }
  return total
}
