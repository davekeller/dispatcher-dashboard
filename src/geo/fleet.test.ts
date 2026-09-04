import { describe, expect, it } from 'vitest'
import { makeFleet } from '../data/seed'
import { materialize } from '../data/simulate'
import { derive } from '../store/derive'
import { ANCHOR } from '../time/clock'
import { fleetMarkers, remainingPath } from './fleet'

describe('fleet markers', () => {
  const fleet = materialize(makeFleet(ANCHOR), ANCHOR)
  const d = derive(fleet, ANCHOR, {})
  const deliveryById = new Map(fleet.deliveries.map((x) => [x.id, x]))
  const markers = fleetMarkers(d.views, d.cardById, deliveryById)
  const by = (id: string) => markers.find((m) => m.driverId === id)!

  it('has one marker per driver, each with a fix', () => {
    expect(markers).toHaveLength(fleet.drivers.length)
    markers.forEach((m) => expect(Number.isFinite(m.position.lat) && Number.isFinite(m.position.lng)).toBe(true))
  })

  it('gives the drivers who need Lena a name-and-countdown pill', () => {
    expect(by('drv-01')).toMatchObject({ kind: 'act_now', dark: false, label: 'Marcus R. · 0:12' })
    expect(by('drv-02')).toMatchObject({ kind: 'act_now', label: 'Priya S. · -0:06' })
    expect(by('drv-10').kind).toBe('watch')
    expect(by('drv-10').label).toMatch(/^Omar H\. · \d+:\d\d$/)
  })

  it('keeps quiet trucks quiet: on break and clear get no pill', () => {
    expect(by('drv-04')).toMatchObject({ kind: 'quiet', label: null })
    expect(by('drv-11')).toMatchObject({ kind: 'quiet', label: null })
  })

  it('marks a dark truck hollow with how long ago it was last seen', () => {
    const dre = by('drv-03')
    expect(dre.kind).toBe('act_now') // dark inside the watch window fires at act-now severity, so he stays in Act now
    expect(dre.staleness).toBe('offline')
    expect(dre.dark).toBe(true)
    expect(dre.label).toBe('Dre W. · ~0:40 · last seen 25 min ago')
  })

  it("draws the selected driver's remaining path from the truck through the stops ahead", () => {
    const marcus = d.byId.get('drv-01')!
    const path = remainingPath(marcus, deliveryById)
    expect(path.stops.map((s) => s.seq)).toEqual([13, 14, 15])
    expect(path.points).toHaveLength(4)
    expect(path.points[0]).toEqual(by('drv-01').position)
  })
})
