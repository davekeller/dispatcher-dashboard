import { describe, expect, it } from 'vitest'
import { completedStopLightWeight, miniTimelineLayout } from './routeTimeline'

describe('miniTimelineLayout', () => {
  it('keeps route stops evenly distributed', () => {
    const layout = miniTimelineLayout(['done', 'done', 'pending', 'pending'])

    expect(layout.positions).toEqual([5, 35, 65, 95])
  })

  it('uses the same scale when completed work dominates', () => {
    const layout = miniTimelineLayout([
      ...Array<string>(12).fill('done'),
      'in_progress',
      'pending',
      'pending',
    ])

    expect(layout.positions[0]).toBe(5)
    expect(layout.positions[12]).toBeCloseTo(82.14, 2)
    expect(layout.positions[14]).toBe(95)
    expect(layout.positions.every((position, index) => index === 0 || position > layout.positions[index - 1])).toBe(true)
  })

  it('does not change spacing at the completed-to-pending boundary', () => {
    const layout = miniTimelineLayout([
      ...Array<string>(15).fill('done'),
      ...Array<string>(5).fill('pending'),
    ])

    const stepBeforeBoundary = layout.positions[14] - layout.positions[13]
    const stepAfterBoundary = layout.positions[15] - layout.positions[14]
    expect(stepBeforeBoundary).toBeCloseTo(stepAfterBoundary)
    expect(layout.positions.at(-1)).toBe(95)
  })

  it('grades completed stops from light at the start to dark at the progress edge', () => {
    expect(completedStopLightWeight(0, 10)).toBe(100)
    expect(completedStopLightWeight(5, 10)).toBe(50)
    expect(completedStopLightWeight(10, 10)).toBe(0)
  })
})
