import { describe, expect, it } from 'vitest'
import { makeFleet } from './data/seed'
import { EMPTY_FILTERS, applyFilters, isFiltering } from './filters'
import { derive } from './store/derive'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const d = derive(makeFleet(anchor), anchor, {})

describe('applyFilters', () => {
  it('empty filters pass everything, in rank order', () => {
    expect(applyFilters(d.ranked, d.byId, EMPTY_FILTERS).map((c) => c.driverId)).toEqual(d.ranked.map((c) => c.driverId))
    expect(isFiltering(EMPTY_FILTERS)).toBe(false)
  })
  it('band and freshness narrow', () => {
    const actNow = applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, band: ['act_now'] })
    expect(actNow.map((c) => c.driverId)).toEqual(['drv-02', 'drv-01', 'drv-03'])
    const offline = applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, freshness: ['offline'] })
    expect(offline.map((c) => c.driverId)).toEqual(['drv-03'])
  })
  it('search matches route, driver, or plate, case-insensitive', () => {
    expect(applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, search: 'RT-01' }).map((c) => c.driverId)).toEqual(['drv-01'])
    expect(applyFilters(d.ranked, d.byId, { ...EMPTY_FILTERS, search: 'marc' }).map((c) => c.driverId)).toEqual(['drv-01'])
    expect(isFiltering({ ...EMPTY_FILTERS, search: 'x' })).toBe(true)
  })
})
