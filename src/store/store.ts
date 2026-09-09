import { create } from 'zustand'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import type { Severity } from '../alerts/types'
import type { Fleet, StopOutcome } from '../data/types'
import type { BoardLens } from '../groupBy'
import { minutesUntilLimit, pingAgeMinutes, projectedDepartureAt, projectedEta, type HosStatus, type Staleness } from '../hos/compute'
import { RESET_MIN, SNOOZE_MIN } from '../hos/constants'
import { ANCHOR, LIVE_OFFSET_MS, MIN, clampScrub, simNow } from '../time/clock'
import * as A from './actions'
import { derive } from './derive'

export interface LastAction {
  label: string
  at: number // wall-clock ms, for the toast timer
  undoable: boolean
}

export interface Correction {
  was: number
  now: number
  at: number // wall-clock ms
}

/** A stop as the log names it: the sequence number she saw and the customer on the receipt. */
export interface StopRef {
  id: string
  seq: number
  customer: string
}

/** What she did, typed per action. Every figure is the dialog's own number from the same helper,
 *  captured before the mutation, so the Activity card shows what she was shown. */
export type EventDetail =
  | { type: 'reassign'; fromId: string; toId: string; stops: StopRef[]; spareAfterMin: number }
  | { type: 'schedule_reset'; afterStop: StopRef | null; resetStartsAt: number; resetEndsAt: number; orphaned: StopRef[] }
  | { type: 'notify_customer'; stops: (StopRef & { windowEnd: number; projectedEta: number })[] }
  | { type: 'call_driver'; pingAgeMin: number }
  | { type: 'stop_note'; stop: StopRef; note: string; was?: string }
  | { type: 'cancel_stop'; stop: StopRef }
  | { type: 'arrived'; stop: StopRef }
  | { type: 'departed'; stop: StopRef; outcome: StopOutcome }
  | { type: 'snooze'; ruleLabel: string; until: number }
  | { type: 'reconnect'; darkForMin: number; wasMin: number; nowMin: number }
  | { type: 'undo'; targetSeq: number }

/** The driver as the board and Lookout showed him at that moment. */
export interface EventContext {
  hos: HosStatus
  staleness: Staleness
  minutesUntilLimit: number
  /** The card's severity and its alert labels, highest first: the badge the board wore. */
  severity: Severity | 'none'
  alerts: string[]
}

/** What happened this shift, in order. Appended by every action; never edited. */
export interface ShiftEvent {
  seq: number
  at: number // simulated clock
  kind: 'action' | 'snooze' | 'reconnect' | 'undo' | 'system'
  label: string
  driverId?: string
  detail?: EventDetail
  context?: EventContext
}

export interface State {
  fleet: Fleet
  scrubOffsetMs: number
  /** The same day against the real clock: simulated time equals wall time. */
  liveClock: boolean
  snoozes: Record<string, number>
  corrections: Record<string, Correction>
  events: ShiftEvent[]
  lastAction?: LastAction
  undoSnapshot?: Fleet
  groupBy: BoardLens
  /** Which board columns are open, by column key (band ids, region names). Unset means open; Offline and Clear start closed. */
  columnOpen: Record<string, boolean>
  devOpen: boolean
  now: () => number
  reassignStops: (fromDriverId: string, toDriverId: string, stopIds: string[]) => void
  scheduleReset: (driverId: string, afterStopId: string | null) => void
  notifyCustomer: (stopIds: string[]) => void
  updateStopNote: (stopId: string, note: string) => void
  cancelStop: (stopId: string) => void
  callDriver: (driverId: string) => void
  acknowledge: (alertId: string) => void
  markArrived: (stopId: string) => void
  markDeparted: (stopId: string, outcome: StopOutcome) => void
  bringOnline: (driverId: string) => void
  undo: () => void
  scrub: (ms: number) => void
  setScrubOffset: (ms: number) => void
  setClock: (t: number) => void
  setLiveClock: (on: boolean) => void
  resetClock: () => void
  resetFleet: () => void
  setGroupBy: (id: BoardLens) => void
  setColumnOpen: (key: string, open: boolean) => void
  toggleDev: () => void
  /** Apply the clock to the simulated day. Cheap: returns early when no stop crossed `now`. */
  advanceWorld: () => void
}

export const useStore = create<State>()((set, get) => {
  const name = (driverId: string) => get().fleet.drivers.find((d) => d.id === driverId)?.name ?? driverId
  const stopRef = (stopId: string): StopRef => {
    const fleet = get().fleet
    const stop = fleet.routes.flatMap((r) => r.stops).find((s) => s.id === stopId)
    if (!stop) return { id: stopId, seq: 0, customer: stopId }
    return { id: stop.id, seq: stop.seq, customer: fleet.deliveries.find((d) => d.id === stop.deliveryId)?.customer ?? stop.deliveryId }
  }
  const stopContext = (stopId: string) => {
    const route = get().fleet.routes.find((candidate) => candidate.stops.some((stop) => stop.id === stopId))
    const stop = route?.stops.find((candidate) => candidate.id === stopId)
    return { label: stop ? `Stop ${stop.seq}` : 'Stop', driverId: route?.driverId }
  }
  /** The views as the board shows them right now. The same derive() the hooks call. */
  const derived = () => derive(get().fleet, get().now(), get().snoozes)
  const contextOf = (driverId?: string): EventContext | undefined => {
    if (!driverId) return undefined
    const d = derived()
    const v = d.byId.get(driverId)
    if (!v) return undefined
    const card = d.cardById.get(driverId)
    return { hos: v.hos, staleness: v.staleness, minutesUntilLimit: v.minutesUntilLimit, severity: card?.severity ?? 'none', alerts: card?.alerts.map((a) => a.label) ?? [] }
  }
  const log = (kind: ShiftEvent['kind'], label: string, driverId?: string, detail?: EventDetail, context?: EventContext) =>
    set((s) => ({ events: [...s.events, { seq: s.events.length + 1, at: s.now(), kind, label, driverId, detail, context }] }))
  /** Snapshot, apply, record. Every consequential action goes through here so undo is uniform.
   *  The detail and the driver's context are read before the fleet changes: the log says what she saw. */
  const commit = (label: string, next: (fleet: Fleet, now: number) => Fleet, driverId?: string, detail?: EventDetail) => {
    const before = get().fleet
    const context = contextOf(driverId)
    set({ fleet: next(before, get().now()), undoSnapshot: before, lastAction: { label, at: Date.now(), undoable: true } })
    log('action', label, driverId, detail, context)
  }
  const opening = (): ShiftEvent[] => [{ seq: 1, at: ANCHOR, kind: 'system', label: 'Lookout started watching the shift' }]
  return {
    fleet: makeFleet(ANCHOR),
    scrubOffsetMs: 0,
    liveClock: false,
    snoozes: {},
    corrections: {},
    events: opening(),
    groupBy: 'band', // act on it to the left: Act now is the first column
    columnOpen: { offline: false, clear: false }, // quiet tails start as rails
    devOpen: false,
    now: () => simNow(get().scrubOffsetMs),
    reassignStops: (from, to, stopIds) => {
      const d = derived()
      const fromView = d.byId.get(from)
      const toView = d.byId.get(to)
      const moving = fromView?.route.stops.filter((s) => stopIds.includes(s.id) && (s.status === 'pending' || s.status === 'unassigned')) ?? []
      const detail: EventDetail | undefined = fromView && toView
        ? { type: 'reassign', fromId: from, toId: to, stops: moving.map((s) => stopRef(s.id)), spareAfterMin: A.spareAfterMove(toView, fromView, stopIds) }
        : undefined
      commit(`${name(from)}'s stops reassigned to ${name(to)}`, (f, now) => A.reassignStops(f, from, to, stopIds, now), from, detail)
    },
    scheduleReset: (driverId, after) => {
      const view = derived().byId.get(driverId)
      let detail: EventDetail | undefined
      if (view) {
        // The same figures as the reset dialog: departure from the stop she picked, the orphans after it.
        const idx = after === null ? -1 : view.remaining.findIndex((s) => s.id === after)
        const resetStartsAt = after === null ? view.now : projectedDepartureAt(view.route, after, view.now)
        const orphaned = view.remaining.slice(idx + 1).filter((s) => s.status === 'pending').map((s) => stopRef(s.id))
        detail = { type: 'schedule_reset', afterStop: after === null ? null : stopRef(after), resetStartsAt, resetEndsAt: resetStartsAt + RESET_MIN * MIN, orphaned }
      }
      commit(`Reset scheduled for ${name(driverId)}`, (f, now) => A.scheduleReset(f, driverId, after, now), driverId, detail)
    },
    notifyCustomer: (stopIds) => {
      const context = stopContext(stopIds[0] ?? '')
      const view = context.driverId ? derived().byId.get(context.driverId) : undefined
      const stops = stopIds.map((id) => {
        const stop = view?.route.stops.find((s) => s.id === id)
        const delivery = stop ? get().fleet.deliveries.find((d) => d.id === stop.deliveryId) : undefined
        return { ...stopRef(id), windowEnd: delivery?.window.end ?? 0, projectedEta: stop && view ? projectedEta(stop, view.driftMin) : 0 }
      })
      commit(`${stopIds.length} customer${stopIds.length === 1 ? '' : 's'} notified`, (f, now) => A.notifyCustomer(f, stopIds, now), context.driverId, { type: 'notify_customer', stops })
    },
    updateStopNote: (stopId, note) => {
      const context = stopContext(stopId)
      const was = get().fleet.routes.flatMap((r) => r.stops).find((s) => s.id === stopId)?.note
      commit(`${context.label} note updated`, (f) => A.updateStopNote(f, stopId, note), context.driverId, { type: 'stop_note', stop: stopRef(stopId), note: note.trim(), was })
    },
    cancelStop: (stopId) => {
      const context = stopContext(stopId)
      commit(`${context.label} canceled`, (f) => A.cancelStop(f, stopId), context.driverId, { type: 'cancel_stop', stop: stopRef(stopId) })
    },
    callDriver: (driverId) => {
      const view = derived().byId.get(driverId)
      commit(`Call to ${name(driverId)} logged`, (f, now) => A.callDriver(f, driverId, now), driverId, { type: 'call_driver', pingAgeMin: view?.pingAgeMin ?? 0 })
    },
    acknowledge: (alertId) => {
      const driverId = alertId.split(':')[1]
      const d = derived()
      const ruleLabel = d.alerts.find((a) => a.id === alertId)?.label ?? alertId.split(':')[0]
      const context = contextOf(driverId)
      const until = get().now() + SNOOZE_MIN * MIN
      set((s) => ({ snoozes: { ...s.snoozes, [alertId]: until }, undoSnapshot: undefined, lastAction: { label: 'Snoozed for 10 min', at: Date.now(), undoable: false } }))
      log('snooze', `${name(driverId)} snoozed for 10 min`, driverId, { type: 'snooze', ruleLabel, until }, context)
    },
    markArrived: (stopId) => commit('Arrived', (f, now) => A.markArrived(f, stopId, now), stopContext(stopId).driverId, { type: 'arrived', stop: stopRef(stopId) }),
    markDeparted: (stopId, outcome) => commit('Stop completed', (f, now) => A.markDeparted(f, stopId, outcome, now), stopContext(stopId).driverId, { type: 'departed', stop: stopRef(stopId), outcome }),
    bringOnline: (driverId) => {
      const now = get().now()
      const before = get().fleet.drivers.find((d) => d.id === driverId)
      if (!before) return
      const context = contextOf(driverId)
      const was = minutesUntilLimit(before, now)
      const darkForMin = pingAgeMinutes(before, now)
      const fleet = A.bringOnline(get().fleet, driverId, now)
      const after = fleet.drivers.find((d) => d.id === driverId)!
      const nowMin = minutesUntilLimit(after, now)
      set({ fleet, corrections: { ...get().corrections, [driverId]: { was, now: nowMin, at: Date.now() } }, lastAction: { label: `${name(driverId)} is back online`, at: Date.now(), undoable: false } })
      log('reconnect', `${name(driverId)} is back online`, driverId, { type: 'reconnect', darkForMin, wasMin: was, nowMin }, context)
    },
    undo: () => {
      const snap = get().undoSnapshot
      if (!snap) return
      const undone = get().lastAction?.label
      // The snapshot belongs to the most recent committed action; that is the event this undo reverses.
      const target = [...get().events].reverse().find((e) => e.kind === 'action')
      set({ fleet: snap, undoSnapshot: undefined, lastAction: { label: 'Undone', at: Date.now(), undoable: false } })
      log('undo', undone ? `Undone: ${undone}` : 'Undone', target?.driverId, target ? { type: 'undo', targetSeq: target.seq } : undefined)
    },
    scrub: (ms) => {
      set((s) => ({ scrubOffsetMs: clampScrub(s.scrubOffsetMs + ms), liveClock: false }))
      get().advanceWorld()
    },
    setScrubOffset: (ms) => {
      set({ scrubOffsetMs: clampScrub(ms), liveClock: false })
      get().advanceWorld()
    },
    setClock: (t) => {
      // An absolute time of day: the offset that lands the live clock on it.
      set({ scrubOffsetMs: clampScrub(t - simNow(0)), liveClock: false })
      get().advanceWorld()
    },
    setLiveClock: (on) => {
      // Real time is a fixed offset, not a clamp: before 6:00 AM the shift has not started, after 6:00 PM it is over.
      set({ liveClock: on, scrubOffsetMs: on ? LIVE_OFFSET_MS : 0 })
      get().advanceWorld()
    },
    resetClock: () => {
      set({ scrubOffsetMs: 0, liveClock: false })
      get().advanceWorld()
    },
    advanceWorld: () => {
      const next = materialize(get().fleet, get().now())
      if (next !== get().fleet) set({ fleet: next })
    },
    resetFleet: () => set({ fleet: makeFleet(ANCHOR), snoozes: {}, corrections: {}, events: opening(), undoSnapshot: undefined, lastAction: undefined, scrubOffsetMs: 0, liveClock: false }),
    setGroupBy: (groupBy) => set({ groupBy }),
    setColumnOpen: (key, open) => set((s) => ({ columnOpen: { ...s.columnOpen, [key]: open } })),
    toggleDev: () => set((s) => ({ devOpen: !s.devOpen })),
  }
})
