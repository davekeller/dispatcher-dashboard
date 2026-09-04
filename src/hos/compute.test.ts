import { describe, expect, it } from 'vitest'
import type { Driver, DutySegment, Route, Stop } from '../data/types'
import { MIN } from '../time/clock'
import {
  drivingMinutes, drivingSinceBreak, effectiveLastPingAt, hosStatusOf, knownSegments, limitHitAt,
  minutesUntilLimit, remainingDriveMinutes, scheduleDrift, segmentsKnownAt, stalenessOf, currentStatus,
} from './compute'

const m = (n: number) => n * MIN

function driver(segments: DutySegment[], lastPingAt: number, pingsSuspended = false): Driver {
  return { id: 'drv-t', name: 'Test T.', initials: 'TT', gender: 'm', truckId: 'trk-t', routeId: 'rt-t', region: 'North', shiftStartedAt: 0, segments, lastPingAt, pingsSuspended }
}

function stop(seq: number, drive: number, service: number, plannedEta: number, extra: Partial<Stop> = {}): Stop {
  return { id: `s${seq}`, routeId: 'rt-t', deliveryId: `d${seq}`, seq, driveMinutesFromPrev: drive, serviceMinutes: service, plannedEta, status: 'pending', ...extra }
}

function route(stops: Stop[]): Route {
  return { id: 'rt-t', driverId: 'drv-t', region: 'North', plannedStartAt: 0, windowEnd: m(700), stops }
}

describe('segmentsKnownAt', () => {
  it('drops segments that started after the ping and reopens ones that ended after it', () => {
    const segs: DutySegment[] = [
      { status: 'driving', startedAt: m(0), endedAt: m(50) },
      { status: 'on_break', startedAt: m(50), endedAt: m(80) },
    ]
    const known = segmentsKnownAt(segs, m(40))
    expect(known).toEqual([{ status: 'driving', startedAt: m(0), endedAt: undefined }])
  })
  it('always keeps planned segments: they are our data, not telematics', () => {
    const segs: DutySegment[] = [{ status: 'off_duty', startedAt: m(500), endedAt: m(1100), planned: true }]
    expect(segmentsKnownAt(segs, m(40))).toHaveLength(1)
  })
})

describe('drivingMinutes', () => {
  it('closes the ongoing segment at now', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(90))
    expect(drivingMinutes(d, m(90))).toBeCloseTo(90)
  })
  it('a break pauses accumulation', () => {
    const d = driver([{ status: 'driving', startedAt: m(0), endedAt: m(60) }, { status: 'on_break', startedAt: m(60) }], m(100))
    expect(drivingMinutes(d, m(100))).toBeCloseTo(60)
    expect(currentStatus(d, m(100))).toBe('on_break')
  })
  it('an offline driver last seen driving keeps accumulating (the honest pessimistic projection)', () => {
    // Truth: went on break at 45. Telematics last heard at 40. At 70 the projection says 70 min of driving.
    const d = driver([{ status: 'driving', startedAt: m(0), endedAt: m(45) }, { status: 'on_break', startedAt: m(45) }], m(40), true)
    expect(knownSegments(d, m(70))).toHaveLength(1)
    expect(drivingMinutes(d, m(70))).toBeCloseTo(70)
  })
  it('a planned reset caps the ongoing drive once it starts', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }, { status: 'off_duty', startedAt: m(30), endedAt: m(630), planned: true }], m(50))
    expect(drivingMinutes(d, m(50))).toBeCloseTo(30)
    expect(currentStatus(d, m(50))).toBe('off_duty')
  })
})

describe('thresholds', () => {
  it('bands are inclusive at the boundary and monotonic', () => {
    expect(hosStatusOf(0)).toBe('over')
    expect(hosStatusOf(0.01)).toBe('act_now')
    expect(hosStatusOf(30)).toBe('act_now')
    expect(hosStatusOf(30.01)).toBe('watch')
    expect(hosStatusOf(90)).toBe('watch')
    expect(hosStatusOf(90.01)).toBe('clear')
  })
  it('staleness tiers', () => {
    expect(stalenessOf(2.99)).toBe('fresh')
    expect(stalenessOf(3)).toBe('stale')
    expect(stalenessOf(15)).toBe('stale')
    expect(stalenessOf(15.01)).toBe('offline')
  })
  it('minutesUntilLimit is 660 minus driving', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(648))
    expect(minutesUntilLimit(d, m(648))).toBeCloseTo(12)
  })
})

describe('effectiveLastPingAt', () => {
  it('online drivers ping with the clock; suspended drivers keep their stored ping', () => {
    const online = driver([], m(0))
    expect(m(500) - effectiveLastPingAt(online, m(500))).toBeLessThan(90_000)
    const dark = driver([], m(475), true)
    expect(effectiveLastPingAt(dark, m(500))).toBe(m(475))
  })
})

describe('route math', () => {
  const r = route([
    stop(1, 10, 15, m(100), { status: 'done', arrivedAt: m(115), departedAt: m(130) }),
    stop(2, 10, 15, m(125)),
    stop(3, 15, 10, m(150)),
  ])
  it("remaining drive excludes done stops and an in-progress stop's leg", () => {
    expect(remainingDriveMinutes(r)).toBe(25)
    const arrived = route([stop(1, 10, 15, m(100), { status: 'in_progress', arrivedAt: m(120) }), stop(2, 20, 5, m(140))])
    expect(remainingDriveMinutes(arrived)).toBe(20)
  })
  it('drift is the slip at the last checkpoint, or the overdue time on the next stop, whichever is worse', () => {
    expect(scheduleDrift(r, m(135))).toBeCloseTo(15) // departed stop 1 at 130, planned departure was 115
    expect(scheduleDrift(r, m(160))).toBeCloseTo(35) // should have reached stop 2 at 125
  })
  it('at the dock, drift keeps growing once the planned departure passes', () => {
    const docked = route([stop(1, 10, 15, m(100), { status: 'in_progress', arrivedAt: m(118) }), stop(2, 20, 5, m(140))])
    expect(scheduleDrift(docked, m(120))).toBeCloseTo(18) // arrived 18 late
    expect(scheduleDrift(docked, m(180))).toBeCloseTo(65) // planned departure was 115; still there at 180
  })
  it('limitHitAt walks legs and skips service time', () => {
    // 20 min of drive time left. Stop 2: 10 drive + 15 service. Stop 3: 15 drive. Limit lands 10 min into leg 3.
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(640))
    const now = m(640)
    expect(limitHitAt(d, r, now)).toBe(now + m(10 + 15 + 10))
  })
  it('limitHitAt is now when already over', () => {
    const d = driver([{ status: 'driving', startedAt: m(0) }], m(700))
    expect(limitHitAt(d, r, m(700))).toBe(m(700))
  })
})

describe('drivingSinceBreak', () => {
  it('resets on an interruption of 30 minutes or more', () => {
    const d = driver([
      { status: 'driving', startedAt: m(0), endedAt: m(200) },
      { status: 'on_break', startedAt: m(200), endedAt: m(230) },
      { status: 'driving', startedAt: m(230) },
    ], m(300))
    expect(drivingSinceBreak(d, m(300))).toBeCloseTo(70)
  })
  it('a short stop does not reset it', () => {
    const d = driver([
      { status: 'driving', startedAt: m(0), endedAt: m(200) },
      { status: 'on_duty', startedAt: m(200), endedAt: m(215) },
      { status: 'driving', startedAt: m(215) },
    ], m(300))
    expect(drivingSinceBreak(d, m(300))).toBeCloseTo(285)
  })
})
