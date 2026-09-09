import { RULES } from './alerts/rules'
import type { DriverCard, Severity } from './alerts/types'
import { BAND_LABEL, BAND_ORDER } from './bands'
import { REGIONS } from './data/regions'
import type { DriverView } from './store/view'

// Filters are data. Adding one is one object; the FilterBar renders whatever is here.
export type FilterValue = string[] | string
export type FilterState = Record<string, FilterValue>

/** One choice in a multi filter. Alert options carry their rule's severity so the menu can show them as the
 *  badges she sees on cards, and a note when two rules share a label (the two Approaching limits, the two Offlines). */
export interface FilterOption {
  value: string
  label: string
  severity?: Severity
  note?: string
}

export interface FilterDef {
  id: string
  label: string
  kind: 'multi' | 'text'
  options?: FilterOption[]
  apply: (v: DriverView, c: DriverCard, value: FilterValue) => boolean
}

const multi = (value: FilterValue): string[] => (Array.isArray(value) ? value : [])
const text = (value: FilterValue): string => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const SEVERITY_WORD: Record<Severity, string> = { critical: 'over', act_now: 'act now', watch: 'watch', info: 'info' }
// One option per rule, wearing its severity; rules that share a label carry a note so the two Approaching limits and two Offlines stay apart.
const ALERT_OPTIONS: FilterOption[] = RULES.map((r) => ({ value: r.id, label: r.label, severity: r.severity, note: RULES.filter((x) => x.label === r.label).length > 1 ? SEVERITY_WORD[r.severity] : undefined }))

export const FILTERS: FilterDef[] = [
  { id: 'alert', label: 'Alert', kind: 'multi', options: ALERT_OPTIONS, apply: (_v, c, value) => multi(value).length === 0 || c.alerts.some((a) => multi(value).includes(a.ruleId)) },
  { id: 'band', label: 'Status', kind: 'multi', options: BAND_ORDER.map((b) => ({ value: b, label: BAND_LABEL[b] })), apply: (_v, c, value) => multi(value).length === 0 || multi(value).includes(c.band) },
  { id: 'freshness', label: 'Data', kind: 'multi', options: [{ value: 'fresh', label: 'Fresh' }, { value: 'stale', label: 'Stale' }, { value: 'offline', label: 'Offline' }], apply: (v, _c, value) => multi(value).length === 0 || multi(value).includes(v.staleness) },
  { id: 'region', label: 'Region', kind: 'multi', options: REGIONS.map((r) => ({ value: r, label: r })), apply: (v, _c, value) => multi(value).length === 0 || multi(value).includes(v.driver.region) },
  { id: 'search', label: 'Search routes, drivers, or trucks', kind: 'text', apply: (v, _c, value) => { const q = text(value); return q === '' || v.route.id.toLowerCase().includes(q) || v.driver.name.toLowerCase().includes(q) || v.truck.plate.toLowerCase().includes(q) } },
]

export const EMPTY_FILTERS: FilterState = Object.fromEntries(FILTERS.map((f) => [f.id, f.kind === 'multi' ? [] : '']))

export function applyFilters(cards: DriverCard[], byId: Map<string, DriverView>, state: FilterState): DriverCard[] {
  return cards.filter((c) => {
    const v = byId.get(c.driverId)
    return v !== undefined && FILTERS.every((f) => f.apply(v, c, state[f.id] ?? EMPTY_FILTERS[f.id]))
  })
}

export function isFiltering(state: FilterState): boolean {
  return FILTERS.some((f) => (f.kind === 'multi' ? multi(state[f.id]).length > 0 : text(state[f.id]) !== ''))
}
