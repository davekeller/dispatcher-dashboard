import type { DriverCard } from '../../alerts/types'
import type { DriverView } from '../../store/view'

export type BoardSort = 'lookout' | 'limit' | 'stops' | 'data_age'

/** Lookout's ranked array stays the default. Alternate orders only change the board's
 * sequence; they never change alerts, bands, or the Lookout rail. */
export function orderBoardCards(cards: DriverCard[], byId: Map<string, DriverView>, sort: BoardSort): DriverCard[] {
  if (sort === 'lookout') return cards
  const rankedIndex = new Map(cards.map((card, index) => [card.driverId, index]))
  return [...cards].sort((a, b) => {
    const va = byId.get(a.driverId)!
    const vb = byId.get(b.driverId)!
    const fallback = (rankedIndex.get(a.driverId) ?? 0) - (rankedIndex.get(b.driverId) ?? 0)
    if (sort === 'limit') return va.minutesUntilLimit - vb.minutesUntilLimit || fallback
    if (sort === 'stops') return vb.remaining.length - va.remaining.length || fallback
    return vb.pingAgeMin - va.pingAgeMin || fallback
  })
}
