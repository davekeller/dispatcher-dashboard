import { describe, expect, it } from 'vitest'
import type { Stop } from '../data/types'
import { routeCompletionPct, routeHosSignal, routeScheduleSignal, type RouteProgressView } from './routeProgress'

const pending = [{} as Stop]

function view(overrides: Partial<RouteProgressView> = {}): RouteProgressView {
  return { driftMin: 0, minutesUntilLimit: 60, remaining: pending, remainingDriveMin: 30, staleness: 'fresh', ...overrides }
}

describe('route progress signals', () => {
  it('shows schedule and HOS fit independently', () => {
    expect(routeScheduleSignal(view())).toEqual({ label: 'Schedule', value: 'On time', tone: 'clear' })
    expect(routeHosSignal(view())).toEqual({ label: 'HOS fit', value: '30 min spare', tone: 'watch' })
  })

  it('shows projected HOS overage before the driver is over', () => {
    expect(routeHosSignal(view({ minutesUntilLimit: 12, remainingDriveMin: 34 }))).toEqual({ label: 'HOS fit', value: '22 min over', tone: 'act_now' })
  })

  it('marks stale overage as estimated', () => {
    expect(routeHosSignal(view({ minutesUntilLimit: -6, staleness: 'offline' }))).toEqual({ label: 'HOS fit', value: '~6 min over', tone: 'act_now' })
  })

  it('treats an empty route as complete', () => {
    expect(routeHosSignal(view({ remaining: [] }))).toEqual({ label: 'HOS fit', value: 'Complete', tone: 'clear' })
  })
})

describe('route completion', () => {
  it('rounds to a whole percentage and treats an empty route as complete', () => {
    expect(routeCompletionPct(14, 16)).toBe(88)
    expect(routeCompletionPct(0, 20)).toBe(0)
    expect(routeCompletionPct(20, 20)).toBe(100)
    expect(routeCompletionPct(0, 0)).toBe(100)
  })
})
