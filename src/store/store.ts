import { create } from 'zustand'
import { makeFleet } from '../data/seed'
import type { Fleet, StopOutcome } from '../data/types'
import type { GroupingId } from '../groupBy'
import { minutesUntilLimit } from '../hos/compute'
import { SNOOZE_MIN } from '../hos/constants'
import { ANCHOR, MIN, simNow } from '../time/clock'
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

export interface State {
  fleet: Fleet
  scrubOffsetMs: number
  snoozes: Record<string, number>
  corrections: Record<string, Correction>
  lastAction?: LastAction
  undoSnapshot?: Fleet
  groupBy: GroupingId
  devOpen: boolean
  now: () => number
  reassignStops: (fromDriverId: string, toDriverId: string, stopIds: string[]) => void
  scheduleReset: (driverId: string, afterStopId: string | null) => void
  notifyCustomer: (stopIds: string[]) => void
  callDriver: (driverId: string) => void
  acknowledge: (alertId: string) => void
  markArrived: (stopId: string) => void
  markDeparted: (stopId: string, outcome: StopOutcome) => void
  bringOnline: (driverId: string) => void
  undo: () => void
  scrub: (ms: number) => void
  resetClock: () => void
  resetFleet: () => void
  setGroupBy: (id: GroupingId) => void
  toggleDev: () => void
}

export const useStore = create<State>()((set, get) => {
  const name = (driverId: string) => get().fleet.drivers.find((d) => d.id === driverId)?.name ?? driverId
  /** Snapshot, apply, record. Every consequential action goes through here so undo is uniform. */
  const commit = (label: string, next: (fleet: Fleet, now: number) => Fleet) => {
    const before = get().fleet
    set({ fleet: next(before, get().now()), undoSnapshot: before, lastAction: { label, at: Date.now(), undoable: true } })
  }
  return {
    fleet: makeFleet(ANCHOR),
    scrubOffsetMs: 0,
    snoozes: {},
    corrections: {},
    groupBy: 'region',
    devOpen: false,
    now: () => simNow(get().scrubOffsetMs),
    reassignStops: (from, to, stopIds) =>
      commit(`${name(from)}'s stops reassigned to ${name(to)}`, (f, now) => A.reassignStops(f, from, to, stopIds, now)),
    scheduleReset: (driverId, after) => commit(`Reset scheduled for ${name(driverId)}`, (f, now) => A.scheduleReset(f, driverId, after, now)),
    notifyCustomer: (stopIds) => commit(`${stopIds.length} customer${stopIds.length === 1 ? '' : 's'} notified`, (f, now) => A.notifyCustomer(f, stopIds, now)),
    callDriver: (driverId) => commit(`Call to ${name(driverId)} logged`, (f, now) => A.callDriver(f, driverId, now)),
    acknowledge: (alertId) =>
      set((s) => ({ snoozes: { ...s.snoozes, [alertId]: s.now() + SNOOZE_MIN * MIN }, lastAction: { label: 'Snoozed for 10 min', at: Date.now(), undoable: false } })),
    markArrived: (stopId) => commit('Arrived', (f, now) => A.markArrived(f, stopId, now)),
    markDeparted: (stopId, outcome) => commit('Stop completed', (f, now) => A.markDeparted(f, stopId, outcome, now)),
    bringOnline: (driverId) => {
      const now = get().now()
      const before = get().fleet.drivers.find((d) => d.id === driverId)
      if (!before) return
      const was = minutesUntilLimit(before, now)
      const fleet = A.bringOnline(get().fleet, driverId, now)
      const after = fleet.drivers.find((d) => d.id === driverId)!
      set({ fleet, corrections: { ...get().corrections, [driverId]: { was, now: minutesUntilLimit(after, now), at: Date.now() } } })
    },
    undo: () => {
      const snap = get().undoSnapshot
      if (snap) set({ fleet: snap, undoSnapshot: undefined, lastAction: { label: 'Undone', at: Date.now(), undoable: false } })
    },
    scrub: (ms) => set((s) => ({ scrubOffsetMs: s.scrubOffsetMs + ms })),
    resetClock: () => set({ scrubOffsetMs: 0 }),
    resetFleet: () => set({ fleet: makeFleet(ANCHOR), snoozes: {}, corrections: {}, undoSnapshot: undefined, lastAction: undefined, scrubOffsetMs: 0 }),
    setGroupBy: (groupBy) => set({ groupBy }),
    toggleDev: () => set((s) => ({ devOpen: !s.devOpen })),
  }
})
