import { MIN } from '../time/clock'
import { applyPlanted } from './planted'
import { materialize } from './simulate'
import { makeRng, type Rng } from './prng'
import { REGIONS, REGION_CENTER, REGION_LEG_MINUTES } from './regions'
import type { Delivery, Driver, DutySegment, Fleet, LatLng, Region, Route, Stop, Truck } from './types'

export const SEED = 20260903
export const DRIVER_COUNT = 50
export const STOPS_PER_ROUTE = 20

const FIRST_NAMES = [
  'Marcus', 'Priya', 'Dre', 'Elena', 'Sam', 'Nadia', 'Tomas', 'Ana', 'Ravi', 'Omar',
  'Lucia', 'Ben', 'Kofi', 'Mei', 'Jonah', 'Sofia', 'Amir', 'Grace', 'Diego', 'Hana',
  'Leo', 'Ivy', 'Malik', 'Rosa', 'Theo', 'Yara', 'Felix', 'Nina', 'Caleb', 'Zara',
  'Owen', 'Tara', 'Idris', 'Maya', 'Ezra', 'Wren', 'Noor', 'Jude', 'Aria', 'Cole',
  'Esme', 'Rafael', 'Bo', 'Selin', 'Kai', 'Vera', 'Otis', 'Imani', 'Hugo', 'Luz',
]
const LAST_INITIALS = 'ABCDEFGHJKLMNPRSTVW'
// Gender for the placeholder avatar, by first name; the planted drivers share these names.
const FEMALE = new Set(['Priya', 'Elena', 'Nadia', 'Ana', 'Lucia', 'Mei', 'Sofia', 'Grace', 'Hana', 'Ivy', 'Rosa', 'Yara', 'Nina', 'Zara', 'Tara', 'Maya', 'Wren', 'Noor', 'Aria', 'Esme', 'Selin', 'Vera', 'Imani', 'Luz'])
const CUSTOMERS = [
  'Lakeside Grocers', 'Harbor Cafe', 'Prairie Market', 'Union Hardware', 'Bluebird Bakery', 'Northgate Pharmacy',
  'Ridge Auto Parts', 'Cedar Street Diner', 'Metro Print Co.', 'Oakline Furniture', 'Pine & Co. Florist', 'Summit Fitness',
  'Riverbend Books', 'Elmwood Deli', 'Crescent Hotel', 'Silver Spoon Catering', 'Greenway Nursery', 'Ironworks Brewing',
  'Starling Dental', 'Copperline Salon', 'Maple Row Pizzeria', 'Fieldstone Butcher', 'Beacon Coffee', 'Tallgrass Wines',
]
const STREETS = [
  'Ashland Ave', 'Halsted St', 'Western Ave', 'Kedzie Ave', 'Pulaski Rd', 'Cicero Ave', 'Clark St', 'Damen Ave',
  'Milwaukee Ave', 'Archer Ave', 'Lincoln Ave', 'Elston Ave', 'Stony Island Ave', 'Cottage Grove Ave', 'Belmont Ave',
  'Fullerton Ave', 'Irving Park Rd', 'Roosevelt Rd', 'Cermak Rd', 'Grand Ave',
]
const ITEMS = ['cases · dry goods', 'pallets · produce', 'cases · beverages', 'totes · frozen', 'cartons · paper goods', 'crates · dairy', 'drums · cleaning supply', 'boxes · small parts']
const INSTRUCTIONS = ['Dock B. Call on arrival.', 'Back entrance, ring twice.', 'Leave with manager only.', 'Liftgate needed.', 'Deliver before lunch rush.', 'Check in at front desk.']
const SIGNERS = ['M. Ortiz', 'J. Chen', 'R. Patel', 'S. Okafor', 'L. Nguyen', 'D. Kowalski', 'A. Haddad', 'T. Brooks']

function jitterAround(center: LatLng, rng: Rng, spread: number): LatLng {
  return { lat: center.lat + (rng.next() - 0.5) * spread, lng: center.lng + (rng.next() - 0.5) * spread * 1.3 }
}

// Each stop is a walk from the previous one, the leg's drive minutes setting the distance,
// so on a map a route reads as a route and the geography agrees with the schedule. Two rng
// draws per stop, the same as the jitter it replaced, so nothing else in the seed moved.
const KM_PER_DRIVE_MIN = 0.25 // city truck pace, lights and docks included
const DEG_PER_KM = 1 / 111
const REGION_HALF = { lat: 0.045, lng: 0.06 }

function reflect(value: number, center: number, half: number): number {
  const d = value - center
  return Math.abs(d) <= half ? value : center + Math.sign(d) * (2 * half - Math.abs(d))
}

function walkFrom(prev: LatLng, before: LatLng | undefined, center: LatLng, driveMin: number, rng: Rng): LatLng {
  // Keep roughly heading the way the route was going (a turn of up to ±90°); the first leg picks any bearing.
  const draw = rng.next()
  const bearing = before ? Math.atan2(prev.lng - before.lng, prev.lat - before.lat) + (draw - 0.5) * Math.PI : draw * 2 * Math.PI
  const km = driveMin * KM_PER_DRIVE_MIN * (0.7 + rng.next() * 0.6)
  const lat = prev.lat + Math.cos(bearing) * km * DEG_PER_KM
  const lng = prev.lng + (Math.sin(bearing) * km * DEG_PER_KM) / Math.cos((center.lat * Math.PI) / 180)
  return { lat: reflect(lat, center.lat, REGION_HALF.lat), lng: reflect(lng, center.lng, REGION_HALF.lng) }
}

interface Generated { driver: Driver; truck: Truck; route: Route; deliveries: Delivery[] }

function generateDriver(i: number, rng: Rng, anchor: number): Generated {
  const region: Region = REGIONS[i % REGIONS.length]
  const n = String(i + 1).padStart(2, '0')
  const id = `drv-${n}`
  const truckId = `trk-${n}`
  const routeId = `rt-${n}`
  const first = FIRST_NAMES[i]
  const lastInitial = LAST_INITIALS[rng.int(0, LAST_INITIALS.length - 1)]
  const shiftStartedAt = anchor - rng.int(6 * 60 + 17, 8 * 60 + 17) * MIN // 06:30–08:30 for the generated fleet
  const plannedStartAt = shiftStartedAt + rng.int(20, 30) * MIN // pre-trip inspection
  const [legMin, legMax] = REGION_LEG_MINUTES[region]
  // Most drivers run within a few minutes of plan; roughly one in twelve runs genuinely late.
  const driftRate = rng.chance(0.08) ? 0.12 : rng.pick([-0.06, -0.03, 0, 0, 0, 0.03, 0.06])

  const segments: DutySegment[] = [{ status: 'on_duty', startedAt: shiftStartedAt, endedAt: plannedStartAt }]
  const stops: Stop[] = []
  const deliveries: Delivery[] = []

  let plannedT = plannedStartAt
  let actualT = plannedStartAt
  let drivingSinceBreak = 0
  let breakTaken = false
  let position = jitterAround(REGION_CENTER[region], rng, 0.04)

  // The whole day is simulated up front: every stop carries the time the driver will reach
  // it and leave it, and the segments run to the end of the shift. materialize() turns the
  // clock into stop statuses, so the generated fleet keeps moving while the demo runs.
  for (let k = 0; k < STOPS_PER_ROUTE; k++) {
    const drive = rng.int(legMin, legMax)
    const service = rng.int(6, 20)
    const plannedEta = plannedT + drive * MIN
    plannedT = plannedEta + service * MIN

    const deliveryId = `dlv-${n}-${String(k + 1).padStart(2, '0')}`
    const stopPosition = walkFrom(k === 0 ? position : deliveries[k - 1].position, k === 0 ? undefined : k === 1 ? position : deliveries[k - 2].position, REGION_CENTER[region], drive, rng)
    deliveries.push({
      id: deliveryId,
      customer: CUSTOMERS[rng.int(0, CUSTOMERS.length - 1)],
      address: `${rng.int(100, 9900)} ${STREETS[rng.int(0, STREETS.length - 1)]}`,
      position: stopPosition,
      window: { start: plannedEta - 45 * MIN, end: plannedEta + 45 * MIN },
      priority: rng.chance(0.15) ? 'priority' : 'standard',
      items: [`${rng.int(2, 24)} ${ITEMS[rng.int(0, ITEMS.length - 1)]}`],
      instructions: rng.chance(0.3) ? INSTRUCTIONS[rng.int(0, INSTRUCTIONS.length - 1)] : undefined,
    })

    // A 30-minute break after ~4.5h of driving, before starting the next leg.
    if (!breakTaken && drivingSinceBreak >= 270) {
      segments.push({ status: 'on_break', startedAt: actualT, endedAt: actualT + 30 * MIN })
      actualT += 30 * MIN
      breakTaken = true
      drivingSinceBreak = 0
    }

    const departPrev = actualT
    const actualDrive = Math.max(4, Math.round(drive * (1 + driftRate) + rng.int(-2, 2)))
    const arrivedAt = departPrev + actualDrive * MIN
    const departedAt = arrivedAt + service * MIN
    const failed = rng.chance(0.03)
    segments.push({ status: 'driving', startedAt: departPrev, endedAt: arrivedAt })
    segments.push({ status: 'on_duty', startedAt: arrivedAt, endedAt: departedAt })
    stops.push({
      id: `stp-${n}-${String(k + 1).padStart(2, '0')}`, routeId, deliveryId, seq: k + 1, driveMinutesFromPrev: drive, serviceMinutes: service, plannedEta,
      status: 'pending', // materialize() sets done / in_progress / pending from the clock
      arrivedAt, departedAt,
      outcome: failed ? 'failed' : rng.chance(0.06) ? 'partial' : 'delivered',
      signedBy: failed ? undefined : SIGNERS[rng.int(0, SIGNERS.length - 1)],
      note: failed ? 'Customer closed. Retry after 3 PM.' : undefined,
    })
    drivingSinceBreak += actualDrive
    actualT = departedAt
    if (arrivedAt <= anchor) position = stopPosition
  }
  // Back to the yard, then off duty for the night.
  segments.push({ status: 'driving', startedAt: actualT, endedAt: actualT + 20 * MIN })
  segments.push({ status: 'off_duty', startedAt: actualT + 20 * MIN })

  const driver: Driver = { id, name: `${first} ${lastInitial}.`, initials: `${first[0]}${lastInitial}`, gender: FEMALE.has(first) ? 'f' : 'm', truckId, routeId, region, shiftStartedAt, segments, lastPingAt: anchor - 30_000 }
  const truck: Truck = { id: truckId, plate: `IL ${rng.int(100, 999)} ${LAST_INITIALS[rng.int(0, 18)]}${LAST_INITIALS[rng.int(0, 18)]}${LAST_INITIALS[rng.int(0, 18)]}`, region, position, lastPingAt: driver.lastPingAt }
  const route: Route = { id: routeId, driverId: id, region, plannedStartAt, windowEnd: plannedT + 60 * MIN, stops }
  return { driver, truck, route, deliveries }
}

export function generateFleet(anchor: number, seed: number = SEED): Fleet {
  const rng = makeRng(seed)
  const fleet: Fleet = { drivers: [], trucks: [], routes: [], deliveries: [] }
  for (let i = 0; i < DRIVER_COUNT; i++) {
    const g = generateDriver(i, rng, anchor)
    fleet.drivers.push(g.driver)
    fleet.trucks.push(g.truck)
    fleet.routes.push(g.route)
    fleet.deliveries.push(...g.deliveries)
  }
  return fleet
}

/** The fleet the app boots with: generated, the planted scenarios overwrite eleven drivers,
 *  and the clock is applied once so every stop has the status it should have at the anchor. */
export function makeFleet(anchor: number): Fleet {
  return materialize(applyPlanted(generateFleet(anchor), anchor), anchor)
}
