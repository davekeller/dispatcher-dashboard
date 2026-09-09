import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { minutesOfStatus, segmentsKnownAt } from '../hos/compute'
import { buildViews } from '../store/view'
import { ANCHOR, MIN } from '../time/clock'
import { contextMarkers } from './markers'

const fleet = makeFleet(ANCHOR)
const at = (t: number) => contextMarkers(buildViews(fleet, t), t)
const drivingAt = (driverId: string, t: number) => minutesOfStatus(segmentsKnownAt(fleet.drivers.find((d) => d.id === driverId)!.segments, t), 'driving', t)

describe('contextMarkers at 2:47', () => {
  const markers = at(ANCHOR)
  it('places Marcus where his driving minutes crossed into Act now', () => {
    const m = markers.find((x) => x.driverId === 'drv-01' && x.kind === 'act_now')!
    expect(m.label).toBe('Marcus R. entered Act now')
    expect(m.estimated).toBe(false)
    expect(drivingAt('drv-01', m.at)).toBeCloseTo(630, 0)
    expect(markers.filter((x) => x.driverId === 'drv-01')).toHaveLength(1)
  })
  it('gives Priya both crossings, the limit six minutes ago', () => {
    const over = markers.find((x) => x.driverId === 'drv-02' && x.kind === 'over')!
    expect(over.label).toBe('Priya S. went over the limit')
    expect(drivingAt('drv-02', over.at)).toBeCloseTo(660, 0)
    expect(over.at).toBeLessThanOrEqual(ANCHOR - 6 * MIN)
    expect(markers.some((x) => x.driverId === 'drv-02' && x.kind === 'act_now')).toBe(true)
  })
  it('marks Dre going dark at his last ping and nothing else', () => {
    const dre = markers.filter((x) => x.driverId === 'drv-03')
    expect(dre).toHaveLength(1)
    expect(dre[0]).toMatchObject({ kind: 'went_dark', label: 'Dre W. stopped pinging', at: ANCHOR - 25 * MIN })
  })
  it('has nothing to say about Ana', () => {
    expect(markers.some((x) => x.driverId === 'drv-08')).toBe(false)
  })
  it('sorts newest first and never places a marker in the future', () => {
    expect(markers.every((m) => m.at <= ANCHOR)).toBe(true)
    expect(markers.map((m) => m.at)).toEqual(markers.map((m) => m.at).sort((a, b) => b - a))
  })
})

describe('contextMarkers against the clock', () => {
  it('has not happened yet when the clock is scrubbed before the crossing', () => {
    const earlier = at(ANCHOR - 30 * MIN)
    expect(earlier.some((x) => x.driverId === 'drv-02' && x.kind === 'over')).toBe(false)
    expect(earlier.some((x) => x.driverId === 'drv-03' && x.kind === 'went_dark')).toBe(false)
  })
  it('flags a crossing on a stale truck as an estimate', () => {
    // Dre projects past 630 once the clock runs on without a ping.
    const later = at(ANCHOR + 20 * MIN)
    const m = later.find((x) => x.driverId === 'drv-03' && x.kind === 'act_now')!
    expect(m.estimated).toBe(true)
  })
})
