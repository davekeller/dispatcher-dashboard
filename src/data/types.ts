export type Region = 'North' | 'West' | 'South' | 'Central'

export type DutyStatus = 'driving' | 'on_duty' | 'on_break' | 'off_duty'

export interface DutySegment {
  status: DutyStatus
  startedAt: number // epoch ms on the simulated clock
  endedAt?: number // undefined = ongoing
  planned?: boolean // a reset the dispatcher scheduled; it is our data, not telematics
}

export interface LatLng {
  lat: number
  lng: number
}

export interface Driver {
  id: string
  name: string // "Marcus R."
  initials: string
  truckId: string
  routeId: string
  region: Region
  shiftStartedAt: number
  segments: DutySegment[] // the truth; HOS math reads segmentsKnownAt(lastPing)
  lastPingAt: number // mirrors the truck's telematics ping
  pingsSuspended?: boolean // planted stale/offline drivers stop pinging
  contactAttemptedAt?: number
}

export interface Truck {
  id: string
  plate: string
  region: Region
  position: LatLng
  lastPingAt: number
}

export interface Delivery {
  id: string
  customer: string
  address: string
  position: LatLng
  window: { start: number; end: number }
  priority: 'standard' | 'priority'
  items: string[]
  instructions?: string
}

export type StopStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'unassigned'
export type StopOutcome = 'delivered' | 'partial' | 'failed'

export interface Stop {
  id: string
  routeId: string
  deliveryId: string
  seq: number
  driveMinutesFromPrev: number // the leg into this stop; consumes the 11-hour limit
  serviceMinutes: number // time at the stop; on duty, not driving
  plannedEta: number
  status: StopStatus
  arrivedAt?: number
  departedAt?: number
  outcome?: StopOutcome
  signedBy?: string
  notifiedAt?: number
  note?: string
}

export interface Route {
  id: string
  driverId: string
  region: Region
  plannedStartAt: number
  windowEnd: number
  stops: Stop[] // ordered by seq
}

export interface Fleet {
  drivers: Driver[]
  trucks: Truck[]
  routes: Route[]
  deliveries: Delivery[]
}
