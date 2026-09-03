import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { minutesUntilLimit, plannedReset, remainingDriveMinutes, remainingStops, unassignedStops } from '../hos/compute'
import { MIN } from '../time/clock'
import { bringOnline, markArrived, markDeparted, notifyCustomer, reassignCandidates, reassignStops, scheduleReset, stopsPastLimit, suggestResetStop } from './actions'
import { buildView, buildViews } from './view'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const fleet = makeFleet(anchor)
const routeOf = (f: typeof fleet, driverId: string) => f.routes.find((r) => r.driverId === driverId)!
const marcusStops = remainingStops(routeOf(fleet, 'drv-01')).map((s) => s.id)

describe('reassignStops', () => {
  it('moves stops to the end of the target route and re-times them after the target finishes', () => {
    const next = reassignStops(fleet, 'drv-01', 'drv-08', marcusStops, anchor)
    expect(remainingDriveMinutes(routeOf(next, 'drv-01'))).toBe(0)
    const ana = routeOf(next, 'drv-08')
    const moved = ana.stops.filter((s) => marcusStops.includes(s.id))
    expect(moved).toHaveLength(3)
    expect(moved.map((s) => s.routeId)).toEqual(['rt-08', 'rt-08', 'rt-08'])
    expect(ana.stops.map((s) => s.seq)).toEqual(ana.stops.map((_, i) => i + 1))
    const anaOwnLast = ana.stops[ana.stops.length - 4]
    expect(moved[0].plannedEta).toBeGreaterThan(anaOwnLast.plannedEta)
    expect(next).not.toBe(fleet) // immutable
  })
  it('a partial reassign leaves the rest with the driver', () => {
    const next = reassignStops(fleet, 'drv-01', 'drv-08', marcusStops.slice(1), anchor)
    expect(remainingStops(routeOf(next, 'drv-01'))).toHaveLength(1)
  })
})

describe('reassignCandidates', () => {
  const views = buildViews(fleet, anchor)
  const marcus = views.find((v) => v.driver.id === 'drv-01')!
  it('puts same-region drivers first, includes Ana, and excludes anyone who would enter act now', () => {
    const cands = reassignCandidates(views, marcus, marcusStops)
    expect(cands[0].sameRegion).toBe(true)
    expect(cands.map((c) => c.view.driver.id)).toContain('drv-08')
    const ids = cands.map((c) => c.view.driver.id)
    expect(ids).not.toContain('drv-01')
    expect(ids).not.toContain('drv-02') // over
    expect(ids).not.toContain('drv-03') // offline
    expect(ids).not.toContain('drv-09') // marginal: 55 left, 32 to drive, plus 34 moved
  })
  it('the marginal candidate is excluded for Priya too', () => {
    const priya = views.find((v) => v.driver.id === 'drv-02')!
    const ids = reassignCandidates(views, priya, remainingStops(priya.route).map((s) => s.id)).map((c) => c.view.driver.id)
    expect(ids).not.toContain('drv-09')
  })
})

describe('scheduleReset', () => {
  it('suggests the last stop finishable before the limit and orphans the rest', () => {
    const marcus = buildView(fleet, fleet.drivers[0], anchor)
    const after = suggestResetStop(marcus)
    expect(after).toBe(marcusStops[0]) // 10 min leg fits in 12; 10 + 14 does not
    const next = scheduleReset(fleet, 'drv-01', after, anchor)
    const route = routeOf(next, 'drv-01')
    expect(unassignedStops(route).map((s) => s.id)).toEqual(marcusStops.slice(1))
    expect(remainingDriveMinutes(route)).toBe(10)
    const driver = next.drivers.find((d) => d.id === 'drv-01')!
    expect(plannedReset(driver)?.startedAt).toBeGreaterThan(anchor)
  })
  it('null means reset now: every remaining stop needs a driver', () => {
    const next = scheduleReset(fleet, 'drv-01', null, anchor)
    expect(unassignedStops(routeOf(next, 'drv-01'))).toHaveLength(3)
    expect(plannedReset(next.drivers.find((d) => d.id === 'drv-01')!)?.startedAt).toBe(anchor)
  })
  it('stopsPastLimit names the stops the driver cannot reach', () => {
    const marcus = buildView(fleet, fleet.drivers[0], anchor)
    expect(stopsPastLimit(marcus)).toEqual(marcusStops.slice(1))
  })
})

describe('notify, call, arrive, depart, reconnect', () => {
  it('notifyCustomer stamps the stops', () => {
    const next = notifyCustomer(fleet, marcusStops, anchor)
    for (const s of remainingStops(routeOf(next, 'drv-01'))) expect(s.notifiedAt).toBe(anchor)
  })
  it('markArrived then markDeparted advances the route and the segments', () => {
    const arrived = markArrived(fleet, marcusStops[0], anchor)
    expect(routeOf(arrived, 'drv-01').stops.find((s) => s.id === marcusStops[0])!.status).toBe('in_progress')
    const departed = markDeparted(arrived, marcusStops[0], 'delivered', anchor + 10 * MIN)
    const stop = routeOf(departed, 'drv-01').stops.find((s) => s.id === marcusStops[0])!
    expect(stop.status).toBe('done')
    expect(stop.departedAt).toBe(anchor + 10 * MIN)
    const driver = departed.drivers.find((d) => d.id === 'drv-01')!
    expect(driver.segments[driver.segments.length - 1]).toMatchObject({ status: 'driving', startedAt: anchor + 10 * MIN })
  })
  it('bringOnline reveals the truth and the countdown corrects upward for Dre', () => {
    const dre = fleet.drivers.find((d) => d.id === 'drv-03')!
    const before = minutesUntilLimit(dre, anchor)
    const next = bringOnline(fleet, 'drv-03', anchor)
    const after = next.drivers.find((d) => d.id === 'drv-03')!
    expect(after.pingsSuspended).toBe(false)
    expect(minutesUntilLimit(after, anchor)).toBeGreaterThan(before)
  })
})
