import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, Tooltip } from 'react-leaflet'
import type { Delivery, LatLng, Stop } from '../../../data/types'
import { truckFixAt, type TruckFix } from '../../../geo/truckPosition'
import { projectedEta } from '../../../hos/compute'
import { fmtAge, fmtClock } from '../../../lib/format'
import { completedStopLightWeight } from '../../../lib/routeTimeline'
import type { DriverView } from '../../../store/view'
import { FitOnce, FlyTo, Tiles, escapeHtml, toLatLng } from '../../map/leaflet'

// This file is a lazy chunk: Leaflet and its stylesheet load the first time someone opens
// the map, never on the board. Tiles, fitting, and flying live in views/map/leaflet.tsx,
// shared with the fleet map.
const FIT_MAX_ZOOM = 15
const FOCUS_ZOOM = 14

interface MapStop {
  stop: Stop
  position: LatLng
  customer: string
  t: number
  late: boolean
}

/** The same states the route rail paints, as marker classes (styles live in index.css). */
function stopClass(m: MapStop, pastLimitIds: Set<string>, nextId: string | undefined, selectedId: string | null): string {
  const { stop } = m
  const state = stop.status === 'failed' ? 'is-failed'
    : stop.status === 'done' ? 'is-done'
    : stop.status === 'unassigned' ? 'is-unassigned'
    : pastLimitIds.has(stop.id) || m.late ? 'is-risk'
    : 'is-pending'
  return `route-map-stop-dot ${state} ${stop.id === nextId ? 'is-next' : ''} ${stop.id === selectedId ? 'is-selected' : ''}`
}

function stopState(m: MapStop, pastLimitIds: Set<string>): string {
  const { stop } = m
  if (stop.status === 'done') return 'delivered'
  if (stop.status === 'failed') return 'failed'
  if (stop.status === 'unassigned') return 'needs a driver'
  if (stop.status === 'in_progress') return 'at the dock'
  if (pastLimitIds.has(stop.id)) return 'past the HOS limit'
  if (m.late) return 'late'
  return 'up next'
}

function stopIcon(m: MapStop, lightWeight: number, className: string): L.DivIcon {
  return L.divIcon({
    className: 'route-map-stop',
    html: `<span class="${className}" style="--route-history-light:${lightWeight}%">${escapeHtml(String(m.stop.seq))}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    tooltipAnchor: [0, -12],
  })
}

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
  const stops = useMemo<MapStop[]>(() => route.stops.flatMap((stop) => {
    const delivery = deliveryById.get(stop.deliveryId)
    if (!delivery) return []
    const t = stop.status === 'done' || stop.status === 'failed' ? (stop.departedAt ?? stop.plannedEta) : stop.status === 'in_progress' ? (stop.arrivedAt ?? now) : projectedEta(stop, view.driftMin)
    return [{ stop, position: delivery.position, customer: delivery.customer, t, late: stop.status === 'pending' && t > delivery.window.end }]
  }), [deliveryById, now, route.stops, view.driftMin])
  const lastCompleteIndex = stops.reduce((last, m, index) => (m.stop.status === 'done' || m.stop.status === 'failed' ? index : last), -1)
  const fix = useMemo(() => truckFixAt(route, view.truck, deliveryById, view.lastPingAt), [route, view.truck, deliveryById, view.lastPingAt])
  const nextId = view.next?.id
  const routed = stops.filter((m) => m.stop.status !== 'unassigned')
  const legs = routed.slice(1).map((m, i) => {
    const from = routed[i]
    const tone = m.stop.status === 'done' || m.stop.status === 'failed' ? 'route-map-leg-done' : pastLimitIds.has(m.stop.id) || m.late ? 'route-map-leg-risk' : 'route-map-leg-todo'
    return { id: m.stop.id, positions: [toLatLng(from.position), toLatLng(m.position)], tone }
  })
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
          {legs.map((leg) => <Polyline key={leg.id} positions={leg.positions} pathOptions={{ className: leg.tone, weight: 3 }} />)}
          {stops.map((m, index) => (
            <Marker
              key={m.stop.id}
              position={toLatLng(m.position)}
              icon={stopIcon(m, m.stop.status === 'done' ? completedStopLightWeight(index, lastCompleteIndex) : 50, stopClass(m, pastLimitIds, nextId, selectedStopId))}
              eventHandlers={{ click: () => onSelectStop(m.stop.id) }}
              zIndexOffset={m.stop.id === nextId ? 200 : m.stop.status === 'done' ? 0 : 100}
            >
              <Tooltip direction="top" offset={[0, -2]} className="route-map-tooltip">{`${m.stop.seq} · ${m.customer} · ${fmtClock(m.t)} · ${stopState(m, pastLimitIds)}`}</Tooltip>
            </Marker>
          ))}
          <Marker position={toLatLng(fix.position)} icon={truckIcon(view)} zIndexOffset={400} keyboard={false}>
            <Tooltip direction="top" offset={[0, -4]} permanent={stale} className="route-map-tooltip">{truckCaption(view, fix, stops)}</Tooltip>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}
