import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Tooltip, ZoomControl } from 'react-leaflet'
import type { Delivery } from '../../data/types'
import type { FleetMarker } from '../../geo/fleet'
import type { DriverView } from '../../store/view'
import { FitOnce, Tiles, escapeHtml, toLatLng } from './leaflet'
import RouteOverlay, { routeStops } from './RouteOverlay'

// A lazy chunk, like the route file's map. Marker styles live in index.css under .fleet-marker.
const FLEET_MAX_ZOOM = 13
const ROUTE_MAX_ZOOM = 14
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

export default function FleetMap({ markers, selectedId, selectedView, deliveryById, pastLimitIds, fitKey, onSelect }: {
  markers: FleetMarker[]
  selectedId: string | null
  selectedView: DriverView | undefined
  deliveryById: Map<string, Delivery>
  pastLimitIds: Set<string>
  fitKey: number
  onSelect: (id: string) => void
}) {
  const selected = markers.find((m) => m.driverId === selectedId)
  // A picked driver's whole route frames the map; otherwise every visible truck does.
  const routePoints = selectedView ? routeStops(selectedView, deliveryById).map((m) => toLatLng(m.position)) : []
  const framing = selectedView && selectedId
    ? { key: `driver:${selectedId}`, points: [...routePoints, ...(selected ? [toLatLng(selected.position)] : [])], maxZoom: ROUTE_MAX_ZOOM }
    : { key: `fleet:${fitKey}`, points: markers.map((m) => toLatLng(m.position)), maxZoom: FLEET_MAX_ZOOM }
  return (
    <MapContainer center={[41.87, -87.7]} zoom={11} zoomControl={false} scrollWheelZoom className="h-full w-full" attributionControl>
      <Tiles />
      {/* Zoom sits bottom right, above the attribution, so the top corners stay free for the driver list and the selected card. */}
      <ZoomControl position="bottomright" />
      <FitOnce fitKey={framing.key} points={framing.points} maxZoom={framing.maxZoom} />
      {selectedView && <RouteOverlay view={selectedView} deliveryById={deliveryById} pastLimitIds={pastLimitIds} />}
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
