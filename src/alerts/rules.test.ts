import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
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
