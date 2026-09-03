import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { remainingStops } from '../hos/compute'
import { bringOnline, notifyCustomer, scheduleReset } from '../store/actions'
import { MIN } from '../time/clock'
import { buildViews } from '../store/view'
import { evaluateRules } from './rank'
import { RULES } from './rules'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const views = buildViews(makeFleet(anchor), anchor)
const alerts = evaluateRules(views)
const idsFor = (driverId: string) => alerts.filter((a) => a.driverId === driverId).map((a) => a.ruleId).sort()

describe('rules shape', () => {
  it('every rule has a unique id, a label, and at least one action', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length)
    for (const r of RULES) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.actions.length).toBeGreaterThan(0)
    }
  })
})

describe('planted drivers trip exactly the rules the spec says', () => {
  it("Marcus: approaching (act now), won't finish, behind schedule", () => {
    expect(idsFor('drv-01')).toEqual(['behind_schedule', 'limit_act_now', 'wont_finish'])
  })
  it('Priya: over the limit', () => {
    expect(idsFor('drv-02')).toEqual(['over_limit'])
  })
  it('Dre: offline near the limit', () => {
    expect(idsFor('drv-03')).toEqual(['offline_near_limit'])
  })
  it('Elena on break and Sam without a break rule yet: nothing', () => {
    expect(idsFor('drv-04')).toEqual([])
    expect(idsFor('drv-05')).toEqual([])
  })
  it('Nadia, Ravi, Omar: watch', () => {
    expect(idsFor('drv-06')).toEqual(['limit_watch'])
    expect(idsFor('drv-09')).toEqual(['limit_watch'])
    expect(idsFor('drv-10')).toEqual(['limit_watch'])
  })
  it('Tomas: behind schedule only', () => {
    expect(idsFor('drv-07')).toEqual(['behind_schedule'])
  })
  it('Ana: nothing', () => {
    expect(idsFor('drv-08')).toEqual([])
  })
})

describe('copy', () => {
  it('reads like a colleague and carries the tilde when stale', () => {
    const marcus = alerts.find((a) => a.id === 'limit_act_now:drv-01')!
    expect(marcus.title).toMatch(/^Marcus R\. hits the limit in 12 min/)
    const dre = alerts.find((a) => a.id === 'offline_near_limit:drv-03')!
    expect(dre.title).toBe("Dre W. hasn't pinged in 25 min.")
    expect(dre.body).toContain('~40 min')
  })
})

describe('edge paths change the copy, not just the numbers', () => {
  const fleet = makeFleet(anchor)
  it('after a reset, the unassigned rule fires and the approaching rule reads the shorter route', () => {
    const marcusStops = remainingStops(fleet.routes.find((r) => r.driverId === 'drv-01')!).map((s) => s.id)
    const next = scheduleReset(fleet, 'drv-01', marcusStops[0], anchor)
    const ids = evaluateRules(buildViews(next, anchor)).filter((a) => a.driverId === 'drv-01').map((a) => a.ruleId).sort()
    expect(ids).toEqual(['behind_schedule', 'limit_act_now', 'stops_unassigned'])
  })
  it('after notifying, the schedule rule says so', () => {
    const tomasStops = remainingStops(fleet.routes.find((r) => r.driverId === 'drv-07')!).map((s) => s.id)
    const next = notifyCustomer(fleet, tomasStops, anchor)
    const a = evaluateRules(buildViews(next, anchor)).find((x) => x.id === 'behind_schedule:drv-07')!
    expect(a.body).toBe('Customers have been notified.')
  })
  it('when Dre reconnects the offline rule clears and nothing else fires', () => {
    const next = bringOnline(fleet, 'drv-03', anchor)
    expect(evaluateRules(buildViews(next, anchor)).filter((a) => a.driverId === 'drv-03')).toEqual([])
  })
  it('an hour later Marcus is over, and over-limit is the only limit rule on him', () => {
    const ids = evaluateRules(buildViews(fleet, anchor + 60 * MIN)).filter((a) => a.driverId === 'drv-01').map((a) => a.ruleId).sort()
    expect(ids).toEqual(['behind_schedule', 'over_limit'])
  })
})
