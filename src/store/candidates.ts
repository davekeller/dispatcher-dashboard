import type { LatLng } from '../data/types'
import type { Candidate } from './actions'
import type { DriverView } from './view'

// The reassign picker mirrors the board's navigation: an order, manual filters, and search.
// Lookout's order (same region first, then most spare drive time) is the default; the
// others only re-sequence the same candidates. Nobody outside the capacity margin is ever
// added back by an order or a filter.

export type CandidateOrder = 'lookout' | 'proximity' | 'time_left'

export const CANDIDATE_ORDERS: { id: CandidateOrder; label: string; hint: string }[] = [
  { id: 'lookout', label: 'Ordered by Lookout', hint: 'Same region first, then the most spare drive time' },
  { id: 'proximity', label: 'Closest first', hint: 'Distance between the trucks right now' },
  { id: 'time_left', label: 'Most drive time left', hint: 'Minutes until the 11-hour limit' },
]

const EARTH_KM = 6371

/** Great-circle distance between two positions, in kilometers. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

export function orderCandidates(cands: Candidate[], from: DriverView, order: CandidateOrder): Candidate[] {
  if (order === 'lookout') return cands
  const index = new Map(cands.map((c, i) => [c.view.driver.id, i]))
  const fallback = (a: Candidate, b: Candidate) => (index.get(a.view.driver.id) ?? 0) - (index.get(b.view.driver.id) ?? 0)
  return [...cands].sort((a, b) => {
    if (order === 'proximity') return distanceKm(from.truck.position, a.view.truck.position) - distanceKm(from.truck.position, b.view.truck.position) || fallback(a, b)
    return b.view.minutesUntilLimit - a.view.minutesUntilLimit || fallback(a, b)
  })
}

export interface CandidateFilters {
  regions: string[]
  sameRegionOnly: boolean
  search: string
}

export const EMPTY_CANDIDATE_FILTERS: CandidateFilters = { regions: [], sameRegionOnly: false, search: '' }

export function filterCandidates(cands: Candidate[], f: CandidateFilters): Candidate[] {
  const q = f.search.trim().toLowerCase()
  return cands.filter((c) => {
    if (f.sameRegionOnly && !c.sameRegion) return false
    if (f.regions.length > 0 && !f.regions.includes(c.view.driver.region)) return false
    if (q && !c.view.driver.name.toLowerCase().includes(q) && !c.view.truck.plate.toLowerCase().includes(q)) return false
    return true
  })
}

export function isFilteringCandidates(f: CandidateFilters): boolean {
  return f.regions.length > 0 || f.sameRegionOnly || f.search.trim() !== ''
}
