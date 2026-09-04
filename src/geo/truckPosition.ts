import type { Delivery, LatLng, Route, Stop, Truck } from '../data/types'
import { projectedEta, scheduleDrift } from '../hos/compute'

// Where the truck is, derived from the route's receipts and the clock. Nothing stores a
// moving position: the seed holds one fix per truck, and everything after that is the
// legs walked since. The caller passes `at` = the effective last ping, so a fresh truck
// moves with the clock and a stale one shows its last known fix.

export type TruckFix =
  | { kind: 'at_stop'; position: LatLng; stopId: string }
  | { kind: 'en_route'; position: LatLng; fromStopId: string | null; toStopId: string; fraction: number }
  | { kind: 'parked'; position: LatLng; stopId: string | null }

const MIN = 60_000

/** A late driver hovers just short of the dock the projection says they have reached; the
 *  planted scenarios hold still, so without this they would teleport onto a pending stop. */
export const PROJECTED_LEG_CAP = 0.96

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

function positionOf(stop: Stop, deliveryById: Map<string, Delivery>): LatLng | undefined {
  return deliveryById.get(stop.deliveryId)?.position
}

export function truckFixAt(route: Route, truck: Truck, deliveryById: Map<string, Delivery>, at: number): TruckFix {
  // Drift as it was at `at`, so a stale truck's projected leg does not creep with the live clock.
  const driftMin = scheduleDrift(route, at)
  const stops = [...route.stops].sort((a, b) => a.seq - b.seq).filter((s) => s.status !== 'unassigned')
  const located = (s: Stop) => positionOf(s, deliveryById) !== undefined

  // At the dock: arrived by `at`, not yet departed.
  const docked = stops.find((s) => s.arrivedAt !== undefined && s.arrivedAt <= at && (s.departedAt === undefined || s.departedAt > at) && located(s))
  if (docked) return { kind: 'at_stop', position: positionOf(docked, deliveryById)!, stopId: docked.id }

  // The current leg runs from the last stop departed by `at` to the first stop after it.
  const passed = stops.filter((s) => s.departedAt !== undefined && s.departedAt <= at && located(s))
  const last = passed[passed.length - 1]
  const next = stops.find((s) => (last === undefined || s.seq > last.seq) && located(s) && !(s.departedAt !== undefined && s.departedAt <= at))

  if (!next) {
    return last ? { kind: 'parked', position: positionOf(last, deliveryById)!, stopId: last.id } : { kind: 'parked', position: truck.position, stopId: null }
  }

  const from = last ? positionOf(last, deliveryById)! : truck.position
  const departedAt = last?.departedAt ?? route.plannedStartAt
  if (at <= departedAt) return { kind: 'parked', position: from, stopId: last?.id ?? null }

  // Arrival is known for simulated days; for a planted, held-still route it is the projection.
  const known = next.arrivedAt !== undefined
  const arriveAt = known ? next.arrivedAt! : Math.max(projectedEta(next, driftMin), departedAt + next.driveMinutesFromPrev * MIN)
  const raw = arriveAt > departedAt ? (at - departedAt) / (arriveAt - departedAt) : 1
  const fraction = Math.min(known ? 1 : PROJECTED_LEG_CAP, Math.max(0, raw))
  return { kind: 'en_route', position: lerp(from, positionOf(next, deliveryById)!, fraction), fromStopId: last?.id ?? null, toStopId: next.id, fraction }
}
