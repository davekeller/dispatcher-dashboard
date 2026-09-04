import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { derive } from './derive'

const anchor = new Date(2026, 8, 3, 12, 47, 0, 0).getTime()

describe('derive', () => {
  it('memoizes on fleet, now, and snoozes identity', () => {
    const fleet = makeFleet(anchor)
    const snoozes = {}
    expect(derive(fleet, anchor, snoozes)).toBe(derive(fleet, anchor, snoozes))
    expect(derive(fleet, anchor + 5000, snoozes)).not.toBe(derive(fleet, anchor, snoozes))
  })
  it('one source of truth: every alert belongs to exactly one ranked card', () => {
    const d = derive(makeFleet(anchor), anchor, {})
    const fromCards = d.ranked.flatMap((c) => c.alerts.map((a) => a.id)).sort()
    expect(fromCards).toEqual(d.alerts.map((a) => a.id).sort())
  })
  it('metrics count what the board shows', () => {
    const d = derive(makeFleet(anchor), anchor, {})
    expect(d.metrics.over).toBe(1)
    expect(d.metrics.offline).toBe(1)
    expect(d.metrics.approaching).toBe(d.views.filter((v) => v.hos === 'act_now' || v.hos === 'watch').length)
    expect(d.metrics.onShift).toBeGreaterThanOrEqual(48)
    expect(d.metrics.needDriver).toBe(0)
    expect(d.metrics.stopsDelivered).toBe(d.views.reduce((total, view) => total + view.route.stops.filter((stop) => stop.status === 'done').length, 0))
    expect(d.metrics.stopsFailed).toBe(d.views.reduce((total, view) => total + view.route.stops.filter((stop) => stop.status === 'failed').length, 0))
  })
})
