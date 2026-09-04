import { MIN } from '../time/clock'
import type { Driver, DutySegment, DutyStatus, Fleet, Region, Route, Stop } from './types'

// Ten hand-authored drivers overwrite generated ones so the demo is reliable. Each day is
// built in ONE backward walk from the anchor, so the duty segments and the stop receipts
// describe the same day: every done stop sits inside an on_duty segment, every leg is a
// driving segment, and the route file's timeline and receipts agree.

interface Plant {
  id: string
  name: string
  region: Region
  /** Driving minutes at the anchor as the telematics projection sees them (an open driving segment counts to now). */
  drivingMin: number
  stopsDone: number
  /** Drive legs, in minutes, for each remaining stop. Empty = route complete. */
  legsLeft: number[]
  status: 'driving' | 'on_break' | 'on_duty'
  /** How long the current status has lasted. */
  statusForMin: number
  /** A 30-minute break in the middle of the done stops. */
  breakTaken: boolean
  driftMin: number
  /** Minutes since the last ping; undefined = online. */
  pingAgeMin?: number
  /** What really happened after the last ping (unseen by telematics until reconnect). */
  truthAfterPing?: { status: DutyStatus; startsMinAfterPing: number }
}

export const PLANTS: Plant[] = [
  // The hero: 12 min of drive time, 34 min of driving left, running late. Approaching + won't finish.
  { id: 'drv-01', name: 'Marcus R.', region: 'North', drivingMin: 648, stopsDone: 12, legsLeft: [10, 14, 10], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 15 },
  // Over the limit by 6 minutes and still driving.
  { id: 'drv-02', name: 'Priya S.', region: 'West', drivingMin: 666, stopsDone: 14, legsLeft: [12, 9], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 5 },
  // Dark for 25 minutes. Last seen driving; the projection says 40 left. Truth: on break 5 min after the ping.
  { id: 'drv-03', name: 'Dre W.', region: 'South', drivingMin: 620, stopsDone: 11, legsLeft: [18, 22, 20, 25], status: 'driving', statusForMin: 30, breakTaken: true, driftMin: 8, pingAgeMin: 25, truthAfterPing: { status: 'on_break', startsMinAfterPing: 5 } },
  // On break, 20 minutes in, two hours of drive time left.
  { id: 'drv-04', name: 'Elena M.', region: 'Central', drivingMin: 540, stopsDone: 10, legsLeft: [9, 12, 8, 10, 11], status: 'on_break', statusForMin: 20, breakTaken: false, driftMin: 0 },
  // 8h05m of driving with no 30-minute break. Clear on the 11-hour rule; trips the break rule added live.
  { id: 'drv-05', name: 'Sam K.', region: 'North', drivingMin: 485, stopsDone: 12, legsLeft: [15, 12, 14, 11], status: 'driving', statusForMin: 6, breakTaken: false, driftMin: 3 },
  // Stale 4 minutes with a clear HOS: the stale tier on its own. Eleven minutes into a demo she
  // goes dark and becomes the Offline band's first member, still clear.
  { id: 'drv-06', name: 'Nadia F.', region: 'West', drivingMin: 530, stopsDone: 13, legsLeft: [12, 14, 10], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 4, pingAgeMin: 4 },
  // 50 minutes behind with seven stops left and a clear HOS: every remaining stop misses its window.
  { id: 'drv-07', name: 'Tomas B.', region: 'South', drivingMin: 420, stopsDone: 9, legsLeft: [20, 22, 18, 25, 20, 24, 19], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 50 },
  // The obvious reassign candidate for Marcus: same region, seven hours of drive time, five short stops.
  { id: 'drv-08', name: 'Ana L.', region: 'North', drivingMin: 240, stopsDone: 11, legsLeft: [10, 12, 9, 11, 10], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: -3 },
  // The marginal candidate near Priya: 55 minutes left, 32 of driving still to do. Excluded by the capacity margin.
  { id: 'drv-09', name: 'Ravi P.', region: 'West', drivingMin: 605, stopsDone: 13, legsLeft: [10, 12, 10], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 2 },
  // Watch, fresh, finishes fine. Fills the Watch band with a boring case.
  { id: 'drv-10', name: 'Omar H.', region: 'Central', drivingMin: 595, stopsDone: 12, legsLeft: [9, 8, 10, 9], status: 'driving', statusForMin: 6, breakTaken: true, driftMin: 1 },
  // Route complete, heading in. The "all stops done" edge path has a live example.
  { id: 'drv-11', name: 'Lucia B.', region: 'Central', drivingMin: 300, stopsDone: 20, legsLeft: [], status: 'driving', statusForMin: 10, breakTaken: true, driftMin: 0 },
]

const PRE_TRIP_MIN = 25
const BREAK_LEN_MIN = 30
const SIGNER = 'M. Ortiz'

function plantDay(route: Route, plant: Plant, anchor: number): { segments: DutySegment[]; shiftStartedAt: number; stops: Stop[] } {
  const doneSource = route.stops.slice(0, plant.stopsDone)
  const leftSource = route.stops.slice(plant.stopsDone, plant.stopsDone + plant.legsLeft.length)
  const n = doneSource.length
  const openDriving = plant.status === 'driving' ? plant.statusForMin : 0
  // Spread the driving the driver has done across the done legs, with a little texture.
  const toSpread = Math.max(0, plant.drivingMin - openDriving)
  const base = n > 0 ? Math.floor(toSpread / n) : 0
  let remainder = n > 0 ? toSpread - base * n : 0
  const legs = doneSource.map(() => base + (remainder-- > 0 ? 1 : 0))
  for (let i = 0; i + 1 < legs.length; i += 2) {
    if (legs[i + 1] - 2 >= 4) { legs[i] += 2; legs[i + 1] -= 2 }
  }
  // Quick drops keep the on-duty day under the 14-hour window even for the near-limit heroes.
  const services = doneSource.map((_, i) => 6 + (i % 4))

  let t = anchor - plant.statusForMin * MIN // when the current status began
  const segments: DutySegment[] = [{ status: plant.status, startedAt: t }]
  const done: Stop[] = []
  const breakAfter = plant.breakTaken && n > 1 ? Math.floor(n / 2) - 1 : -1
  for (let i = n - 1; i >= 0; i--) {
    if (i === breakAfter) {
      segments.unshift({ status: 'on_break', startedAt: t - BREAK_LEN_MIN * MIN, endedAt: t })
      t -= BREAK_LEN_MIN * MIN
    }
    const departedAt = t
    const arrivedAt = departedAt - services[i] * MIN
    segments.unshift({ status: 'on_duty', startedAt: arrivedAt, endedAt: departedAt })
    segments.unshift({ status: 'driving', startedAt: arrivedAt - legs[i] * MIN, endedAt: arrivedAt })
    // The slip builds over the day: the last done stop carries the full drift, the first almost none.
    const slip = plant.driftMin * ((i + 1) / n)
    done.unshift({ ...doneSource[i], status: 'done', driveMinutesFromPrev: legs[i], serviceMinutes: services[i], arrivedAt, departedAt, outcome: 'delivered', signedBy: doneSource[i].signedBy ?? SIGNER, note: undefined, plannedEta: arrivedAt - slip * MIN })
    t = arrivedAt - legs[i] * MIN
  }
  segments.unshift({ status: 'on_duty', startedAt: t - PRE_TRIP_MIN * MIN, endedAt: t })
  const shiftStartedAt = t - PRE_TRIP_MIN * MIN

  // Remaining stops: the next one was due `driftMin` ago; the rest follow their legs.
  let planned = anchor - plant.driftMin * MIN
  const left: Stop[] = leftSource.map((s, i) => {
    const leg = plant.legsLeft[i]
    const plannedEta = i === 0 ? planned : planned + leg * MIN
    planned = plannedEta + s.serviceMinutes * MIN
    return { ...s, status: 'pending', arrivedAt: undefined, departedAt: undefined, outcome: undefined, signedBy: undefined, note: undefined, notifiedAt: undefined, driveMinutesFromPrev: leg, plannedEta }
  })
  const stops = [...done, ...left].map((s, i) => ({ ...s, seq: i + 1 }))
  return { segments, shiftStartedAt, stops: stops.length > 0 ? stops : [] }
}

const WINDOW_HALF_MIN = 45

export function applyPlanted(fleet: Fleet, anchor: number): Fleet {
  const drivers = [...fleet.drivers]
  const routes = [...fleet.routes]
  const trucks = [...fleet.trucks]
  const windowFor = new Map<string, { start: number; end: number }>()
  for (const plant of PLANTS) {
    const di = drivers.findIndex((d) => d.id === plant.id)
    const ri = routes.findIndex((r) => r.driverId === plant.id)
    if (di < 0 || ri < 0) continue
    const { segments, shiftStartedAt, stops } = plantDay(routes[ri], plant, anchor)
    const lastPingAt = plant.pingAgeMin === undefined ? anchor - 30_000 : anchor - plant.pingAgeMin * MIN
    if (plant.truthAfterPing) {
      const startsAt = lastPingAt + plant.truthAfterPing.startsMinAfterPing * MIN
      segments[segments.length - 1].endedAt = startsAt
      segments.push({ status: plant.truthAfterPing.status, startedAt: startsAt })
    }
    const [first, ...rest] = plant.name.split(' ')
    const driver: Driver = { ...drivers[di], name: plant.name, initials: `${first[0]}${rest[0]?.[0] ?? ''}`, region: plant.region, shiftStartedAt, segments, lastPingAt, pingsSuspended: plant.pingAgeMin !== undefined }
    drivers[di] = driver
    const firstStop = stops[0]
    const plannedStartAt = firstStop ? firstStop.plannedEta - firstStop.driveMinutesFromPrev * MIN : shiftStartedAt + PRE_TRIP_MIN * MIN
    const lastPlanned = stops.length > 0 ? stops[stops.length - 1].plannedEta + stops[stops.length - 1].serviceMinutes * MIN : anchor
    routes[ri] = { ...routes[ri], region: plant.region, plannedStartAt, windowEnd: lastPlanned + 60 * MIN, stops }
    // A delivery's window is a promise made against the plan, so it moves with the re-timed plan.
    for (const s of stops) windowFor.set(s.deliveryId, { start: s.plannedEta - WINDOW_HALF_MIN * MIN, end: s.plannedEta + WINDOW_HALF_MIN * MIN })
    const ti = trucks.findIndex((t) => t.id === driver.truckId)
    if (ti >= 0) trucks[ti] = { ...trucks[ti], region: plant.region, lastPingAt }
  }
  const deliveries = fleet.deliveries.map((d) => (windowFor.has(d.id) ? { ...d, window: windowFor.get(d.id)! } : d))
  return { ...fleet, drivers, routes, trucks, deliveries }
}
