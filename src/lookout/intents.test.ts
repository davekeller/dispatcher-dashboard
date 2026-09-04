import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from '../store/derive'
import { INTENTS, matchIntent } from './intents'

const anchor = new Date(2026, 8, 3, 14, 47, 0, 0).getTime()
const d = derive(makeFleet(anchor), anchor, {})

describe('matchIntent', () => {
  it('near the limit returns the urgent drivers, most urgent first, within the asked window', () => {
    const r = matchIntent("who's within 30 min of the limit?", d)
    expect(r.driverIds).toEqual(['drv-02', 'drv-01'])
    expect(matchIntent('who is near the limit', d).driverIds).toEqual(['drv-02', 'drv-01', 'drv-03', 'drv-09', 'drv-10'])
  })
  it('offline returns anyone not fresh', () => {
    expect(matchIntent('show me who is offline', d).driverIds).toEqual(['drv-03', 'drv-06'])
  })
  it('reassign opens the picker for a named driver and asks otherwise', () => {
    expect(matchIntent("reassign Marcus's stops", d).open).toEqual({ action: 'reassign', driverId: 'drv-01' })
    expect(matchIntent('reassign the stops', d).open).toBeUndefined()
  })
  it('no match lists what Lookout can do', () => {
    const r = matchIntent('what is the weather', d)
    expect(r.examples).toEqual(INTENTS.map((i) => i.example))
  })
})
