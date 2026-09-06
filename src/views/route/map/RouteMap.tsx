import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, Marker, Tooltip } from 'react-leaflet'
import type { Delivery } from '../../../data/types'
import { truckFixAt, type TruckFix } from '../../../geo/truckPosition'
import { fmtAge, fmtClock } from '../../../lib/format'
import type { DriverView } from '../../../store/view'
import { FitOnce, FlyTo, Tiles, toLatLng } from '../../map/leaflet'
import RouteOverlay, { routeStops, type MapStop } from '../../map/RouteOverlay'

// This file is a lazy chunk: Leaflet and its stylesheet load the first time someone opens
// the map, never on the board. The route itself is views/map/RouteOverlay.tsx, shared with
// the fleet map; tiles, fitting, and flying are views/map/leaflet.tsx.
const FIT_MAX_ZOOM = 15
const FOCUS_ZOOM = 14

function truckIcon(view: DriverView): L.DivIcon {
  const freshness = view.staleness === 'fresh' ? 'route-map-truck-live' : view.staleness === 'stale' ? 'route-map-truck-stale' : 'route-map-truck-offline'
  return L.divIcon({
    className: 'route-map-truck-icon',
    html: `<span class="route-map-truck ${freshness}"><span class="route-map-truck-halo"></span><span class="route-map-truck-dot"></span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -14],
  })
}

function truckCaption(view: DriverView, fix: TruckFix, stops: MapStop[]): string {
  const where = fix.kind === 'at_stop' ? `at stop ${stops.find((s) => s.stop.id === fix.stopId)?.stop.seq ?? ''}`
    : fix.kind === 'en_route' ? `heading to stop ${stops.find((s) => s.stop.id === fix.toStopId)?.stop.seq ?? ''}`
    : 'parked'
  if (view.staleness === 'fresh') return `${view.driver.name} · ${where} · live`
  return `${view.driver.name} · last known ${where} · ${fmtAge(view.pingAgeMin)}`
}

export default function RouteMap({ view, deliveryById, pastLimitIds, selectedStopId, onSelectStop }: { view: DriverView; deliveryById: Map<string, Delivery>; pastLimitIds: Set<string>; selectedStopId: string | null; onSelectStop: (id: string) => void }) {
  const { route, now } = view
  const stops = useMemo(() => routeStops(view, deliveryById), [view, deliveryById])
  const fix = useMemo(() => truckFixAt(route, view.truck, deliveryById, view.lastPingAt), [route, view.truck, deliveryById, view.lastPingAt])
  const points = [...stops.map((m) => toLatLng(m.position)), toLatLng(fix.position)]
  const selected = stops.find((m) => m.stop.id === selectedStopId)?.position
  const stale = view.staleness !== 'fresh'

  return (
    <div className="overflow-hidden rounded-card border border-line bg-panel shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-3 py-2 text-[10px] text-label">
        <span className="flex items-center gap-1.5"><span className="route-map-stop-dot is-done inline-flex h-3 w-3" style={{ '--route-history-light': '0%' } as React.CSSProperties} /> delivered</span>
        <span className="flex items-center gap-1.5"><span className="route-map-stop-dot is-pending inline-flex h-3 w-3" /> undelivered</span>
        <span className="flex items-center gap-1.5"><span className="route-map-stop-dot is-risk inline-flex h-3 w-3" /> late / HOS</span>
        <span className="flex items-center gap-1.5"><span className={`route-map-truck ${stale ? 'route-map-truck-stale' : 'route-map-truck-live'} inline-block h-4 w-4`}><span className="route-map-truck-dot" /></span> truck</span>
        <span className={`ml-auto tnum ${stale ? 'text-watch' : 'text-muted'}`}>{stale ? `Last known position · ${fmtAge(view.pingAgeMin)}` : `Live · ${fmtClock(now)}`}</span>
      </div>
      <div className="h-[min(38rem,calc(100vh-21rem))] min-h-[22rem]">
        <MapContainer center={toLatLng(fix.position)} zoom={12} zoomControl scrollWheelZoom className="h-full w-full" attributionControl>
          <Tiles />
          <FitOnce fitKey={route.id} points={points} maxZoom={FIT_MAX_ZOOM} />
          <FlyTo id={selectedStopId} position={selected} minZoom={FOCUS_ZOOM} />
          <RouteOverlay view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} selectedStopId={selectedStopId} onSelectStop={onSelectStop} />
          <Marker position={toLatLng(fix.position)} icon={truckIcon(view)} zIndexOffset={400} keyboard={false}>
            <Tooltip direction="top" offset={[0, -4]} permanent={stale} className="route-map-tooltip">{truckCaption(view, fix, stops)}</Tooltip>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}
