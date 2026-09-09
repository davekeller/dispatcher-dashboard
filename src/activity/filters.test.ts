import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from '../store/derive'
import type { ShiftEvent } from '../store/store'
import { ANCHOR, MIN } from '../time/clock'
import { activityFeed } from './derive'
import { ACTIVITY_FILTERS, EMPTY_ACTIVITY_FILTERS, applyActivityFilters, isFilteringActivity } from './filters'

const d = derive(makeFleet(ANCHOR), ANCHOR, {})
const events: ShiftEvent[] = [
  { seq: 1, at: ANCHOR - 60 * MIN, kind: 'system', label: 'Lookout started watching the shift' },
  { seq: 2, at: ANCHOR - 3 * MIN, kind: 'action', label: 'Call to Dre W. logged', driverId: 'drv-03', detail: { type: 'call_driver', pingAgeMin: 22 } },
  { seq: 3, at: ANCHOR - 1 * MIN, kind: 'action', label: "Marcus R.'s stops reassigned to Ana L.", driverId: 'drv-01', detail: { type: 'reassign', fromId: 'drv-01', toId: 'drv-08', stops: [{ id: 's1', seq: 14, customer: 'Harbor Foods' }], spareAfterMin: 300 } },
]
const feed = activityFeed(events, d)

describe('activity filters', () => {
  it('is two filters: what she did, and a search', () => {
    expect(ACTIVITY_FILTERS.map((f) => f.id)).toEqual(['family', 'search'])
  })
  it('keeps everything when nothing is chosen', () => {
    expect(applyActivityFilters(feed, EMPTY_ACTIVITY_FILTERS)).toHaveLength(feed.length)
    expect(isFilteringActivity(EMPTY_ACTIVITY_FILTERS)).toBe(false)
  })
  it('narrows to a family', () => {
    const only = applyActivityFilters(feed, { ...EMPTY_ACTIVITY_FILTERS, family: ['contact'] })
    expect(only).toHaveLength(1)
    expect(only[0].kind === 'card' && only[0].event.seq).toBe(2)
    expect(isFilteringActivity({ ...EMPTY_ACTIVITY_FILTERS, family: ['contact'] })).toBe(true)
  })
  it('searches names and customers, case-insensitively', () => {
    expect(applyActivityFilters(feed, { ...EMPTY_ACTIVITY_FILTERS, search: 'harbor' }).map((i) => i.kind === 'card' && i.event.seq)).toEqual([3])
    expect(applyActivityFilters(feed, { ...EMPTY_ACTIVITY_FILTERS, search: 'DRE' }).every((i) => i.driverId === 'drv-03')).toBe(true)
  })
})
