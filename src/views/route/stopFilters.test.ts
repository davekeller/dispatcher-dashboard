import { describe, expect, it } from 'vitest'
import type { Delivery, Stop } from '../../data/types'
import { MIN } from '../../time/clock'
import { applyStopFilter, isStopFilterId, STOP_FILTERS, stopFilterCounts, stopsNearLimit, type StopFilterContext } from './stopFilters'

const T0 = 1_700_000_000_000

function stop(id: string, status: Stop['status'], driveMinutesFromPrev = 20, plannedEta = T0): Stop {
  return { id, routeId: 'rt-01', deliveryId: `del-${id}`, seq: 0, driveMinutesFromPrev, serviceMinutes: 8, plannedEta, status } as Stop
}
function delivery(id: string, windowEnd: number): Delivery {
  return { id, window: { start: T0 - 60 * MIN, end: windowEnd } } as Delivery
}

// A driver with 50 minutes of drive time left and three 20-minute legs: the first is comfortable,
// the second lands with 10 left (near), the third does not fit (past the limit).
const s1 = stop('s1', 'pending')
const s2 = stop('s2', 'pending')
const s3 = stop('s3', 'pending', 20, T0 + 90 * MIN)
const done = stop('d1', 'done')
const failed = stop('f1', 'failed')
const orphan = stop('u1', 'unassigned')
const stops = [s3, s2, s1, orphan, failed, done]
const ctx: StopFilterContext = {
  driftMin: 0,
  deliveryById: new Map([[s3.deliveryId, delivery(s3.deliveryId, T0 + 60 * MIN)], [s1.deliveryId, delivery(s1.deliveryId, T0 + 60 * MIN)]]),
  pastLimitIds: new Set(['s3']),
  nearLimitIds: new Set(stopsNearLimit({ remaining: [s1, s2, s3], minutesUntilLimit: 50 })),
}

describe('stop filters', () => {
  it('finds the reachable stops that land with little drive time left, and stops at the limit', () => {
    expect(stopsNearLimit({ remaining: [s1, s2, s3], minutesUntilLimit: 50 })).toEqual(['s2'])
    expect(stopsNearLimit({ remaining: [s1, s2, s3], minutesUntilLimit: 200 })).toEqual([])
    expect(stopsNearLimit({ remaining: [s1, s2, s3], minutesUntilLimit: 0 })).toEqual([])
  })

  it('counts every filter from the same predicates the receipts use', () => {
    expect(stopFilterCounts(stops, ctx)).toEqual({ all: 6, past_limit: 1, near_limit: 1, late: 1, failed: 1, unassigned: 1, remaining: 3, done: 1 })
  })

  it('keeps the incoming order and only the matches', () => {
    expect(applyStopFilter(stops, 'past_limit', ctx).map((s) => s.id)).toEqual(['s3'])
    expect(applyStopFilter(stops, 'late', ctx).map((s) => s.id)).toEqual(['s3'])
    expect(applyStopFilter(stops, 'remaining', ctx).map((s) => s.id)).toEqual(['s3', 's2', 's1'])
    expect(applyStopFilter(stops, 'all', ctx)).toEqual(stops)
  })

  it('marks issues with a band tone and states with none', () => {
    const issues = STOP_FILTERS.filter((f) => f.tone).map((f) => f.id)
    expect(issues).toEqual(['past_limit', 'near_limit', 'late', 'failed', 'unassigned'])
  })

  it('accepts only ids that exist, so a stale URL falls back to all', () => {
    expect(isStopFilterId('past_limit')).toBe(true)
    expect(isStopFilterId('nope')).toBe(false)
    expect(isStopFilterId(null)).toBe(false)
  })
})
