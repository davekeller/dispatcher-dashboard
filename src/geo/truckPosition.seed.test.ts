import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import { buildView } from '../store/view'
import { ANCHOR, MIN } from '../time/clock'
import { truckFixAt } from './truckPosition'

// The map's one promise: every truck on the seeded shift has a fix, inside the metro,
// as of its own last ping.
describe('truck fixes across the seeded fleet', () => {
  const fleet = materialize(makeFleet(ANCHOR), ANCHOR)
  const byId = new Map(fleet.deliveries.map((d) => [d.id, d]))
  const fixFor = (driverId: string, at: number) => {
    const world = materialize(fleet, at)
    const driver = world.drivers.find((d) => d.id === driverId)!
    const view = buildView(world, driver, at)
    return { view, fix: truckFixAt(view.route, view.truck, byId, view.lastPingAt) }
  }

  it('places every truck inside the metro at 2:47', () => {
    for (const driver of fleet.drivers) {
      const { fix } = fixFor(driver.id, ANCHOR)
      expect(fix.position.lat).toBeGreaterThan(41.4)
      expect(fix.position.lat).toBeLessThan(42.3)
      expect(fix.position.lng).toBeGreaterThan(-88.2)
      expect(fix.position.lng).toBeLessThan(-87.3)
    }
  })

  it('keeps an offline truck at its last known fix while the clock moves on', () => {
    const a = fixFor('drv-03', ANCHOR)
    const b = fixFor('drv-03', ANCHOR + 10 * MIN)
    expect(a.view.staleness).toBe('offline')
    expect(b.fix.position).toEqual(a.fix.position)
  })

  it('moves a fresh truck that is between stops as the clock ticks', () => {
    const moving = fleet.drivers.find((d) => {
      const { view, fix } = fixFor(d.id, ANCHOR)
      return view.staleness === 'fresh' && fix.kind === 'en_route' && fix.fraction < 0.9
    })
    expect(moving).toBeDefined()
    const before = fixFor(moving!.id, ANCHOR).fix.position
    const after = fixFor(moving!.id, ANCHOR + 2 * MIN).fix.position
    expect(after).not.toEqual(before)
  })
})
