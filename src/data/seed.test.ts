import { describe, expect, it } from 'vitest'
import { currentStatus, drivingSinceBreak, minutesUntilLimit, remainingDriveMinutes, scheduleDrift, staleness } from '../hos/compute'
import { MIN } from '../time/clock'
import { DRIVER_COUNT, STOPS_PER_ROUTE, generateFleet, makeFleet } from './seed'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()

function byId(fleet: ReturnType<typeof makeFleet>, id: string) {
  const driver = fleet.drivers.find((d) => d.id === id)!
  const route = fleet.routes.find((r) => r.id === driver.routeId)!
  return { driver, route }
}

describe('generateFleet', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(generateFleet(anchor))).toBe(JSON.stringify(generateFleet(anchor)))
  })
  it('has the promised shape', () => {
    const f = generateFleet(anchor)
    expect(f.drivers).toHaveLength(DRIVER_COUNT)
    expect(f.trucks).toHaveLength(DRIVER_COUNT)
    expect(f.routes).toHaveLength(DRIVER_COUNT)
    expect(f.deliveries.length).toBeGreaterThanOrEqual(DRIVER_COUNT * STOPS_PER_ROUTE)
    for (const r of f.routes) expect(r.stops.map((s) => s.seq)).toEqual(r.stops.map((_, i) => i + 1))
  })
  it('spreads drivers across the four regions', () => {
    const f = generateFleet(anchor)
    const counts = new Map<string, number>()
    for (const d of f.drivers) counts.set(d.region, (counts.get(d.region) ?? 0) + 1)
    expect([...counts.values()].every((n) => n >= 12)).toBe(true)
  })
  it('segments are consistent with stop progress: every driver has some driving today', () => {
    const f = generateFleet(anchor)
    for (const d of f.drivers) expect(d.segments.some((s) => s.status === 'driving')).toBe(true)
  })
})

describe('planted drivers at the anchor', () => {
  const f = makeFleet(anchor)
  it('Marcus R. is ~12 min from the limit with more driving left than that, behind schedule', () => {
    const { driver, route } = byId(f, 'drv-01')
    expect(driver.name).toBe('Marcus R.')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(12, 0)
    expect(remainingDriveMinutes(route)).toBe(34)
    expect(scheduleDrift(route, anchor)).toBeGreaterThanOrEqual(14)
  })
  it('Priya S. is over the limit', () => {
    const { driver } = byId(f, 'drv-02')
    expect(minutesUntilLimit(driver, anchor)).toBeLessThan(0)
    expect(currentStatus(driver, anchor)).toBe('driving')
  })
  it('Dre W. is offline 25 min with ~40 min projected, and safer once he reconnects', () => {
    const { driver } = byId(f, 'drv-03')
    expect(staleness(driver, anchor)).toBe('offline')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(40, 0)
    const online = { ...driver, pingsSuspended: false, lastPingAt: anchor }
    expect(minutesUntilLimit(online, anchor)).toBeGreaterThan(50)
  })
  it('Elena M. is on break', () => {
    expect(currentStatus(byId(f, 'drv-04').driver, anchor)).toBe('on_break')
  })
  it('Sam K. has driven 8h+ without a break and is otherwise clear', () => {
    const { driver } = byId(f, 'drv-05')
    expect(drivingSinceBreak(driver, anchor)).toBeGreaterThanOrEqual(480)
    expect(minutesUntilLimit(driver, anchor)).toBeGreaterThan(90)
  })
  it('Nadia F. is stale and inside the watch window', () => {
    const { driver } = byId(f, 'drv-06')
    expect(staleness(driver, anchor)).toBe('stale')
    expect(minutesUntilLimit(driver, anchor)).toBeCloseTo(70, 0)
  })
  it('Tomas B. is far behind schedule with a clear HOS', () => {
    const { driver, route } = byId(f, 'drv-07')
    expect(scheduleDrift(route, anchor)).toBeGreaterThanOrEqual(34)
    expect(minutesUntilLimit(driver, anchor)).toBeGreaterThan(90)
  })
  it("Ana L. has the capacity to take Marcus's stops; Ravi P. does not have capacity for Priya's", () => {
    const ana = byId(f, 'drv-08')
    expect(ana.driver.region).toBe('North')
    expect(minutesUntilLimit(ana.driver, anchor) - remainingDriveMinutes(ana.route)).toBeGreaterThan(100)
    const ravi = byId(f, 'drv-09')
    expect(ravi.driver.region).toBe('West')
    expect(minutesUntilLimit(ravi.driver, anchor) - remainingDriveMinutes(ravi.route)).toBeLessThan(40)
  })
  it('time flows: 10 minutes later, Marcus has 10 fewer minutes', () => {
    const { driver } = byId(f, 'drv-01')
    expect(minutesUntilLimit(driver, anchor + 10 * MIN)).toBeCloseTo(2, 0)
  })
})
