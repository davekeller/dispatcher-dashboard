import { create } from 'zustand'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import type { Fleet, StopOutcome } from '../data/types'
import type { GroupingId } from '../groupBy'
import { minutesUntilLimit } from '../hos/compute'
import { SNOOZE_MIN } from '../hos/constants'
import { ANCHOR, MIN, clampScrub, simNow } from '../time/clock'
import * as A from './actions'

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

/** What happened this shift, in order. Appended by every action; never edited. */
export interface ShiftEvent {
  seq: number
  at: number // simulated clock
  kind: 'action' | 'snooze' | 'reconnect' | 'undo' | 'system'
  label: string
  driverId?: string
}

export interface State {
  fleet: Fleet
  scrubOffsetMs: number
  snoozes: Record<string, number>
  corrections: Record<string, Correction>
  events: ShiftEvent[]
  lastAction?: LastAction
  undoSnapshot?: Fleet
  groupBy: GroupingId
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
  resetClock: () => void
  resetFleet: () => void
  setGroupBy: (id: GroupingId) => void
  toggleDev: () => void
  /** Apply the clock to the simulated day. Cheap: returns early when no stop crossed `now`. */
  advanceWorld: () => void
}

export const useStore = create<State>()((set, get) => {
  const name = (driverId: string) => get().fleet.drivers.find((d) => d.id === driverId)?.name ?? driverId
  const stopContext = (stopId: string) => {
    const route = get().fleet.routes.find((candidate) => candidate.stops.some((stop) => stop.id === stopId))
    const stop = route?.stops.find((candidate) => candidate.id === stopId)
    return { label: stop ? `Stop ${stop.seq}` : 'Stop', driverId: route?.driverId }
  }
  /** Snapshot, apply, record. Every consequential action goes through here so undo is uniform. */
  const log = (kind: ShiftEvent['kind'], label: string, driverId?: string) =>
    set((s) => ({ events: [...s.events, { seq: s.events.length + 1, at: s.now(), kind, label, driverId }] }))
  const commit = (label: string, next: (fleet: Fleet, now: number) => Fleet, driverId?: string) => {
    const before = get().fleet
    set({ fleet: next(before, get().now()), undoSnapshot: before, lastAction: { label, at: Date.now(), undoable: true } })
    log('action', label, driverId)
  }
  const opening = (): ShiftEvent[] => [{ seq: 1, at: ANCHOR, kind: 'system', label: 'Lookout started watching the shift' }]
  return {
    fleet: makeFleet(ANCHOR),
    scrubOffsetMs: 0,
    snoozes: {},
    corrections: {},
    events: opening(),
    groupBy: 'band', // act on it to the left: Act now is the first column
    devOpen: false,
    now: () => simNow(get().scrubOffsetMs),
    reassignStops: (from, to, stopIds) =>
      commit(`${name(from)}'s stops reassigned to ${name(to)}`, (f, now) => A.reassignStops(f, from, to, stopIds, now), from),
    scheduleReset: (driverId, after) => commit(`Reset scheduled for ${name(driverId)}`, (f, now) => A.scheduleReset(f, driverId, after, now), driverId),
    notifyCustomer: (stopIds) => commit(`${stopIds.length} customer${stopIds.length === 1 ? '' : 's'} notified`, (f, now) => A.notifyCustomer(f, stopIds, now)),
    updateStopNote: (stopId, note) => {
      const context = stopContext(stopId)
      commit(`${context.label} note updated`, (f) => A.updateStopNote(f, stopId, note), context.driverId)
    },
    cancelStop: (stopId) => {
      const context = stopContext(stopId)
      commit(`${context.label} canceled`, (f) => A.cancelStop(f, stopId), context.driverId)
    },
    callDriver: (driverId) => commit(`Call to ${name(driverId)} logged`, (f, now) => A.callDriver(f, driverId, now), driverId),
    acknowledge: (alertId) => {
      const driverId = alertId.split(':')[1]
      set((s) => ({ snoozes: { ...s.snoozes, [alertId]: s.now() + SNOOZE_MIN * MIN }, undoSnapshot: undefined, lastAction: { label: 'Snoozed for 10 min', at: Date.now(), undoable: false } }))
      log('snooze', `${name(driverId)} snoozed for 10 min`, driverId)
    },
    markArrived: (stopId) => commit('Arrived', (f, now) => A.markArrived(f, stopId, now)),
    markDeparted: (stopId, outcome) => commit('Stop completed', (f, now) => A.markDeparted(f, stopId, outcome, now)),
    bringOnline: (driverId) => {
      const now = get().now()
      const before = get().fleet.drivers.find((d) => d.id === driverId)
      if (!before) return
      const was = minutesUntilLimit(before, now)
      const fleet = A.bringOnline(get().fleet, driverId, now)
      const after = fleet.drivers.find((d) => d.id === driverId)!
      set({ fleet, corrections: { ...get().corrections, [driverId]: { was, now: minutesUntilLimit(after, now), at: Date.now() } }, lastAction: { label: `${name(driverId)} is back online`, at: Date.now(), undoable: false } })
      log('reconnect', `${name(driverId)} is back online`, driverId)
    },
    undo: () => {
      const snap = get().undoSnapshot
      if (!snap) return
      const undone = get().lastAction?.label
      set({ fleet: snap, undoSnapshot: undefined, lastAction: { label: 'Undone', at: Date.now(), undoable: false } })
      log('undo', undone ? `Undone: ${undone}` : 'Undone')
    },
    scrub: (ms) => {
      set((s) => ({ scrubOffsetMs: clampScrub(s.scrubOffsetMs + ms) }))
      get().advanceWorld()
    },
    setScrubOffset: (ms) => {
      set({ scrubOffsetMs: clampScrub(ms) })
      get().advanceWorld()
    },
    setClock: (t) => {
      // An absolute time of day: the offset that lands the live clock on it.
      set({ scrubOffsetMs: clampScrub(t - simNow(0)) })
      get().advanceWorld()
    },
    resetClock: () => {
      set({ scrubOffsetMs: 0 })
      get().advanceWorld()
    },
    advanceWorld: () => {
      const next = materialize(get().fleet, get().now())
      if (next !== get().fleet) set({ fleet: next })
    },
    resetFleet: () => set({ fleet: makeFleet(ANCHOR), snoozes: {}, corrections: {}, events: opening(), undoSnapshot: undefined, lastAction: undefined, scrubOffsetMs: 0 }),
    setGroupBy: (groupBy) => set({ groupBy }),
    toggleDev: () => set((s) => ({ devOpen: !s.devOpen })),
  }
})
