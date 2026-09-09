import { SCRUB_MIN_MS } from '../time/clock'
import { beforeEach, describe, expect, it } from 'vitest'
import { remainingDriveMinutes } from '../hos/compute'
import { reassignCandidates } from './actions'
import { derive } from './derive'
import { useStore } from './store'

describe('store', () => {
  beforeEach(() => useStore.getState().resetFleet())

  it('commits, then undo restores the previous fleet', () => {
    const s = useStore.getState()
    const before = s.fleet
    const marcusRoute = before.routes.find((r) => r.driverId === 'drv-01')!
    const ids = marcusRoute.stops.filter((x) => x.status === 'pending').map((x) => x.id)
    s.reassignStops('drv-01', 'drv-08', ids)
    expect(remainingDriveMinutes(useStore.getState().fleet.routes.find((r) => r.driverId === 'drv-01')!)).toBe(0)
    expect(useStore.getState().lastAction?.label).toContain('Ana L.')
    useStore.getState().undo()
    expect(useStore.getState().fleet).toBe(before)
  })

  it('every action lands on the shift log, newest last, and reset wipes it', () => {
    const s = useStore.getState()
    expect(s.events.map((e) => e.kind)).toEqual(['system'])
    s.callDriver('drv-03')
    useStore.getState().undo()
    useStore.getState().acknowledge('offline_near_limit:drv-03')
    expect(useStore.getState().events.map((e) => e.kind)).toEqual(['system', 'action', 'undo', 'snooze'])
    expect(useStore.getState().events[1]).toMatchObject({ seq: 2, label: 'Call to Dre W. logged', driverId: 'drv-03' })
    expect(useStore.getState().events[2].label).toBe('Undone: Call to Dre W. logged')
    useStore.getState().resetFleet()
    expect(useStore.getState().events).toHaveLength(1)
  })

  it('a reassign event remembers the stops, both drivers, the spare time, and the driver as he was', () => {
    const s = useStore.getState()
    const d = derive(s.fleet, s.now(), s.snoozes)
    const marcus = d.byId.get('drv-01')!
    const ids = marcus.route.stops.filter((x) => x.status === 'pending').map((x) => x.id)
    const spare = reassignCandidates(d.views, marcus, ids).find((c) => c.view.driver.id === 'drv-08')!.spare
    s.reassignStops('drv-01', 'drv-08', ids)
    const e = useStore.getState().events[1]
    expect(e.detail).toMatchObject({ type: 'reassign', fromId: 'drv-01', toId: 'drv-08' })
    expect(e.detail?.type === 'reassign' && e.detail.spareAfterMin).toBeCloseTo(spare, 1)
    expect(e.detail?.type === 'reassign' && e.detail.stops.map((x) => x.seq)).toEqual(ids.map((id) => marcus.route.stops.find((x) => x.id === id)!.seq))
    expect(e.detail?.type === 'reassign' && e.detail.stops[0].customer).toBeTruthy()
    expect(e.context).toMatchObject({ hos: 'act_now', staleness: 'fresh' })
    expect(e.context!.minutesUntilLimit).toBeCloseTo(12, 0)
    expect(e.context!.alerts.length).toBeGreaterThan(0)
    expect(e.context!.severity).toBe('act_now')
  })

  it('an undo names the event it reversed; a call remembers the ping age; a snooze remembers the rule', () => {
    const s = useStore.getState()
    s.callDriver('drv-03')
    useStore.getState().undo()
    useStore.getState().acknowledge('offline_near_limit:drv-03')
    const [, call, undo, snooze] = useStore.getState().events
    expect(call.detail).toMatchObject({ type: 'call_driver' })
    expect(call.detail?.type === 'call_driver' && Math.round(call.detail.pingAgeMin)).toBe(25)
    expect(call.context?.staleness).toBe('offline')
    expect(undo.detail).toEqual({ type: 'undo', targetSeq: 2 })
    expect(snooze.detail?.type === 'snooze' && snooze.detail.ruleLabel).toBe('Offline')
    expect(snooze.detail?.type === 'snooze' && snooze.detail.until - s.now()).toBeGreaterThan(9 * 60_000)
  })

  it('a notify event carries the stops with their windows and the driver, so the card can link', () => {
    const s = useStore.getState()
    const tomas = s.fleet.routes.find((r) => r.driverId === 'drv-07')!
    const ids = tomas.stops.filter((x) => x.status === 'pending').slice(0, 2).map((x) => x.id)
    s.notifyCustomer(ids)
    const e = useStore.getState().events[1]
    expect(e.driverId).toBe('drv-07')
    expect(e.detail?.type === 'notify_customer' && e.detail.stops.map((x) => x.id)).toEqual(ids)
    expect(e.detail?.type === 'notify_customer' && e.detail.stops[0].windowEnd).toBeGreaterThan(0)
  })

  it('acknowledge snoozes for ten minutes on the simulated clock', () => {
    const s = useStore.getState()
    s.acknowledge('offline_near_limit:drv-03')
    const until = useStore.getState().snoozes['offline_near_limit:drv-03']
    expect(until - s.now()).toBeGreaterThan(9 * 60_000)
  })

  it('the scrubber sets an absolute offset and never goes before 6:00 AM', () => {
    const t0 = useStore.getState().now()
    useStore.getState().setScrubOffset(90 * 60_000)
    expect(useStore.getState().now() - t0).toBeGreaterThanOrEqual(90 * 60_000)
    useStore.getState().setScrubOffset(-99 * 60 * 60_000)
    expect(useStore.getState().scrubOffsetMs).toBe(SCRUB_MIN_MS)
  })

  it('scrub moves the simulated clock', () => {
    const t0 = useStore.getState().now()
    useStore.getState().scrub(15 * 60_000)
    expect(useStore.getState().now() - t0).toBeGreaterThanOrEqual(15 * 60_000)
  })

  it('plays the same day against the real clock, until the next scrub', () => {
    useStore.getState().setLiveClock(true)
    expect(Math.abs(useStore.getState().now() - Date.now())).toBeLessThan(1000)
    expect(useStore.getState().liveClock).toBe(true)
    useStore.getState().scrub(15 * 60_000)
    expect(useStore.getState().liveClock).toBe(false)
    useStore.getState().setLiveClock(true)
    useStore.getState().resetClock()
    expect(useStore.getState().liveClock).toBe(false)
    expect(useStore.getState().scrubOffsetMs).toBe(0)
  })
})
