import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { remainingStops } from '../hos/compute'
import { reassignCandidates } from './actions'
import { CANDIDATE_ORDERS, distanceKm, filterCandidates, orderCandidates } from './candidates'
import { buildViews } from './view'

const anchor = new Date(2026, 8, 3, 14, 47, 0, 0).getTime()
const fleet = makeFleet(anchor)
const views = buildViews(fleet, anchor)
const marcus = views.find((v) => v.driver.id === 'drv-01')!
const cands = reassignCandidates(views, marcus, remainingStops(marcus.route).slice(1).map((s) => s.id))

describe('distanceKm', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(distanceKm({ lat: 41.9, lng: -87.6 }, { lat: 41.9, lng: -87.6 })).toBe(0)
    expect(distanceKm({ lat: 41, lng: -87.6 }, { lat: 42, lng: -87.6 })).toBeCloseTo(111.2, 0)
  })
})

describe('orderCandidates', () => {
  it("Lookout's order is the input order", () => {
    expect(orderCandidates(cands, marcus, 'lookout').map((c) => c.view.driver.id)).toEqual(cands.map((c) => c.view.driver.id))
  })
  it('closest first is by distance from the source truck', () => {
    const ordered = orderCandidates(cands, marcus, 'proximity')
    const d = ordered.map((c) => distanceKm(marcus.truck.position, c.view.truck.position))
    expect(d).toEqual([...d].sort((a, b) => a - b))
  })
  it('most drive time left is by minutes until the limit, descending', () => {
    const ordered = orderCandidates(cands, marcus, 'time_left')
    const m = ordered.map((c) => c.view.minutesUntilLimit)
    expect(m).toEqual([...m].sort((a, b) => b - a))
  })
  it('every order is offered with a label', () => {
    expect(CANDIDATE_ORDERS.map((o) => o.id)).toEqual(['lookout', 'proximity', 'time_left'])
  })
})

describe('filterCandidates', () => {
  it('empty filters pass everyone', () => {
    expect(filterCandidates(cands, { regions: [], sameRegionOnly: false, search: '' })).toHaveLength(cands.length)
  })
  it('same region only keeps North for Marcus', () => {
    const out = filterCandidates(cands, { regions: [], sameRegionOnly: true, search: '' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((c) => c.view.driver.region === 'North')).toBe(true)
  })
  it('regions narrow and search matches a name or a plate', () => {
    const central = filterCandidates(cands, { regions: ['Central'], sameRegionOnly: false, search: '' })
    expect(central.every((c) => c.view.driver.region === 'Central')).toBe(true)
    const ana = filterCandidates(cands, { regions: [], sameRegionOnly: false, search: 'ana l' })
    expect(ana.map((c) => c.view.driver.id)).toEqual(['drv-08'])
    const plate = filterCandidates(cands, { regions: [], sameRegionOnly: false, search: cands[0].view.truck.plate.toLowerCase() })
    expect(plate[0].view.driver.id).toBe(cands[0].view.driver.id)
  })
})
