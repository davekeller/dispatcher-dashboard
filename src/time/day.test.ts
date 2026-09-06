import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import { effectiveLastPingAt } from '../hos/compute'
import { derive } from '../store/derive'
import { ANCHOR, DAY_END, DAY_START, MIN, SCRUB_MAX_MS, SCRUB_MIN_MS, clampScrub } from './clock'

describe('the simulated day', () => {
  it('runs 6:00 AM to 6:00 PM around the 2:47 anchor', () => {
    expect(new Date(DAY_START).getHours()).toBe(6)
    expect(new Date(DAY_START).getMinutes()).toBe(0)
    expect(DAY_END - DAY_START).toBe(12 * 60 * MIN)
    expect(ANCHOR).toBeGreaterThan(DAY_START)
    expect(ANCHOR).toBeLessThan(DAY_END)
    expect(clampScrub(-99 * 60 * MIN)).toBe(SCRUB_MIN_MS)
    expect(clampScrub(99 * 60 * MIN)).toBe(SCRUB_MAX_MS)
    expect(clampScrub(0)).toBe(0)
  })

  const base = makeFleet(ANCHOR)
  const at = (t: number) => derive(materialize(base, t), t, {})

  it('never counts duty time from after the clock when scrubbed back', () => {
    const noon = at(ANCHOR)
    const morning = at(DAY_START + 3 * 60 * MIN)
    for (const v of morning.views) {
      expect(v.drivingMin).toBeGreaterThanOrEqual(0)
      expect(v.drivingMin).toBeLessThanOrEqual(noon.byId.get(v.driver.id)!.drivingMin + 1e-6)
      expect(v.done).toBeLessThanOrEqual(noon.byId.get(v.driver.id)!.done)
    }
    const marcus = morning.byId.get('drv-01')!
    expect(marcus.done).toBeLessThan(noon.byId.get('drv-01')!.done)
    expect(marcus.hos).toBe('clear')
  })

  it('makes a dark driver fresh again before his last ping, because he was', () => {
    const dre = base.drivers.find((d) => d.id === 'drv-03')!
    const before = dre.lastPingAt - 5 * MIN
    expect(effectiveLastPingAt(dre, before)).toBe(before)
    expect(at(before).byId.get('drv-03')!.staleness).toBe('fresh')
    expect(at(ANCHOR).byId.get('drv-03')!.staleness).toBe('offline')
  })

  it('keeps completing stops toward the end of the day', () => {
    const later = at(DAY_END)
    const now = at(ANCHOR)
    const doneLater = later.views.reduce((t, v) => t + v.done, 0)
    const doneNow = now.views.reduce((t, v) => t + v.done, 0)
    expect(doneLater).toBeGreaterThan(doneNow)
  })
})
