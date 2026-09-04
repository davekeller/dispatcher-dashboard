import { describe, expect, it } from 'vitest'
import { completedStopLightWeight, miniTimelineLayout } from './RouteTimelineMini'

describe('miniTimelineLayout', () => {
  it('keeps short route histories evenly distributed', () => {
    const layout = miniTimelineLayout(['done', 'done', 'pending', 'pending'])

    expect(layout.historyCompressed).toBe(false)
    expect(layout.positions).toEqual([5, 35, 65, 95])
  })

  it('compresses a long completed prefix and gives remaining stops more room', () => {
    const layout = miniTimelineLayout([
      ...Array<string>(12).fill('done'),
      'in_progress',
      'pending',
      'pending',
    ])

    expect(layout.historyCompressed).toBe(true)
    expect(layout.firstRemainingIndex).toBe(12)
    expect(layout.positions[11] - layout.positions[0]).toBeLessThan(35)
    expect(layout.positions[14] - layout.positions[12]).toBeGreaterThan(30)
    expect(layout.positions.every((position, index) => index === 0 || position > layout.positions[index - 1])).toBe(true)
  })

  it('does not compress a completed route with no remaining focus', () => {
    const layout = miniTimelineLayout(Array<string>(16).fill('done'))

    expect(layout.historyCompressed).toBe(false)
    expect(layout.firstRemainingIndex).toBe(-1)
    expect(layout.positions.at(-1)).toBe(95)
  })

  it('grades completed stops from light at the start to dark at the progress edge', () => {
    expect(completedStopLightWeight(0, 10)).toBe(100)
    expect(completedStopLightWeight(5, 10)).toBe(50)
    expect(completedStopLightWeight(10, 10)).toBe(0)
  })
})
