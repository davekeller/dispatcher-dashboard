import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Tooltip } from 'react-leaflet'
import type { Delivery, Stop } from '../../data/types'
import { remainingPath, type FleetMarker } from '../../geo/fleet'
import type { DriverView } from '../../store/view'
import { FitOnce, FlyTo, Tiles, escapeHtml, toLatLng } from './leaflet'

// A lazy chunk, like the route file's map. Marker styles live in index.css under .fleet-marker.
const FIT_MAX_ZOOM = 13
const FOCUS_ZOOM = 13
const Z = { quiet: 0, watch: 100, act_now: 200, offline: 150 } as const

function truckIcon(m: FleetMarker, selected: boolean): L.DivIcon {
  const pill = m.label ? `<span class="fleet-marker-pill">${escapeHtml(m.label)}</span>` : ''
  return L.divIcon({
    className: 'fleet-marker-icon',
    html: `<span class="fleet-marker is-${m.kind}${m.dark ? ' is-dark' : ''}${selected ? ' is-selected' : ''}"><span class="fleet-marker-dot"></span>${pill}</span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    tooltipAnchor: [0, -8],
  })
}

function stopIcon(stop: Stop, risk: boolean): L.DivIcon {
  return L.divIcon({
    className: 'route-map-stop',
    html: `<span class="route-map-stop-dot ${risk ? 'is-risk' : 'is-pending'}">${escapeHtml(String(stop.seq))}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    tooltipAnchor: [0, -12],
  })
}

export default function FleetMap({ markers, selectedId, selectedView, deliveryById, pastLimitIds, fitKey, onSelect }: {
  markers: FleetMarker[]
  selectedId: string | null
  selectedView: DriverView | undefined
  deliveryById: Map<string, Delivery>
  pastLimitIds: Set<string>
  fitKey: number
  onSelect: (id: string) => void
}) {
  const path = selectedView ? remainingPath(selectedView, deliveryById) : null
  const selected = markers.find((m) => m.driverId === selectedId)
  return (
    <MapContainer center={[41.87, -87.7]} zoom={11} zoomControl scrollWheelZoom className="h-full w-full" attributionControl>
      <Tiles />
      <FitOnce fitKey={fitKey} points={markers.map((m) => toLatLng(m.position))} maxZoom={FIT_MAX_ZOOM} />
      <FlyTo id={selectedId} position={selected?.position} minZoom={FOCUS_ZOOM} flyOnMount />
      {path && path.points.length > 1 && (
        <Polyline positions={path.points.map(toLatLng)} pathOptions={{ className: pastLimitIds.size > 0 ? 'route-map-leg-risk' : 'route-map-leg-todo', weight: 3 }} />
      )}
      {path?.stops.map((stop) => (
        <Marker key={stop.id} position={toLatLng(deliveryById.get(stop.deliveryId)!.position)} icon={stopIcon(stop, pastLimitIds.has(stop.id))} zIndexOffset={50} keyboard={false}>
          <Tooltip direction="top" offset={[0, -2]} className="route-map-tooltip">{`${stop.seq} · ${deliveryById.get(stop.deliveryId)?.customer ?? ''}`}</Tooltip>
        </Marker>
      ))}
      {markers.map((m) => (
        <Marker
          key={m.driverId}
          position={toLatLng(m.position)}
          icon={truckIcon(m, m.driverId === selectedId)}
          zIndexOffset={m.driverId === selectedId ? 500 : Z[m.kind]}
          eventHandlers={{ click: () => onSelect(m.driverId) }}
        >
          {!m.label && <Tooltip direction="top" offset={[0, -2]} className="route-map-tooltip">{`${m.name} · ${m.routeId.toUpperCase()}`}</Tooltip>}
        </Marker>
      ))}
    </MapContainer>
  )
}
