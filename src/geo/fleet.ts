import type { DriverCard } from '../alerts/types'
import type { Band } from '../bands'
import type { Delivery, LatLng } from '../data/types'
import type { Staleness } from '../hos/compute'
import { fmtAge, fmtCountdown } from '../lib/format'
import type { DriverView } from '../store/view'
import { truckFixAt, type TruckFix } from './truckPosition'

// The attention rule on a map. Quiet trucks (clear, on break) are small dots in their band
// color, the board's green and blue; the ones that need Lena carry a name-and-countdown pill; a dark truck is
// hollow at its last known fix with how long ago that was. Pure, so the map view holds no logic.

export type FleetMarkerKind = 'quiet' | 'watch' | 'act_now' | 'offline'

export interface FleetMarker {
  driverId: string
  name: string
  routeId: string
  band: Band
  kind: FleetMarkerKind
  position: LatLng
  fix: TruckFix
  staleness: Staleness
  pingAgeMin: number
  minutesUntilLimit: number
  /** Dark trucks are drawn hollow whatever their band: the fix is last known, not live. */
  dark: boolean
  /** The pill text; null for quiet trucks, which only get a hover tooltip. */
  label: string | null
}

export function markerKind(band: Band): FleetMarkerKind {
  if (band === 'act_now') return 'act_now'
  if (band === 'watch') return 'watch'
  if (band === 'offline') return 'offline'
  return 'quiet'
}

export function fleetMarkers(views: DriverView[], cardById: Map<string, DriverCard>, deliveryById: Map<string, Delivery>): FleetMarker[] {
  return views.flatMap((v) => {
    const card = cardById.get(v.driver.id)
    if (!card) return []
    const kind = markerKind(card.band)
    const fix = truckFixAt(v.route, v.truck, deliveryById, v.lastPingAt)
    const dark = v.staleness === 'offline'
    const label = kind === 'quiet' ? null
      : kind === 'offline' ? `${v.driver.name} · last seen ${fmtAge(v.pingAgeMin)}`
      : `${v.driver.name} · ${fmtCountdown(v.minutesUntilLimit, v.staleness !== 'fresh')}${dark ? ` · last seen ${fmtAge(v.pingAgeMin)}` : ''}`
    return [{ driverId: v.driver.id, name: v.driver.name, routeId: v.route.id, band: card.band, kind, position: fix.position, fix, staleness: v.staleness, pingAgeMin: v.pingAgeMin, minutesUntilLimit: v.minutesUntilLimit, dark, label }]
  })
}
