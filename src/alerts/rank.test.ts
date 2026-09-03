import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { MIN } from '../time/clock'
import { buildViews } from '../store/view'
import { evaluateRules, rankDrivers } from './rank'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const fleet = makeFleet(anchor)

function rankedAt(now: number, snoozes: Record<string, number> = {}) {
  const views = buildViews(fleet, now)
  return rankDrivers(views, evaluateRules(views), snoozes, now)
}

describe('rankDrivers', () => {
  it('produces one card per driver', () => {
    const ranked = rankedAt(anchor)
    expect(ranked).toHaveLength(fleet.drivers.length)
    expect(new Set(ranked.map((c) => c.driverId)).size).toBe(fleet.drivers.length)
  })
  it('orders by severity, then time to violation, then staleness', () => {
    const top = rankedAt(anchor).slice(0, 3).map((c) => c.driverId)
    expect(top).toEqual(['drv-02', 'drv-01', 'drv-03']) // Priya (critical), Marcus (12 min), Dre (~40, offline)
  })
  it('is deterministic, and the alerted order holds across a tick', () => {
    const a = rankedAt(anchor)
    expect(rankedAt(anchor).map((c) => c.driverId)).toEqual(a.map((c) => c.driverId))
    const alerted = (cards: ReturnType<typeof rankedAt>) => cards.filter((c) => c.alerts.length > 0).map((c) => c.driverId)
    const before = alerted(a)
    const after = alerted(rankedAt(anchor + 5000))
    // Same drivers in the same order five seconds later. A driver may only move when a
    // rule starts or stops firing inside the tick, which none do at the anchor.
    expect(after).toEqual(before)
    expect(before.slice(0, 3)).toEqual(['drv-02', 'drv-01', 'drv-03'])
  })
  it('snooze demotes within a severity but never removes an act-now card', () => {
    const snoozes = { 'limit_act_now:drv-01': anchor + 10 * MIN, 'wont_finish:drv-01': anchor + 10 * MIN, 'behind_schedule:drv-01': anchor + 10 * MIN }
    const ranked = rankedAt(anchor, snoozes)
    const marcus = ranked.find((c) => c.driverId === 'drv-01')!
    expect(marcus.snoozed).toBe(true)
    expect(marcus.severity).toBe('act_now')
    expect(ranked.findIndex((c) => c.driverId === 'drv-03')).toBeLessThan(ranked.findIndex((c) => c.driverId === 'drv-01'))
  })
  it('snooze expires with the clock', () => {
    const snoozes = { 'limit_act_now:drv-01': anchor + 1 * MIN, 'wont_finish:drv-01': anchor + 1 * MIN, 'behind_schedule:drv-01': anchor + 1 * MIN }
    expect(rankedAt(anchor + 2 * MIN, snoozes).find((c) => c.driverId === 'drv-01')!.snoozed).toBe(false)
  })
})
