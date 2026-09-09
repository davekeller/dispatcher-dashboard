import { bandOf } from '../bands'
import type { DriverView } from '../store/view'
import { RULES } from './rules'
import type { Alert, DriverCard, Severity } from './types'

const SEVERITY_RANK: Record<Severity | 'none', number> = { critical: 0, act_now: 1, watch: 2, info: 3, none: 4 }
const STALE_RANK = { offline: 0, stale: 1, fresh: 2 } as const

export function evaluateRules(views: DriverView[]): Alert[] {
  const out: Alert[] = []
  for (const v of views) {
    for (const r of RULES) {
      if (!r.when(v)) continue
      const { title, body } = r.message(v)
      out.push({ id: `${r.id}:${v.driver.id}`, ruleId: r.id, driverId: v.driver.id, severity: r.severity, label: r.label, title, body, actions: r.actions })
    }
  }
  return out
}

export function topSeverity(alerts: Alert[]): Severity | 'none' {
  let top: Severity | 'none' = 'none'
  for (const a of alerts) if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[top]) top = a.severity
  return top
}

/** The comparator below, in words, in order. Lookout's pick dialog reads this list, so the
 *  explanation and the sort live in one file and cannot drift apart. */
export const RANK_KEYS: { label: string; detail: string }[] = [
  { label: 'Whoever breaks first', detail: 'Over the limit, then act now, then watch, then info. Clear routes last.' },
  { label: 'Snoozed cards drop', detail: 'A snoozed card sorts below the others in its band. It never disappears.' },
  { label: 'Least drive time left', detail: 'Inside a band, the driver closest to the 11-hour limit comes first, to the whole minute, so a tick never jostles cards.' },
  { label: 'Quiet trucks sort up', detail: 'On a tie, offline before stale before fresh: a truck that stopped reporting near the limit is the riskier one.' },
  { label: 'Ties stay put', detail: 'Anything still tied keeps its id order, so the board never reorders on its own.' },
]

/** One card per driver. Sort: severity, then unsnoozed before snoozed, then time to
 *  violation (offline continuation counts), then staleness (offline first), then id so
 *  ties never reorder on a tick. Snooze de-emphasizes; it never removes a card. */
export function rankDrivers(views: DriverView[], alerts: Alert[], snoozes: Record<string, number>, now: number): DriverCard[] {
  const byDriver = new Map<string, Alert[]>()
  for (const a of alerts) byDriver.set(a.driverId, [...(byDriver.get(a.driverId) ?? []), a])
  const viewById = new Map(views.map((v) => [v.driver.id, v]))
  const cards: DriverCard[] = views.map((v) => {
    const mine = byDriver.get(v.driver.id) ?? []
    const severity = topSeverity(mine)
    const snoozed = mine.length > 0 && mine.every((a) => (snoozes[a.id] ?? 0) > now)
    return { driverId: v.driver.id, severity, alerts: mine, snoozed, band: bandOf(v, severity) }
  })
  cards.sort((a, b) => {
    const va = viewById.get(a.driverId)!
    const vb = viewById.get(b.driverId)!
    return (
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Number(a.snoozed) - Number(b.snoozed) ||
      Math.floor(va.minutesUntilLimit) - Math.floor(vb.minutesUntilLimit) || // whole minutes: sub-minute drift never jostles cards
      STALE_RANK[va.staleness] - STALE_RANK[vb.staleness] ||
      a.driverId.localeCompare(b.driverId)
    )
  })
  return cards
}
