import type { Driver, DutyStatus, Fleet, Route, Stop, Truck } from '../data/types'
import {
  currentStatus, drivingSinceBreak, effectiveLastPingAt, hosStatusOf, knownSegments, limitHitAt, minutesOfStatus,
  nextStop, pingAgeMinutes, plannedReset, projectedEta, projectedFinishAt, remainingDriveMinutes, remainingStops,
  scheduleDrift, stalenessOf, unassignedStops, type HosStatus, type Staleness,
} from '../hos/compute'
import { LIMIT_MIN } from '../hos/constants'
import { MIN } from '../time/clock'

/** Everything a rule or a view needs about one driver at one instant. Built once per
 *  tick in derive(); rules read this and never recompute. */
export interface DriverView {
  driver: Driver
  truck: Truck
  route: Route
  now: number
  status: DutyStatus
  drivingMin: number
  breakMin: number
  shiftElapsedMin: number
  minutesUntilLimit: number
  hos: HosStatus
  lastPingAt: number
  pingAgeMin: number
  staleness: Staleness
  remaining: Stop[]
  next: Stop | undefined
  done: number
  total: number
  remainingDriveMin: number
  driftMin: number
  projectedFinishAt: number | undefined
  limitHitAt: number
  drivingSinceBreakMin: number
  /** Pending stops whose projected ETA is past their delivery window. */
  lateStops: Stop[]
  unnotifiedLateStops: Stop[]
  unassigned: Stop[]
  plannedResetAt: number | undefined
}

export function buildView(fleet: Fleet, driver: Driver, now: number, windowEnds: Map<string, number> = deliveryWindowEnds(fleet)): DriverView {
  const truck = fleet.trucks.find((t) => t.id === driver.truckId)
  const route = fleet.routes.find((r) => r.id === driver.routeId)
  if (!truck || !route) throw new Error(`fleet is missing truck or route for ${driver.id}`)
  const known = knownSegments(driver, now)
  const drivingMin = minutesOfStatus(known, 'driving', now)
  const left = LIMIT_MIN - drivingMin
  const lastPingAt = effectiveLastPingAt(driver, now)
  const pingAgeMin = pingAgeMinutes(driver, now)
  const remaining = remainingStops(route)
  const driftMin = scheduleDrift(route, now)
  // Late means the customer's window is at risk, not merely behind the plan: the plan slips
  // all day, and the window is the promise.
  const lateStops = remaining.filter((s) => s.status === 'pending' && projectedEta(s, driftMin) > (windowEnds.get(s.deliveryId) ?? Infinity))
  return {
    driver, truck, route, now,
    status: currentStatus(driver, now),
    drivingMin,
    breakMin: minutesOfStatus(known, 'on_break', now),
    shiftElapsedMin: (now - driver.shiftStartedAt) / MIN,
    minutesUntilLimit: left,
    hos: hosStatusOf(left),
    lastPingAt,
    pingAgeMin,
    staleness: stalenessOf(pingAgeMin),
    remaining,
    next: nextStop(route),
    done: route.stops.filter((s) => s.status === 'done' || s.status === 'failed').length,
    total: route.stops.length,
    remainingDriveMin: remainingDriveMinutes(route),
    driftMin,
    projectedFinishAt: projectedFinishAt(route, now),
    limitHitAt: limitHitAt(driver, route, now),
    drivingSinceBreakMin: drivingSinceBreak(driver, now),
    lateStops,
    unnotifiedLateStops: lateStops.filter((s) => s.notifiedAt === undefined),
    unassigned: unassignedStops(route),
    plannedResetAt: plannedReset(driver)?.startedAt,
  }
}

function deliveryWindowEnds(fleet: Fleet): Map<string, number> {
  return new Map(fleet.deliveries.map((d) => [d.id, d.window.end]))
}

export function buildViews(fleet: Fleet, now: number): DriverView[] {
  const windowEnds = deliveryWindowEnds(fleet)
  return fleet.drivers.map((d) => buildView(fleet, d, now, windowEnds))
}
