import { FRESH_MIN } from '../hos/constants'
import { fmtClock, fmtHm, fmtMinutes } from '../lib/format'
import type { Derived } from '../store/derive'
import type { ShiftEvent, StopRef } from '../store/store'

// What a card says. One title and a few rows per action, from the event's own captured
// figures; names come from the views only so a renamed driver still reads right.

export interface EventCopy {
  title: string
  rows: string[]
}

/** "stop 14", "stops 14–15", "stops 14, 16", or "4 stops". */
export function stopsPhrase(stops: StopRef[]): string {
  if (stops.length === 0) return 'no stops'
  const seqs = stops.map((s) => s.seq).sort((a, b) => a - b)
  if (seqs.length === 1) return `stop ${seqs[0]}`
  if (seqs.every((s, i) => i === 0 || s === seqs[i - 1] + 1)) return `stops ${seqs[0]}–${seqs[seqs.length - 1]}`
  if (seqs.length <= 3) return `stops ${seqs.join(', ')}`
  return `${seqs.length} stops`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const stopName = (s: StopRef) => `stop ${s.seq} · ${s.customer}`
const firstName = (name: string) => name.split(' ')[0]

export function describeEvent(e: ShiftEvent, d: Derived): EventCopy {
  const nameOf = (id?: string) => (id ? (d.byId.get(id)?.driver.name ?? id) : 'the driver')
  const who = nameOf(e.driverId)
  const detail = e.detail
  if (!detail) return { title: e.label, rows: [] }
  switch (detail.type) {
    case 'reassign': {
      const to = nameOf(detail.toId)
      return { title: `Reassigned ${stopsPhrase(detail.stops)} to ${to}`, rows: [...detail.stops.map((s) => cap(stopName(s))), `${firstName(to)} has ${fmtHm(detail.spareAfterMin)} of drive time spare after the move`] }
    }
    case 'schedule_reset': {
      const orphans = detail.orphaned.length === 0 ? 'Every remaining stop is done before then' : `${cap(stopsPhrase(detail.orphaned))} after that point need${detail.orphaned.length === 1 ? 's' : ''} a driver`
      return { title: `Scheduled a reset ${detail.afterStop ? `after stop ${detail.afterStop.seq}` : 'now'}`, rows: [`Off duty ${fmtClock(detail.resetStartsAt)} – ${fmtClock(detail.resetEndsAt)}`, orphans] }
    }
    case 'notify_customer':
      return { title: `Notified ${detail.stops.length} customer${detail.stops.length === 1 ? '' : 's'}`, rows: detail.stops.map((s) => `${cap(stopName(s))} · projected ${fmtClock(s.projectedEta)}, window ends ${fmtClock(s.windowEnd)}`) }
    case 'call_driver':
      return { title: `Called ${who}`, rows: [detail.pingAgeMin < FRESH_MIN ? 'Truck was reporting normally' : `No ping for ${fmtMinutes(detail.pingAgeMin)}`] }
    case 'stop_note':
      return detail.note
        ? { title: `Note on ${stopName(detail.stop)}`, rows: [`“${detail.note}”`, ...(detail.was ? [`Replaced “${detail.was}”`] : [])] }
        : { title: `Cleared the note on ${stopName(detail.stop)}`, rows: detail.was ? [`Was “${detail.was}”`] : [] }
    case 'cancel_stop':
      return { title: `Canceled ${stopName(detail.stop)}`, rows: [] }
    case 'arrived':
      return { title: `Marked arrived at ${stopName(detail.stop)}`, rows: [] }
    case 'departed':
      return { title: `Marked ${stopName(detail.stop)} ${detail.outcome}`, rows: [] }
    case 'snooze':
      return { title: `Snoozed ${detail.ruleLabel} on ${who}`, rows: [`Until ${fmtClock(detail.until)}`] }
    case 'reconnect': {
      const corrected = Math.round(detail.wasMin) !== Math.round(detail.nowMin)
      return { title: `${who} back online`, rows: [`Dark for ${fmtMinutes(detail.darkForMin)}`, ...(corrected ? [`Drive time left corrected ${fmtHm(detail.wasMin)} → ${fmtHm(detail.nowMin)}`] : [])] }
    }
    case 'undo':
      return { title: e.label, rows: [] }
  }
}
