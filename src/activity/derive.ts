import type { Derived } from '../store/derive'
import type { EventDetail, ShiftEvent } from '../store/store'
import { contextMarkers, type MarkerKind } from './markers'

// The shift's record: her actions from the store's log and the derived context markers, merged
// into one array, newest first. The panel reads this and nothing else.

export type Family = 'routing' | 'contact' | 'notes' | 'snoozes' | 'shift'

export const FAMILY_ORDER: Family[] = ['routing', 'contact', 'notes', 'snoozes', 'shift']
export const FAMILY_LABEL: Record<Family, string> = { routing: 'Routing', contact: 'Contact', notes: 'Notes', snoozes: 'Snoozes', shift: 'Shift' }

const FAMILY_OF: Record<EventDetail['type'], Family> = {
  reassign: 'routing', schedule_reset: 'routing', cancel_stop: 'routing', arrived: 'routing', departed: 'routing',
  notify_customer: 'contact', call_driver: 'contact',
  stop_note: 'notes',
  snooze: 'snoozes',
  reconnect: 'shift', undo: 'shift',
}

export type ActivityItem =
  | { kind: 'card'; id: string; at: number; family: Family; driverId?: string; text: string; event: ShiftEvent; undoneAt?: number }
  | { kind: 'marker'; id: string; at: number; family: 'shift'; driverId?: string; text: string; label: string; tone: MarkerKind | 'neutral'; estimated: boolean }

export function familyOf(e: ShiftEvent): Family {
  if (e.detail) return FAMILY_OF[e.detail.type]
  return e.kind === 'snooze' ? 'snoozes' : 'shift'
}

/** Everything the search box may match: the label, every name involved, stop numbers, customers, the note. */
function haystack(e: ShiftEvent, d: Derived): string {
  const parts: string[] = [e.label]
  const nameOf = (id?: string) => (id ? d.byId.get(id)?.driver.name : undefined)
  parts.push(nameOf(e.driverId) ?? '')
  const detail = e.detail
  if (detail) {
    if ('stops' in detail) parts.push(...detail.stops.map((s) => `${s.seq} ${s.customer}`))
    if ('stop' in detail) parts.push(`${detail.stop.seq} ${detail.stop.customer}`)
    if (detail.type === 'reassign') parts.push(nameOf(detail.toId) ?? '')
    if (detail.type === 'schedule_reset') parts.push(...detail.orphaned.map((s) => `${s.seq} ${s.customer}`), detail.afterStop ? `${detail.afterStop.seq} ${detail.afterStop.customer}` : '')
    if (detail.type === 'stop_note') parts.push(detail.note, detail.was ?? '')
    if (detail.type === 'snooze') parts.push(detail.ruleLabel)
  }
  return parts.join(' ').toLowerCase()
}

const seqOf = (i: ActivityItem) => (i.kind === 'card' ? i.event.seq : 0)

export function activityFeed(events: ShiftEvent[], d: Derived): ActivityItem[] {
  // An undo is not its own entry: it marks the card it reversed.
  const undoneAt = new Map<number, number>()
  for (const e of events) if (e.detail?.type === 'undo') undoneAt.set(e.detail.targetSeq, e.at)
  const items: ActivityItem[] = []
  for (const e of events) {
    if (e.kind === 'undo') continue
    if (e.kind === 'system') items.push({ kind: 'marker', id: `e${e.seq}`, at: e.at, family: 'shift', text: e.label.toLowerCase(), label: e.label, tone: 'neutral', estimated: false })
    else items.push({ kind: 'card', id: `e${e.seq}`, at: e.at, family: familyOf(e), driverId: e.driverId, text: haystack(e, d), event: e, undoneAt: undoneAt.get(e.seq) })
  }
  for (const m of contextMarkers(d.views, d.now)) {
    items.push({ kind: 'marker', id: m.id, at: m.at, family: 'shift', driverId: m.driverId, text: m.label.toLowerCase(), label: m.label, tone: m.kind, estimated: m.estimated })
  }
  return items.sort((a, b) => b.at - a.at || seqOf(b) - seqOf(a))
}

export interface HourGroup {
  hourStart: number
  items: ActivityItem[]
}

/** Newest hour first; items keep the feed's order inside each hour. */
export function groupByHour(items: ActivityItem[]): HourGroup[] {
  const groups: HourGroup[] = []
  for (const item of items) {
    const hourStart = new Date(item.at).setMinutes(0, 0, 0)
    const last = groups[groups.length - 1]
    if (last && last.hourStart === hourStart) last.items.push(item)
    else groups.push({ hourStart, items: [item] })
  }
  return groups
}

