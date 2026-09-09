import { multi, text, type FilterState, type FilterValue } from '../filters'
import { FAMILY_LABEL, FAMILY_ORDER, type ActivityItem } from './derive'

// Filters are data here too. Adding one is one object; the panel renders whatever is here.
export interface ActivityFilterDef {
  id: string
  label: string
  kind: 'multi' | 'text'
  options?: { value: string; label: string }[]
  apply: (item: ActivityItem, value: FilterValue) => boolean
}

export const ACTIVITY_FILTERS: ActivityFilterDef[] = [
  { id: 'family', label: 'What', kind: 'multi', options: FAMILY_ORDER.map((f) => ({ value: f, label: FAMILY_LABEL[f] })), apply: (i, value) => multi(value).length === 0 || multi(value).includes(i.family) },
  { id: 'search', label: 'Search drivers, stops, or customers', kind: 'text', apply: (i, value) => { const q = text(value); return q === '' || i.text.includes(q) } },
]

export const EMPTY_ACTIVITY_FILTERS: FilterState = Object.fromEntries(ACTIVITY_FILTERS.map((f) => [f.id, f.kind === 'multi' ? [] : '']))

export function applyActivityFilters(items: ActivityItem[], state: FilterState): ActivityItem[] {
  return items.filter((i) => ACTIVITY_FILTERS.every((f) => f.apply(i, state[f.id] ?? EMPTY_ACTIVITY_FILTERS[f.id])))
}

export function isFilteringActivity(state: FilterState): boolean {
  return ACTIVITY_FILTERS.some((f) => (f.kind === 'multi' ? multi(state[f.id]).length > 0 : text(state[f.id]) !== ''))
}
