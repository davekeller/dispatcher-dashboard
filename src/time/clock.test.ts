import { describe, expect, it } from 'vitest'
import { MIN, TICK_MS, scenarioAnchor, simNow, toTick } from './clock'

describe('scenarioAnchor', () => {
  it('is 12:47:00 local on the given day', () => {
    const d = new Date(2026, 8, 3, 9, 15, 30)
    const a = new Date(scenarioAnchor(d))
    expect([a.getHours(), a.getMinutes(), a.getSeconds(), a.getMilliseconds()]).toEqual([12, 47, 0, 0])
    expect(a.getDate()).toBe(3)
  })
})

describe('simNow', () => {
  it('advances with wall time from the anchor and adds the scrub offset', () => {
    const anchor = 1_000_000
    const loadedAt = 5_000_000
    expect(simNow(0, loadedAt, loadedAt, anchor)).toBe(anchor)
    expect(simNow(0, loadedAt + 30_000, loadedAt, anchor)).toBe(anchor + 30_000)
    expect(simNow(15 * MIN, loadedAt, loadedAt, anchor)).toBe(anchor + 15 * MIN)
  })
})

describe('toTick', () => {
  it('rounds down to the tick so memo keys are stable', () => {
    expect(toTick(TICK_MS * 3 + 4999)).toBe(TICK_MS * 3)
  })
})
