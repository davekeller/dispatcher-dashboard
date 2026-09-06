import type { DialogAction } from '../actions/ActionContext'
import type { DriverCard, Severity } from '../alerts/types'
import type { Stop } from '../data/types'
import { projectedDepartureAt, projectedEta } from '../hos/compute'
import { RESET_MIN } from '../hos/constants'
import { fmtClock, fmtHm, fmtMinutes } from '../lib/format'
import { reassignCandidates, stopsPastLimit, suggestResetStop } from '../store/actions'
import type { Derived } from '../store/derive'
import type { DriverView } from '../store/view'
import { MIN } from '../time/clock'

// When a route file or a fleet-map pick focuses one driver, Lookout stops summarizing the
// fleet and says what to do about this route: which stops to hand to whom and with how much
// room, where to put the reset, which customers to call. Every figure comes from the same
// derivations the dialogs use, so a plan's numbers match the dialog it opens. Pure; no React.

export type PlanKind = 'call' | 'reassign' | 'reset' | 'notify' | 'assign' | 'alert' | 'status'

export interface PlanAction {
  action: DialogAction
  label: string
  stopIds?: string[]
  toId?: string
  afterStopId?: string | null
}

export interface Plan {
  id: string
  kind: PlanKind
  severity: Severity | 'none'
  title: string
  body: string
  /** Opens a dialog pre-filled with the plan's stops, candidate, or reset point. */
  action?: PlanAction
  /** The inline call-driver confirmation instead of a dialog. */
  call?: boolean
  /** Needs a live position; disabled while the truck is stale or dark. */
  positionDependent?: boolean
}

const RULES_WITH_PLANS = new Set(['over_limit', 'limit_act_now', 'wont_finish', 'offline_near_limit', 'offline', 'behind_schedule', 'stops_unassigned'])

const first = (view: DriverView) => view.driver.name.split(' ')[0]

/** "stop 14", "stops 14–15", "stops 3, 7 and 9". */
export function seqRange(stops: Stop[]): string {
  const seqs = [...stops].map((s) => s.seq).sort((a, b) => a - b)
  if (seqs.length === 0) return 'no stops'
  if (seqs.length === 1) return `stop ${seqs[0]}`
  const contiguous = seqs.every((n, i) => i === 0 || n === seqs[i - 1] + 1)
  if (contiguous) return `stops ${seqs[0]}–${seqs[seqs.length - 1]}`
  return `stops ${seqs.slice(0, -1).join(', ')} and ${seqs[seqs.length - 1]}`
}

function customer(d: Derived, stop: Stop): string {
  return d.deliveryById.get(stop.deliveryId)?.customer ?? stop.deliveryId
}

function planCall(view: DriverView, card: DriverCard): Plan | null {
  if (view.staleness === 'offline') {
    const pending = view.remaining.filter((s) => s.status === 'pending')
    const risk = pending.length > 0 ? ` ${seqRange(pending)} ${pending.length === 1 ? 'is' : 'are'} at risk.` : ''
    const estimate = view.minutesUntilLimit > 0 ? `If ${first(view)} is still driving, about ${fmtMinutes(view.minutesUntilLimit)} of drive time is left.` : `If ${first(view)} is still driving, the limit has passed.`
    return { id: `call:${view.driver.id}`, kind: 'call', severity: card.severity, title: `Call ${view.driver.name}: no ping for ${fmtMinutes(view.pingAgeMin)}`, body: `${estimate}${risk} Reassignment waits until the truck reports in.`, call: true }
  }
  if (view.hos === 'over' && view.status === 'driving') {
    return { id: `call:${view.driver.id}`, kind: 'call', severity: card.severity, title: `Call ${view.driver.name} now`, body: `Over the limit by ${fmtMinutes(-view.minutesUntilLimit)} and still driving. Every minute on the road is a violation.`, call: true }
  }
  return null
}

function planReassign(view: DriverView, card: DriverCard, d: Derived): Plan | null {
  const past = stopsPastLimit(view)
  if (past.length === 0) return null
  const stops = view.remaining.filter((s) => past.includes(s.id))
  const label = seqRange(stops)
  const stale = view.staleness !== 'fresh'
  const top = reassignCandidates(d.views, view, past)[0]
  if (!top) {
    return { id: `reassign:${view.driver.id}`, kind: 'reassign', severity: card.severity, title: `No one can take ${label} yet`, body: `Every fresh driver on the road would end up inside the act-now window. Schedule a reset for the stops that fit and let ${label} wait for a driver.`, action: { action: 'schedule_reset', label: 'Schedule reset', afterStopId: suggestResetStop(view) } }
  }
  const keep = view.remaining.filter((s) => !past.includes(s.id))
  const keepDrive = keep.reduce((t, s) => t + (s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev), 0)
  const fit = top.sameRegion ? 'is in the same region and has' : 'has'
  const room = `${top.view.driver.name} ${fit} ${fmtHm(top.spare)} of drive time to spare after the move.`
  const rest = view.hos === 'over'
    ? `${first(view)} is over the limit and must stop.`
    : keep.length > 0 ? `${first(view)} keeps ${seqRange(keep)} and finishes with ${fmtMinutes(Math.max(0, view.minutesUntilLimit - keepDrive))} of drive time left.` : `${first(view)} stops after the current stop.`
  if (stale) {
    return { id: `reassign:${view.driver.id}`, kind: 'reassign', severity: card.severity, title: `Line up ${top.view.driver.name} for ${label} once the truck reports in`, body: `${room} Position-dependent actions stay disabled while ${first(view)} is dark.`, action: { action: 'reassign', label: `Reassign to ${top.view.driver.name}`, stopIds: past, toId: top.view.driver.id }, positionDependent: true }
  }
  return { id: `reassign:${view.driver.id}`, kind: 'reassign', severity: card.severity, title: `Reassign ${label} to ${top.view.driver.name}`, body: `${room} ${rest}`, action: { action: 'reassign', label: `Reassign to ${top.view.driver.name}`, stopIds: past, toId: top.view.driver.id } }
}

function planReset(view: DriverView, card: DriverCard, d: Derived): Plan | null {
  if (view.plannedResetAt !== undefined) return null
  const past = stopsPastLimit(view)
  if (view.hos === 'over') {
    const orphaned = past.length > 0 ? ` ${seqRange(view.remaining.filter((s) => past.includes(s.id)))} need another driver.` : ''
    return { id: `reset:${view.driver.id}`, kind: 'reset', severity: card.severity, title: 'Schedule the reset now', body: `A ten-hour reset starting now ends at ${fmtClock(view.now + RESET_MIN * MIN)}.${orphaned}`, action: { action: 'schedule_reset', label: 'Schedule reset', afterStopId: null } }
  }
  if (past.length === 0) return null
  const afterId = suggestResetStop(view)
  if (afterId === null) return null
  const after = view.remaining.find((s) => s.id === afterId)
  if (!after) return null
  const reachedWith = view.remaining.filter((s) => s.seq <= after.seq).reduce((left, s) => left - (s.status === 'in_progress' ? 0 : s.driveMinutesFromPrev), view.minutesUntilLimit)
  const resetAt = projectedDepartureAt(view.route, afterId, view.now)
  return { id: `reset:${view.driver.id}`, kind: 'reset', severity: card.severity, title: `Schedule a reset after stop ${after.seq} (${customer(d, after)})`, body: `${first(view)} reaches it with ${fmtMinutes(Math.max(0, reachedWith))} of drive time left; the ten-hour reset starts ${fmtClock(resetAt)} and ends ${fmtClock(resetAt + RESET_MIN * MIN)}. ${seqRange(view.remaining.filter((s) => past.includes(s.id)))} wait for another driver.`, action: { action: 'schedule_reset', label: 'Schedule reset', afterStopId: afterId } }
}

function planNotify(view: DriverView, card: DriverCard, d: Derived): Plan | null {
  const late = view.unnotifiedLateStops
  if (late.length === 0) return null
  const named = late.slice(0, 3).map((s) => `${customer(d, s)} (window ends ${fmtClock(d.deliveryById.get(s.deliveryId)?.window.end ?? projectedEta(s, view.driftMin))})`).join(', ')
  const more = late.length > 3 ? ` and ${late.length - 3} more` : ''
  return { id: `notify:${view.driver.id}`, kind: 'notify', severity: card.severity, title: `Notify ${late.length} customer${late.length === 1 ? '' : 's'} running late`, body: `${first(view)} is ${fmtMinutes(Math.round(view.driftMin))} behind: ${named}${more}. None of them have been told yet.`, action: { action: 'notify_customer', label: 'Notify customers', stopIds: late.map((s) => s.id) }, positionDependent: true }
}

function planAssign(view: DriverView, card: DriverCard, d: Derived): Plan | null {
  if (view.unassigned.length === 0) return null
  const ids = view.unassigned.map((s) => s.id)
  const top = reassignCandidates(d.views, view, ids)[0]
  const label = seqRange(view.unassigned)
  return { id: `assign:${view.driver.id}`, kind: 'assign', severity: card.severity, title: `Find a driver for ${label}`, body: top ? `${top.view.driver.name} ${top.sameRegion ? 'is in the same region and ' : ''}can take ${view.unassigned.length === 1 ? 'it' : 'them'} with ${fmtHm(top.spare)} of drive time to spare.` : 'No fresh driver has the capacity right now; the stops stay unassigned until one frees up.', action: { action: 'reassign', label: top ? `Assign to ${top.view.driver.name}` : 'Open the picker', stopIds: ids, toId: top?.view.driver.id } }
}

/** A rule this file does not know (one added live during a walkthrough) still gets a plan:
 *  the alert's own words and its first dialog action. */
function planOtherAlerts(card: DriverCard): Plan[] {
  return card.alerts.filter((a) => !RULES_WITH_PLANS.has(a.ruleId)).map((a) => {
    const dialog = a.actions.find((x): x is DialogAction => x === 'reassign' || x === 'schedule_reset' || x === 'notify_customer')
    const label = dialog === 'reassign' ? 'Reassign stops' : dialog === 'schedule_reset' ? 'Schedule reset' : 'Notify customers'
    return { id: `alert:${a.id}`, kind: 'alert' as const, severity: a.severity, title: a.title, body: a.body, action: dialog ? { action: dialog, label } : undefined, call: !dialog && a.actions.includes('call_driver') ? true : undefined, positionDependent: dialog === 'reassign' || dialog === 'notify_customer' ? true : undefined }
  })
}

function planStatus(view: DriverView, d: Derived): Plan {
  const id = `status:${view.driver.id}`
  if (view.remaining.length === 0 && view.unassigned.length === 0) {
    return { id, kind: 'status', severity: 'none', title: 'Route complete', body: `All ${view.total} stops done; ${first(view)} is heading in with ${fmtHm(view.minutesUntilLimit)} of drive time left.` }
  }
  if (view.status === 'on_break') {
    return { id, kind: 'status', severity: 'none', title: `${first(view)} is on break`, body: `${fmtMinutes(view.breakMin)} taken today, ${fmtHm(view.minutesUntilLimit)} of drive time left when the route resumes; ${view.remaining.length} stops to go.` }
  }
  const next = view.next
  const eta = next ? (next.status === 'in_progress' ? 'at the dock now' : `at ${fmtClock(projectedEta(next, view.driftMin))}`) : ''
  const finish = view.projectedFinishAt !== undefined ? `, finishing about ${fmtClock(view.projectedFinishAt)}` : ''
  return { id, kind: 'status', severity: 'none', title: `Nothing needs you on ${first(view)}'s route`, body: `${next ? `Next: stop ${next.seq} (${customer(d, next)}) ${eta}. ` : ''}${fmtHm(view.minutesUntilLimit)} of drive time left for ${view.remaining.length} stop${view.remaining.length === 1 ? '' : 's'}${finish}.` }
}

/** The plans for one driver, most urgent first. Never empty: a quiet route gets its status. */
export function routePlans(view: DriverView, card: DriverCard, d: Derived): Plan[] {
  const plans = [planCall(view, card), planReassign(view, card, d), planReset(view, card, d), planNotify(view, card, d), planAssign(view, card, d), ...planOtherAlerts(card)].filter((p): p is Plan => p !== null)
  return plans.length > 0 ? plans : [planStatus(view, d)]
}
