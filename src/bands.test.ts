import { describe, expect, it } from 'vitest'
import { makeFleet } from './data/seed'
import { buildViews } from './store/view'
import { evaluateRules, rankDrivers } from './alerts/rank'
import { MIN } from './time/clock'
import { makeFleet as mk } from './data/seed'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()
const views = buildViews(makeFleet(anchor), anchor)
const cards = rankDrivers(views, evaluateRules(views), {}, anchor)
const bandOf = (id: string) => cards.find((c) => c.driverId === id)!.band

describe('bands', () => {
  it('offline inside the watch window is Act now; Priya over the limit is Act now', () => {
    expect(bandOf('drv-03')).toBe('act_now')
    expect(bandOf('drv-02')).toBe('act_now')
  })
  it('stale never moves a card: Nadia is Clear with a tilde, not Offline', () => {
    expect(bandOf('drv-06')).toBe('clear')
  })
  it('a dark driver with a clear HOS lands in the Offline band, not Watch', () => {
    const later = anchor + 12 * MIN // Nadia's ping is now 16 minutes old
    const vs = buildViews(mk(anchor), later)
    const cs = rankDrivers(vs, evaluateRules(vs), {}, later)
    expect(cs.find((c) => c.driverId === 'drv-06')!.band).toBe('offline')
  })
  it('on break, clear, and behind-schedule-with-clear-HOS land where expected', () => {
    expect(bandOf('drv-04')).toBe('break')
    expect(bandOf('drv-08')).toBe('clear')
    expect(bandOf('drv-07')).toBe('watch')
  })
})
