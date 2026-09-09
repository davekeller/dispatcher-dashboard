import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from '../store/derive'
import type { ShiftEvent } from '../store/store'
import { ANCHOR, MIN } from '../time/clock'
import { activityFeed, familyOf, groupByHour } from './derive'

const fleet = makeFleet(ANCHOR)
const d = derive(fleet, ANCHOR, {})
const HOUR = 60 * MIN

const system: ShiftEvent = { seq: 1, at: ANCHOR - 2 * HOUR, kind: 'system', label: 'Lookout started watching the shift' }
const call: ShiftEvent = { seq: 2, at: ANCHOR - 3 * MIN, kind: 'action', label: 'Call to Dre W. logged', driverId: 'drv-03', detail: { type: 'call_driver', pingAgeMin: 22 }, context: { hos: 'watch', staleness: 'offline', minutesUntilLimit: 40, severity: 'act_now', alerts: ['Offline'] } }
const undo: ShiftEvent = { seq: 3, at: ANCHOR - 2 * MIN, kind: 'undo', label: 'Undone: Call to Dre W. logged', driverId: 'drv-03', detail: { type: 'undo', targetSeq: 2 } }
const reassign: ShiftEvent = { seq: 4, at: ANCHOR - 1 * MIN, kind: 'action', label: "Marcus R.'s stops reassigned to Ana L.", driverId: 'drv-01', detail: { type: 'reassign', fromId: 'drv-01', toId: 'drv-08', stops: [{ id: 's1', seq: 14, customer: 'Harbor Foods' }], spareAfterMin: 300 } }

describe('activityFeed', () => {
  const feed = activityFeed([system, call, undo, reassign], d)
  it('folds an undo onto the card it reversed instead of listing it', () => {
    const item = feed.find((i) => i.kind === 'card' && i.event.seq === 2)
    expect(item?.kind === 'card' && item.undoneAt).toBe(undo.at)
    expect(feed.some((i) => i.kind === 'card' && i.event.kind === 'undo')).toBe(false)
  })
  it('turns the opening system event into a marker, not a card', () => {
    const item = feed.find((i) => i.at === system.at)
    expect(item?.kind).toBe('marker')
  })
  it('weaves the derived context markers in with her actions, newest first', () => {
    expect(feed.some((i) => i.kind === 'marker' && i.driverId === 'drv-03')).toBe(true)
    expect(feed.map((i) => i.at)).toEqual(feed.map((i) => i.at).sort((a, b) => b - a))
    expect(feed[0].kind === 'card' && feed[0].event.seq).toBe(4)
  })
  it('gives every item a searchable haystack: names, customers, stop numbers', () => {
    const item = feed.find((i) => i.kind === 'card' && i.event.seq === 4)!
    expect(item.text).toContain('marcus')
    expect(item.text).toContain('ana')
    expect(item.text).toContain('harbor foods')
    expect(item.text).toContain('14')
  })
})

describe('familyOf', () => {
  it('sorts each action into its family', () => {
    expect(familyOf(reassign)).toBe('routing')
    expect(familyOf(call)).toBe('contact')
    expect(familyOf({ ...call, kind: 'snooze', detail: { type: 'snooze', ruleLabel: 'Offline', until: ANCHOR } })).toBe('snoozes')
    expect(familyOf({ ...call, detail: { type: 'stop_note', stop: { id: 's', seq: 3, customer: 'X' }, note: 'gate code 4411' } })).toBe('notes')
    expect(familyOf({ ...call, kind: 'reconnect', detail: { type: 'reconnect', darkForMin: 25, wasMin: 40, nowMin: 45 } })).toBe('shift')
    expect(familyOf(system)).toBe('shift')
  })
})

describe('groupByHour', () => {
  it('buckets by the hour the item landed in, newest hour first', () => {
    const feed = activityFeed([system, call, reassign], d)
    const groups = groupByHour(feed)
    expect(groups[0].items.map((i) => i.at)).toContain(reassign.at)
    expect(groups.every((g) => g.items.every((i) => i.at >= g.hourStart && i.at < g.hourStart + HOUR))).toBe(true)
    expect(groups.map((g) => g.hourStart)).toEqual(groups.map((g) => g.hourStart).sort((a, b) => b - a))
    expect(new Date(groups[0].hourStart).getMinutes()).toBe(0)
  })
})
