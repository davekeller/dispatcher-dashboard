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
  it('is stable across a tick for every driver whose alerts did not change', () => {
    // A driver can legitimately move when a rule starts or stops firing inside the tick
    // (drift crossing 15 min, say). Everyone else must hold their relative order.
    const a = rankedAt(anchor)
    const b = rankedAt(anchor + 5000)
    const key = (c: { severity: string; alerts: { id: string }[] }) => `${c.severity}:${c.alerts.map((x) => x.id).join(',')}`
    const keyA = new Map(a.map((c) => [c.driverId, key(c)]))
    const unchanged = new Set(b.filter((c) => keyA.get(c.driverId) === key(c)).map((c) => c.driverId))
    expect(unchanged.size).toBeGreaterThan(40)
    expect(b.filter((c) => unchanged.has(c.driverId)).map((c) => c.driverId)).toEqual(a.filter((c) => unchanged.has(c.driverId)).map((c) => c.driverId))
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
