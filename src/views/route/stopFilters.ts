import type { Band } from '../../bands'
import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import type { DriverView } from '../../store/view'

export type StopFilterId = 'all' | 'past_limit' | 'near_limit' | 'late' | 'failed' | 'unassigned' | 'remaining' | 'done'

/** What a stop filter reads: the drift for projected arrivals, the deliveries for their windows, and
 *  the two limit sets the page already computes. Predicates never recompute what a receipt shows. */
export interface StopFilterContext {
  driftMin: number
  deliveryById: Map<string, Delivery>
  pastLimitIds: Set<string>
  nearLimitIds: Set<string>
}

export interface StopFilterDef {
  id: StopFilterId
  label: string
  /** Issues carry a dot in their band color and appear only when they match something; states always show. */
  tone?: Band
  when: (stop: Stop, ctx: StopFilterContext) => boolean
}

/** Drive minutes left at arrival under which a reachable stop counts as near the limit. */
export const NEAR_LIMIT_MIN = 30

/** Pending stops the driver still reaches, but with under NEAR_LIMIT_MIN of drive time left on arrival.
 *  The same walk as stopsPastLimit, so the two sets meet at the limit and never overlap. */
export function stopsNearLimit(view: Pick<DriverView, 'remaining' | 'minutesUntilLimit'>, marginMin = NEAR_LIMIT_MIN): string[] {
  let left = view.minutesUntilLimit
  const near: string[] = []
  for (const s of view.remaining) {
    const leg = s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev
    if (leg > left) break
    left -= leg
    if (s.status === 'pending' && left < marginMin) near.push(s.id)
  }
  return near
}

/** The receipt's own "past window" test: a pending stop whose projected arrival misses its delivery window. */
export function isPastWindow(stop: Stop, ctx: StopFilterContext): boolean {
  if (stop.status !== 'pending') return false
  const end = ctx.deliveryById.get(stop.deliveryId)?.window.end
  return end !== undefined && projectedEta(stop, ctx.driftMin) > end
}

/** One object per filter. Adding one is appending one; the title row renders whatever is here. */
export const STOP_FILTERS: StopFilterDef[] = [
  { id: 'all', label: 'All', when: () => true },
  { id: 'past_limit', label: 'Past the limit', tone: 'act_now', when: (s, ctx) => ctx.pastLimitIds.has(s.id) },
  { id: 'near_limit', label: 'Near the limit', tone: 'watch', when: (s, ctx) => ctx.nearLimitIds.has(s.id) },
  { id: 'late', label: 'Past window', tone: 'act_now', when: isPastWindow },
  { id: 'failed', label: 'Failed', tone: 'act_now', when: (s) => s.status === 'failed' },
  { id: 'unassigned', label: 'Needs a driver', tone: 'offline', when: (s) => s.status === 'unassigned' },
  { id: 'remaining', label: 'Undelivered', when: (s) => s.status === 'pending' || s.status === 'in_progress' },
  { id: 'done', label: 'Delivered', when: (s) => s.status === 'done' },
]

export function isStopFilterId(value: string | null): value is StopFilterId {
  return value !== null && STOP_FILTERS.some((f) => f.id === value)
}

export function stopFilterCounts(stops: readonly Stop[], ctx: StopFilterContext): Record<StopFilterId, number> {
  const counts = {} as Record<StopFilterId, number>
  for (const f of STOP_FILTERS) counts[f.id] = stops.filter((s) => f.when(s, ctx)).length
  return counts
}

/** The stops a filter keeps, in the order they came in. */
export function applyStopFilter(stops: readonly Stop[], id: StopFilterId, ctx: StopFilterContext): Stop[] {
  const f = STOP_FILTERS.find((x) => x.id === id) ?? STOP_FILTERS[0]
  return stops.filter((s) => f.when(s, ctx))
}
