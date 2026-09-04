import { describe, expect, it } from 'vitest'
import { remainingStops } from '../hos/compute'
import { MIN } from '../time/clock'
import { reassignStops } from '../store/actions'
import { buildViews } from '../store/view'
import { generateFleet, makeFleet } from './seed'
import { materialize } from './simulate'

const anchor = new Date(2026, 8, 3, 14, 47, 0, 0).getTime()

describe('materialize', () => {
  it('returns the same object when nothing crosses the clock', () => {
    const f = makeFleet(anchor)
    expect(materialize(f, anchor)).toBe(f)
  })
  it('generated drivers complete stops as the clock runs; planted drivers hold still', () => {
    const f = makeFleet(anchor)
    const later = materialize(f, anchor + 90 * MIN)
    const generated = (fleet: typeof f) => fleet.routes.filter((r) => !/drv-(0[1-9]|1[01])$/.test(r.driverId))
    const doneNow = generated(f).reduce((t, r) => t + r.stops.filter((s) => s.status === 'done').length, 0)
    const doneLater = generated(later).reduce((t, r) => t + r.stops.filter((s) => s.status === 'done').length, 0)
    expect(doneLater).toBeGreaterThan(doneNow + 40)
    expect(later.routes.find((r) => r.driverId === 'drv-01')).toBe(f.routes.find((r) => r.driverId === 'drv-01'))
  })
  it('a moved stop leaves its old schedule behind', () => {
    const f = makeFleet(anchor)
    const donor = f.routes.find((r) => r.driverId === 'drv-12')!
    const target = f.routes.find((r) => r.driverId === 'drv-13')!
    const ids = remainingStops(donor).filter((s) => s.status === 'pending').slice(0, 2).map((s) => s.id)
    const moved = materialize(reassignStops(f, donor.driverId, target.driverId, ids, anchor), anchor + 6 * 60 * MIN)
    const onTarget = moved.routes.find((r) => r.driverId === 'drv-13')!.stops.filter((s) => ids.includes(s.id))
    expect(onTarget.every((s) => s.status === 'pending')).toBe(true)
  })
  it('a generated driver who finishes goes off duty', () => {
    const f = generateFleet(anchor)
    const evening = anchor + 8 * 60 * MIN
    const views = buildViews(materialize(f, evening), evening)
    expect(views.some((v) => v.status === 'off_duty')).toBe(true)
  })
})
