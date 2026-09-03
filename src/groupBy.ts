import type { DriverCard } from './alerts/types'
import { BAND_LABEL, BAND_ORDER } from './bands'
import { REGIONS } from './data/regions'
import type { DriverView } from './store/view'

// Column grouping is config. Same cards, same rank, different column function.
export type GroupingId = 'region' | 'band'

export interface Grouping {
  id: GroupingId
  label: string
  columns: { key: string; label: string }[]
  keyOf: (v: DriverView, c: DriverCard) => string
}

export const GROUPINGS: Grouping[] = [
  { id: 'region', label: 'Region', columns: REGIONS.map((r) => ({ key: r, label: r })), keyOf: (v) => v.driver.region },
  { id: 'band', label: 'Status', columns: BAND_ORDER.map((b) => ({ key: b, label: BAND_LABEL[b] })), keyOf: (_v, c) => c.band },
]

export function groupingById(id: GroupingId): Grouping {
  return GROUPINGS.find((g) => g.id === id) ?? GROUPINGS[0]
}
