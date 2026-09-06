import L from 'leaflet'
import { useMemo } from 'react'
import { Marker, Polyline, Tooltip } from 'react-leaflet'
import type { Delivery, LatLng, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock } from '../../lib/format'
import { completedStopLightWeight } from '../../lib/routeTimeline'
import type { DriverView } from '../../store/view'
import { escapeHtml, toLatLng } from './leaflet'

// One driver's route on a map, in the route rail's own states: delivered stops in the
// completion gradient, undelivered outlined, late and past-limit stops in the act-now outline
// with their legs dashed red, unassigned dashed, the next stop larger. The route file's map and
// the fleet map both draw it, so a route looks the same wherever Lena meets it.

export interface MapStop {
  stop: Stop
  position: LatLng
  customer: string
  t: number
  late: boolean
}

export function routeStops(view: DriverView, deliveryById: Map<string, Delivery>): MapStop[] {
  const { route, now } = view
  return route.stops.flatMap((stop) => {
    const delivery = deliveryById.get(stop.deliveryId)
    if (!delivery) return []
    const t = stop.status === 'done' || stop.status === 'failed' ? (stop.departedAt ?? stop.plannedEta) : stop.status === 'in_progress' ? (stop.arrivedAt ?? now) : projectedEta(stop, view.driftMin)
    return [{ stop, position: delivery.position, customer: delivery.customer, t, late: stop.status === 'pending' && t > delivery.window.end }]
  })
}

/** Marker classes for the rail's states (styles live in index.css). */
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

export default function RouteOverlay({ view, deliveryById, pastLimitIds, selectedStopId = null, onSelectStop }: { view: DriverView; deliveryById: Map<string, Delivery>; pastLimitIds: Set<string>; selectedStopId?: string | null; onSelectStop?: (id: string) => void }) {
  const stops = useMemo(() => routeStops(view, deliveryById), [view, deliveryById])
  const lastCompleteIndex = stops.reduce((last, m, index) => (m.stop.status === 'done' || m.stop.status === 'failed' ? index : last), -1)
  const nextId = view.next?.id
  const routed = stops.filter((m) => m.stop.status !== 'unassigned')
  const legs = routed.slice(1).map((m, i) => {
    const from = routed[i]
    const tone = m.stop.status === 'done' || m.stop.status === 'failed' ? 'route-map-leg-done' : pastLimitIds.has(m.stop.id) || m.late ? 'route-map-leg-risk' : 'route-map-leg-todo'
    return { id: m.stop.id, positions: [toLatLng(from.position), toLatLng(m.position)], tone }
  })
  return (
    <>
      {legs.map((leg) => <Polyline key={leg.id} positions={leg.positions} pathOptions={{ className: leg.tone, weight: 3 }} />)}
      {stops.map((m, index) => (
        <Marker
          key={m.stop.id}
          position={toLatLng(m.position)}
          icon={stopIcon(m, m.stop.status === 'done' ? completedStopLightWeight(index, lastCompleteIndex) : 50, stopClass(m, pastLimitIds, nextId, selectedStopId))}
          eventHandlers={onSelectStop ? { click: () => onSelectStop(m.stop.id) } : undefined}
          keyboard={Boolean(onSelectStop)}
          zIndexOffset={m.stop.id === nextId ? 200 : m.stop.status === 'done' ? 0 : 100}
        >
          <Tooltip direction="top" offset={[0, -2]} className="route-map-tooltip">{`${m.stop.seq} · ${m.customer} · ${fmtClock(m.t)} · ${stopState(m, pastLimitIds)}`}</Tooltip>
        </Marker>
      ))}
    </>
  )
}
