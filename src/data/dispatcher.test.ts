import { describe, expect, it } from 'vitest'
import { fmtClock } from '../lib/format'
import { ANCHOR, DAY_END, DAY_START } from '../time/clock'
import { DISPATCHER, shiftWindow } from './dispatcher'

describe('the dispatcher', () => {
  it('works a day shift that sits inside the simulated day', () => {
    const { start, end } = shiftWindow(DISPATCHER)
    expect(start).toBeGreaterThanOrEqual(DAY_START)
    expect(end).toBeLessThanOrEqual(DAY_END)
    expect(start).toBeLessThan(end)
  })

  it('is at her desk at 2:47 PM, where the shift is pinned', () => {
    const { start, end } = shiftWindow(DISPATCHER)
    expect(ANCHOR).toBeGreaterThan(start)
    expect(ANCHOR).toBeLessThan(end)
  })

  it('formats her shift with the product clock', () => {
    const { start, end } = shiftWindow(DISPATCHER)
    expect(fmtClock(start)).toBe('6:00 AM')
    expect(fmtClock(end)).toBe('4:00 PM')
  })
})
