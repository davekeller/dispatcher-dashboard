import type { LatLng, Region } from './types'

export const REGIONS: Region[] = ['North', 'West', 'South', 'Central']

// One invented metro, Chicago-shaped. Centers are approximate; streets and
// addresses are made up. Four regions so the board fits beside the open rail.
export const REGION_CENTER: Record<Region, LatLng> = {
  North: { lat: 42.02, lng: -87.72 },
  West: { lat: 41.87, lng: -87.85 },
  South: { lat: 41.72, lng: -87.62 },
  Central: { lat: 41.88, lng: -87.64 },
}

// Leg length ranges in minutes. Outer regions drive longer between stops.
export const REGION_LEG_MINUTES: Record<Region, [number, number]> = {
  North: [10, 26],
  West: [12, 30],
  South: [16, 35],
  Central: [8, 18],
}
