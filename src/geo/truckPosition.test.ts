import { describe, expect, it } from 'vitest'
import type { Delivery, Route, Stop, Truck } from '../data/types'
import { PROJECTED_LEG_CAP, truckFixAt } from './truckPosition'

const MIN = 60_000
const T0 = Date.UTC(2026, 8, 4, 12, 0)

const deliveries: Delivery[] = [
  { id: 'd1', customer: 'A', address: '', position: { lat: 41.0, lng: -87.0 }, window: { start: T0, end: T0 + 60 * MIN }, priority: 'standard', items: [] },
  { id: 'd2', customer: 'B', address: '', position: { lat: 41.2, lng: -87.2 }, window: { start: T0, end: T0 + 120 * MIN }, priority: 'standard', items: [] },
  { id: 'd3', customer: 'C', address: '', position: { lat: 41.4, lng: -87.4 }, window: { start: T0, end: T0 + 180 * MIN }, priority: 'standard', items: [] },
]
const byId = new Map(deliveries.map((d) => [d.id, d]))
const truck: Truck = { id: 't1', plate: 'X', region: 'North', position: { lat: 40.8, lng: -86.8 }, lastPingAt: T0 }

function stop(seq: number, deliveryId: string, extra: Partial<Stop> = {}): Stop {
  return { id: `s${seq}`, routeId: 'r1', deliveryId, seq, driveMinutesFromPrev: 20, serviceMinutes: 10, plannedEta: T0 + seq * 30 * MIN, status: 'pending', ...extra }
}

function route(stops: Stop[]): Route {
  return { id: 'r1', driverId: 'drv', region: 'North', plannedStartAt: T0, windowEnd: T0 + 240 * MIN, stops }
}

describe('truckFixAt', () => {
  const simulated = route([
    stop(1, 'd1', { status: 'done', arrivedAt: T0 + 20 * MIN, departedAt: T0 + 30 * MIN }),
    stop(2, 'd2', { status: 'pending', arrivedAt: T0 + 50 * MIN, departedAt: T0 + 60 * MIN }),
    stop(3, 'd3', { status: 'pending', arrivedAt: T0 + 80 * MIN, departedAt: T0 + 90 * MIN }),
  ])

  it('sits at the dock while a stop is in progress', () => {
    const fix = truckFixAt(simulated, truck, byId, T0 + 25 * MIN)
    expect(fix).toMatchObject({ kind: 'at_stop', stopId: 's1', position: { lat: 41.0, lng: -87.0 } })
  })

  it('is halfway along a leg halfway between departure and the known arrival', () => {
    const fix = truckFixAt(simulated, truck, byId, T0 + 40 * MIN)
    expect(fix.kind).toBe('en_route')
    expect(fix.position.lat).toBeCloseTo(41.1, 6)
    expect(fix.position.lng).toBeCloseTo(-87.1, 6)
    if (fix.kind === 'en_route') expect(fix).toMatchObject({ fromStopId: 's1', toStopId: 's2', fraction: 0.5 })
  })

  it('moves as the clock moves and arrives exactly when the stop flips to in progress', () => {
    const early = truckFixAt(simulated, truck, byId, T0 + 35 * MIN)
    const later = truckFixAt(simulated, truck, byId, T0 + 45 * MIN)
    expect(later.position.lat).toBeGreaterThan(early.position.lat)
    expect(truckFixAt(simulated, truck, byId, T0 + 50 * MIN)).toMatchObject({ kind: 'at_stop', stopId: 's2' })
  })

  it('heads from the seed fix to the first stop before any receipt exists', () => {
    const fresh = route([stop(1, 'd1'), stop(2, 'd2')])
    expect(truckFixAt(fresh, truck, byId, T0 - MIN)).toMatchObject({ kind: 'parked', stopId: null, position: truck.position })
    // The plan says arrive at the 30-minute ETA, so ten minutes in is a third of the way.
    const fix = truckFixAt(fresh, truck, byId, T0 + 10 * MIN)
    expect(fix).toMatchObject({ kind: 'en_route', fromStopId: null, toStopId: 's1' })
    if (fix.kind === 'en_route') expect(fix.fraction).toBeCloseTo(1 / 3, 6)
  })

  it('parks at the last stop once the route is complete', () => {
    const done = route([
      stop(1, 'd1', { status: 'done', arrivedAt: T0 + 20 * MIN, departedAt: T0 + 30 * MIN }),
      stop(2, 'd2', { status: 'done', arrivedAt: T0 + 50 * MIN, departedAt: T0 + 60 * MIN }),
    ])
    expect(truckFixAt(done, truck, byId, T0 + 200 * MIN)).toMatchObject({ kind: 'parked', stopId: 's2', position: { lat: 41.2, lng: -87.2 } })
  })

  it('caps a held-still planted driver short of a dock the projection says they have reached', () => {
    const planted = route([
      stop(1, 'd1', { status: 'done', arrivedAt: T0 + 20 * MIN, departedAt: T0 + 30 * MIN }),
      stop(2, 'd2', { status: 'pending', plannedEta: T0 + 50 * MIN }),
    ])
    const late = truckFixAt(planted, truck, byId, T0 + 90 * MIN)
    expect(late.kind).toBe('en_route')
    if (late.kind === 'en_route') expect(late.fraction).toBe(PROJECTED_LEG_CAP)
    const onTime = truckFixAt(planted, truck, byId, T0 + 40 * MIN)
    if (onTime.kind === 'en_route') expect(onTime.fraction).toBeCloseTo(0.5, 6)
  })

  it('skips unassigned stops when choosing the next leg', () => {
    const withUnassigned = route([
      stop(1, 'd1', { status: 'done', arrivedAt: T0 + 20 * MIN, departedAt: T0 + 30 * MIN }),
      stop(2, 'd2', { status: 'unassigned' }),
      stop(3, 'd3', { status: 'pending', plannedEta: T0 + 70 * MIN }),
    ])
    const fix = truckFixAt(withUnassigned, truck, byId, T0 + 40 * MIN)
    expect(fix).toMatchObject({ kind: 'en_route', fromStopId: 's1', toStopId: 's3' })
  })

  it('reads the route as of the ping, not the clock, so a stale truck shows its last known fix', () => {
    const atPing = truckFixAt(simulated, truck, byId, T0 + 40 * MIN)
    const atNow = truckFixAt(simulated, truck, byId, T0 + 85 * MIN)
    expect(atPing).not.toEqual(atNow)
    expect(atPing.kind).toBe('en_route')
    expect(atNow).toMatchObject({ kind: 'at_stop', stopId: 's3' })
  })
})
