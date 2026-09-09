import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from '../store/derive'
import type { ShiftEvent } from '../store/store'
import { ANCHOR, MIN } from '../time/clock'
import { describeEvent, stopsPhrase } from './copy'

const d = derive(makeFleet(ANCHOR), ANCHOR, {})
const stop = (seq: number, customer = `Customer ${seq}`) => ({ id: `s${seq}`, seq, customer })
const base: ShiftEvent = { seq: 2, at: ANCHOR, kind: 'action', label: 'x', driverId: 'drv-01' }

describe('stopsPhrase', () => {
  it('names one stop, a contiguous range, a short list, or a count', () => {
    expect(stopsPhrase([stop(14)])).toBe('stop 14')
    expect(stopsPhrase([stop(14), stop(15)])).toBe('stops 14–15')
    expect(stopsPhrase([stop(14), stop(16)])).toBe('stops 14, 16')
    expect(stopsPhrase([stop(3), stop(5), stop(7), stop(9)])).toBe('4 stops')
    expect(stopsPhrase([])).toBe('no stops')
  })
})

describe('describeEvent', () => {
  it('reads a reassign as what moved, to whom, with the spare time', () => {
    const c = describeEvent({ ...base, detail: { type: 'reassign', fromId: 'drv-01', toId: 'drv-08', stops: [stop(14, 'Harbor Foods'), stop(15, 'Northside Clinic')], spareAfterMin: 318 } }, d)
    expect(c.title).toBe('Reassigned stops 14–15 to Ana L.')
    expect(c.rows).toEqual(['Stop 14 · Harbor Foods', 'Stop 15 · Northside Clinic', 'Ana has 5:18 of drive time spare after the move'])
  })
  it('reads a reset with its window and who is orphaned', () => {
    const c = describeEvent({ ...base, detail: { type: 'schedule_reset', afterStop: stop(13), resetStartsAt: ANCHOR + 15 * MIN, resetEndsAt: ANCHOR + 615 * MIN, orphaned: [stop(14), stop(15)] } }, d)
    expect(c.title).toBe('Scheduled a reset after stop 13')
    expect(c.rows[0]).toMatch(/^Off duty 3:02 PM – 1:02 AM$/)
    expect(c.rows[1]).toBe('Stops 14–15 after that point need a driver')
    expect(describeEvent({ ...base, detail: { type: 'schedule_reset', afterStop: null, resetStartsAt: ANCHOR, resetEndsAt: ANCHOR + 600 * MIN, orphaned: [] } }, d).title).toBe('Scheduled a reset now')
  })
  it('reads a call with the ping age and a snooze with the rule', () => {
    expect(describeEvent({ ...base, driverId: 'drv-03', detail: { type: 'call_driver', pingAgeMin: 25.4 } }, d)).toMatchObject({ title: 'Called Dre W.', rows: ['No ping for 25 min'] })
    expect(describeEvent({ ...base, kind: 'snooze', detail: { type: 'snooze', ruleLabel: 'Offline', until: ANCHOR + 10 * MIN } }, d)).toMatchObject({ title: 'Snoozed Offline on Marcus R.', rows: ['Until 2:57 PM'] })
  })
  it('reads a note, a cleared note, and a cancel', () => {
    expect(describeEvent({ ...base, detail: { type: 'stop_note', stop: stop(9, 'Acme'), note: 'Gate code 4411', was: 'Ring twice' } }, d)).toMatchObject({ title: 'Note on stop 9 · Acme', rows: ['“Gate code 4411”', 'Replaced “Ring twice”'] })
    expect(describeEvent({ ...base, detail: { type: 'stop_note', stop: stop(9, 'Acme'), note: '', was: 'Ring twice' } }, d).title).toBe('Cleared the note on stop 9 · Acme')
    expect(describeEvent({ ...base, detail: { type: 'cancel_stop', stop: stop(9, 'Acme') } }, d).title).toBe('Canceled stop 9 · Acme')
  })
  it('falls back to the label when an event has no detail', () => {
    expect(describeEvent({ ...base, label: 'Something happened' }, d)).toEqual({ title: 'Something happened', rows: [] })
  })
})
