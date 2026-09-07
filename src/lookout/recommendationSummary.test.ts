import { describe, expect, it } from 'vitest'
import { recommendationSummary, type RecommendationContext } from './recommendationSummary'

const context: RecommendationContext = {
  minutesUntilLimit: 12,
  remainingStops: 3,
  remainingDriveMin: 34,
  driftMin: 68,
  unnotifiedLateStops: 10,
  unassignedStops: 2,
  pingAgeMin: 25,
}

describe('recommendationSummary', () => {
  it('turns overlapping limit alerts into distinct evidence and action bullets', () => {
    expect(recommendationSummary('limit_act_now', context, 'fallback')).toBe('Act within 12 min; 34 min of driving remains.')
    expect(recommendationSummary('wont_finish', context, 'fallback')).toBe('Reassign remaining stops or schedule a reset.')
  })

  it('makes critical and late-route summaries actionable', () => {
    expect(recommendationSummary('over_limit', context, 'fallback')).toBe('Stop now; reassign 3 remaining stops.')
    expect(recommendationSummary('behind_schedule', context, 'fallback')).toBe('Notify 10 customers whose windows are at risk.')
  })

  it('keeps offline and unassigned summaries concise', () => {
    expect(recommendationSummary('offline', context, 'fallback')).toBe('Call the driver; no ping for 25 min.')
    expect(recommendationSummary('stops_unassigned', context, 'fallback')).toBe('Assign 2 stops without a driver.')
  })

  it('uses the alert title for an unknown live-added rule', () => {
    expect(recommendationSummary('custom_rule', context, 'Use the live rule copy.')).toBe('Use the live rule copy.')
  })
})
