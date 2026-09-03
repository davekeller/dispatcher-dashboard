import { MIN } from '../time/clock'
import type { Driver, DutySegment, DutyStatus, Fleet, Region, Route, Stop } from './types'

interface Plant {
  id: string
  name: string
  region: Region
  /** Duty blocks in order, ending at the anchor. The last one is ongoing. */
  blocks: [DutyStatus, number][]
  /** Minutes since the last ping; undefined = online. */
  pingAgeMin?: number
  /** What really happened after the last ping (unseen by telematics until reconnect). */
  truthAfterPing?: { status: DutyStatus; startsMinAfterPing: number }
  stopsDone: number
  /** Drive legs, in minutes, for each remaining stop. */
  legsLeft: number[]
  driftMin: number
}

export const PLANTS: Plant[] = [
  // The hero: 12 min of drive time, 34 min of driving left, running late. Approaching + won't finish.
  { id: 'drv-01', name: 'Marcus R.', region: 'North', blocks: [['on_duty', 25], ['driving', 170], ['on_duty', 12], ['driving', 160], ['on_break', 30], ['driving', 150], ['on_duty', 10], ['driving', 168]], stopsDone: 12, legsLeft: [10, 14, 10], driftMin: 15 },
  // Over the limit by 6 minutes and still driving.
  { id: 'drv-02', name: 'Priya S.', region: 'West', blocks: [['on_duty', 25], ['driving', 200], ['on_duty', 12], ['driving', 180], ['on_break', 30], ['driving', 286]], stopsDone: 14, legsLeft: [12, 9], driftMin: 5 },
  // Dark for 25 minutes. Last seen driving with 65 left → the projection says 40 now. Truth: on break 5 min after the ping.
  { id: 'drv-03', name: 'Dre W.', region: 'South', blocks: [['on_duty', 25], ['driving', 220], ['on_duty', 14], ['driving', 200], ['on_break', 30], ['driving', 200]], pingAgeMin: 25, truthAfterPing: { status: 'on_break', startsMinAfterPing: 5 }, stopsDone: 11, legsLeft: [18, 22, 20, 25], driftMin: 8 },
  // On break, 20 minutes in, two hours of drive time left.
  { id: 'drv-04', name: 'Elena M.', region: 'Central', blocks: [['on_duty', 25], ['driving', 300], ['on_duty', 12], ['driving', 240], ['on_break', 20]], stopsDone: 10, legsLeft: [9, 12, 8, 10, 11], driftMin: 0 },
  // 8h05m of driving with no 30-minute break. Clear on the 11-hour rule; trips the break rule added live.
  { id: 'drv-05', name: 'Sam K.', region: 'North', blocks: [['on_duty', 25], ['driving', 200], ['on_duty', 15], ['driving', 150], ['on_duty', 12], ['driving', 135]], stopsDone: 12, legsLeft: [15, 12, 14, 11], driftMin: 3 },
  // Stale 8 minutes, inside the watch window. Tilde, dropped seconds, age label; band unchanged.
  { id: 'drv-06', name: 'Nadia F.', region: 'West', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 200], ['on_break', 30], ['driving', 140]], pingAgeMin: 8, stopsDone: 13, legsLeft: [12, 14, 10], driftMin: 4 },
  // 35 minutes behind with seven stops left and a clear HOS. The schedule rule on its own.
  { id: 'drv-07', name: 'Tomas B.', region: 'South', blocks: [['on_duty', 25], ['driving', 180], ['on_duty', 14], ['driving', 120], ['on_break', 30], ['driving', 120]], stopsDone: 9, legsLeft: [20, 22, 18, 25, 20, 24, 19], driftMin: 35 },
  // The obvious reassign candidate for Marcus: same region, four hours of drive time, five stops.
  { id: 'drv-08', name: 'Ana L.', region: 'North', blocks: [['on_duty', 25], ['driving', 180], ['on_duty', 12], ['driving', 120], ['on_break', 30], ['driving', 120]], stopsDone: 11, legsLeft: [10, 12, 9, 11, 10], driftMin: -3 },
  // The marginal candidate near Priya: 55 minutes left, 32 of driving still to do. Excluded by the capacity margin.
  { id: 'drv-09', name: 'Ravi P.', region: 'West', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 200], ['on_break', 30], ['driving', 155]], stopsDone: 13, legsLeft: [10, 12, 10], driftMin: 2 },
  // Watch, fresh, finishes fine. Fills the Watch band with a boring case.
  { id: 'drv-10', name: 'Omar H.', region: 'Central', blocks: [['on_duty', 25], ['driving', 250], ['on_duty', 12], ['driving', 220], ['on_break', 30], ['driving', 125]], stopsDone: 12, legsLeft: [9, 8, 10, 9], driftMin: 1 },
]

function segmentsFromBlocks(blocks: [DutyStatus, number][], anchor: number): { segments: DutySegment[]; shiftStartedAt: number } {
  const total = blocks.reduce((t, [, m]) => t + m, 0)
  let t = anchor - total * MIN
  const shiftStartedAt = t
  const segments: DutySegment[] = blocks.map(([status, minutes], i) => {
    const seg: DutySegment = { status, startedAt: t }
    t += minutes * MIN
    if (i < blocks.length - 1) seg.endedAt = t
    return seg
  })
  return { segments, shiftStartedAt }
}

function retimeRoute(route: Route, plant: Plant, anchor: number): Route {
  const stops = route.stops.slice(0, plant.stopsDone + plant.legsLeft.length)
  const doneStops = stops.slice(0, plant.stopsDone)
  const leftStops = stops.slice(plant.stopsDone)
  // Done stops walk backwards from the anchor; the driver departed the last one 6 minutes ago.
  let t = anchor - 6 * MIN
  const retimedDone: Stop[] = []
  for (let i = doneStops.length - 1; i >= 0; i--) {
    const s = doneStops[i]
    const departedAt = t
    const arrivedAt = departedAt - s.serviceMinutes * MIN
    retimedDone.unshift({ ...s, status: 'done', arrivedAt, departedAt, outcome: 'delivered', signedBy: s.signedBy ?? 'M. Ortiz', note: undefined, plannedEta: arrivedAt - plant.driftMin * MIN })
    t = arrivedAt - s.driveMinutesFromPrev * MIN
  }
  // Remaining stops: the next one was due `driftMin` ago; the rest follow their legs.
  let planned = anchor - plant.driftMin * MIN
  const retimedLeft: Stop[] = leftStops.map((s, i) => {
    const leg = plant.legsLeft[i]
    const plannedEta = i === 0 ? planned : planned + leg * MIN
    planned = plannedEta + s.serviceMinutes * MIN
    return { ...s, status: 'pending', arrivedAt: undefined, departedAt: undefined, outcome: undefined, signedBy: undefined, note: undefined, driveMinutesFromPrev: leg, plannedEta }
  })
  const all = [...retimedDone, ...retimedLeft].map((s, i) => ({ ...s, seq: i + 1 }))
  const plannedStartAt = (all[0]?.plannedEta ?? anchor) - (all[0]?.driveMinutesFromPrev ?? 0) * MIN
  return { ...route, region: plant.region, plannedStartAt, windowEnd: planned + 60 * MIN, stops: all }
}

export function applyPlanted(fleet: Fleet, anchor: number): Fleet {
  const drivers = fleet.drivers.map((d) => {
    const plant = PLANTS.find((p) => p.id === d.id)
    if (!plant) return d
    const { segments, shiftStartedAt } = segmentsFromBlocks(plant.blocks, anchor)
    const lastPingAt = plant.pingAgeMin === undefined ? anchor - 30_000 : anchor - plant.pingAgeMin * MIN
    if (plant.truthAfterPing) {
      const startsAt = lastPingAt + plant.truthAfterPing.startsMinAfterPing * MIN
      const last = segments[segments.length - 1]
      last.endedAt = startsAt
      segments.push({ status: plant.truthAfterPing.status, startedAt: startsAt })
    }
    const [first, ...rest] = plant.name.split(' ')
    const driver: Driver = { ...d, name: plant.name, initials: `${first[0]}${rest[0]?.[0] ?? ''}`, region: plant.region, shiftStartedAt, segments, lastPingAt, pingsSuspended: plant.pingAgeMin !== undefined }
    return driver
  })
  const routes = fleet.routes.map((r) => {
    const plant = PLANTS.find((p) => p.id === r.driverId)
    return plant ? retimeRoute(r, plant, anchor) : r
  })
  const trucks = fleet.trucks.map((t) => {
    const driver = drivers.find((d) => d.truckId === t.id)
    if (!driver || !PLANTS.some((p) => p.id === driver.id)) return t
    return { ...t, region: driver.region, lastPingAt: driver.lastPingAt }
  })
  return { ...fleet, drivers, routes, trucks }
}
