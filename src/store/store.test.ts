import { SCRUB_MIN_MS } from '../time/clock'
import { beforeEach, describe, expect, it } from 'vitest'
import { remainingDriveMinutes } from '../hos/compute'
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
})
