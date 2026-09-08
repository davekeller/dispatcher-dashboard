import { describe, expect, it } from 'vitest'
import { makeFleet } from '../../data/seed'
import { LIMIT_MIN } from '../../hos/constants'
import { derive } from '../../store/derive'
import { bandBreakdown, closestToLimit, drivingHistogram, freshnessCounts, limitTimeline, metricRows, regionProgress, sinceBreakBins } from './metrics'

const anchor = new Date(2026, 8, 3, 14, 47, 0, 0).getTime()
const dayEnd = new Date(2026, 8, 3, 18, 0, 0, 0).getTime()
const d = derive(makeFleet(anchor), anchor, {})
const rows = metricRows(d.ranked, d.byId)

describe('metrics lens', () => {
  it('counts every truck on the board exactly once, in band order', () => {
    const bands = bandBreakdown(rows)
    expect(bands.map((b) => b.band)).toEqual(['act_now', 'watch', 'break', 'offline', 'clear'])
    expect(bands.reduce((n, b) => n + b.count, 0)).toBe(rows.length)
    expect(rows.length).toBe(d.metrics.trucks)
  })

  it('bins hours driven up to the limit and puts everyone over it in the last bin', () => {
    const bins = drivingHistogram(rows)
    expect(bins).toHaveLength(LIMIT_MIN / 60 + 1)
    expect(bins.reduce((n, b) => n + b.total, 0)).toBe(rows.length)
    expect(bins.at(-1)?.over).toBe(true)
    expect(bins.at(-1)?.total).toBe(d.metrics.over)
    for (const b of bins) expect(Object.values(b.byBand).reduce((n, c) => n + c, 0)).toBe(b.total)
  })

  it('places a driver over the limit at now and the rest along the day in order', () => {
    const marks = limitTimeline(rows, anchor, dayEnd)
    expect(marks[0].over).toBe(true)
    expect(marks[0].x).toBe(0)
    expect(marks[0].minutesUntilLimit).toBeLessThanOrEqual(0)
    expect(marks[0].withinWindow).toBe(true)
    for (let i = 1; i < marks.length; i += 1) expect(marks[i].at).toBeGreaterThanOrEqual(marks[i - 1].at)
    for (const m of marks) expect(m.x).toBeGreaterThanOrEqual(0)
    for (const m of marks) expect(m.x).toBeLessThanOrEqual(1)
    for (const m of marks.filter((mark) => !mark.withinWindow)) expect(m.x).toBe(1)
  })

  it('ranks the closest to the limit with the over-limit driver first', () => {
    const top = closestToLimit(rows, 3)
    expect(top[0].view.minutesUntilLimit).toBeLessThanOrEqual(0)
    expect(top[0].view.minutesUntilLimit).toBeLessThanOrEqual(top[1].view.minutesUntilLimit)
    expect(top[1].view.minutesUntilLimit).toBeLessThanOrEqual(top[2].view.minutesUntilLimit)
  })

  it('adds region deliveries up to the shift totals', () => {
    const regions = regionProgress(rows)
    expect(regions.reduce((n, r) => n + r.drivers, 0)).toBe(rows.length)
    expect(regions.reduce((n, r) => n + r.delivered, 0)).toBe(d.metrics.stopsDelivered)
    expect(regions.reduce((n, r) => n + r.failed, 0)).toBe(d.metrics.stopsFailed)
  })

  it('counts freshness and time since a break over every truck', () => {
    const f = freshnessCounts(rows)
    expect(f.fresh + f.stale + f.offline).toBe(rows.length)
    expect(f.offline).toBe(d.metrics.offline)
    const bins = sinceBreakBins(rows)
    expect(bins.reduce((n, b) => n + b.count, 0)).toBe(rows.length)
    expect(bins.at(-1)?.due).toBe(true)
  })
})
